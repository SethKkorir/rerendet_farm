import cron from 'node-cron';
import Contact from '../models/Contact.js';
import AbandonedCheckout from '../models/AbandonedCheckout.js';
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import Order from '../models/Order.js';
import PaymentTransaction from '../models/PaymentTransaction.js';
import sendEmail from './sendEmail.js';
import { getFraudAlert } from './emailTemplates.js';
import { queryMpesaStkStatusService } from '../services/mpesaService.js';
import { getPayPalOrderService, capturePayPalOrderService } from '../services/paypalService.js';

// ── Config ────────────────────────────────────────────────────────────────────
const DELETE_AGE_DAYS = 7;
const FRAUD_WINDOW_HOURS = 72;    // Look at last 72 hours
const FRAUD_THRESHOLD = 3;     // 3+ failures = suspicious

// ── Contact Cleanup ───────────────────────────────────────────────────────────
const cleanupRepliedContacts = async () => {
    try {
        console.log('[Cron] Running automatic cleanup for replied contacts...');

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - DELETE_AGE_DAYS);

        const result = await Contact.deleteMany({
            status: 'replied',
            updatedAt: { $lt: cutoffDate }
        });

        if (result.deletedCount > 0) {
            console.log(`[Cron] Automatically deleted ${result.deletedCount} old replied contacts.`);
        } else {
            console.log('[Cron] No old replied contacts found to delete.');
        }

    } catch (error) {
        console.error('[Cron] Error during contact cleanup:', error);
    }
};

// ── Card Fraud Detection ──────────────────────────────────────────────────────
const checkCardFraud = async () => {
    try {
        console.log('[FraudCron] Scanning for repeated payment failures...');

        const since = new Date(Date.now() - FRAUD_WINDOW_HOURS * 60 * 60 * 1000);

        // Aggregate: group by user, count their failures in the window
        const suspects = await AbandonedCheckout.aggregate([
            {
                $match: {
                    status: 'abandoned',
                    createdAt: { $gte: since }
                }
            },
            {
                $group: {
                    _id: '$user',
                    failureCount: { $sum: 1 },
                    totalAttempted: { $sum: '$totalAmount' },
                    paymentMethods: { $addToSet: '$paymentMethod' },
                    lastAttempt: { $max: '$createdAt' }
                }
            },
            {
                $match: {
                    failureCount: { $gte: FRAUD_THRESHOLD }
                }
            },
            {
                $sort: { failureCount: -1 }
            }
        ]);

        if (!suspects.length) {
            console.log('[FraudCron] No suspicious payment patterns detected.');
            return;
        }

        console.warn(`[WARN] [FraudCron] ${suspects.length} user(s) flagged for suspicious payment failures!`);

        // Fetch super admin emails
        const superAdmins = await User.find({ role: 'super-admin' }).select('email firstName');
        const fallbackEmail = process.env.SUPER_ADMIN_EMAIL;

        if (!superAdmins.length && !fallbackEmail) {
            console.error('❌ [FraudCron] No super admin email found to send fraud alerts!');
            return;
        }

        const alertRecipients = superAdmins.length
            ? superAdmins.map(a => a.email)
            : [fallbackEmail];

        // Fetch logo
        let logoUrl;
        try {
            const settings = await Settings.getSettings();
            logoUrl = settings?.store?.logo;
        } catch (_) { }

        // For each suspect, send an alert
        for (const suspect of suspects) {
            try {
                // Get user info
                const user = await User.findById(suspect._id).select('firstName lastName email');
                if (!user) continue;

                // Send to all super admins
                for (const adminEmail of alertRecipients) {
                    await sendEmail({
                        to: adminEmail,
                        subject: `🕵️ Fraud Risk: ${user.firstName} ${user.lastName} — ${suspect.failureCount} payment failures`,
                        html: getFraudAlert({
                            userName: `${user.firstName} ${user.lastName}`,
                            userEmail: user.email,
                            userId: user._id.toString(),
                            failureCount: suspect.failureCount,
                            totalAttempted: suspect.totalAttempted,
                            paymentMethods: suspect.paymentMethods.filter(Boolean),
                            timeWindow: `${FRAUD_WINDOW_HOURS} hours`,
                            logoUrl
                        })
                    });

                    console.log(`📧 [FraudCron] Fraud alert sent for ${user.email} to ${adminEmail}`);
                }

            } catch (userErr) {
                console.error(`❌ [FraudCron] Error processing suspect ${suspect._id}:`, userErr.message);
            }
        }

    } catch (error) {
        console.error('❌ [FraudCron] Error during fraud check:', error);
    }
};

// ── Elite Payment Reconciliation Worker (Every 15 mins) ──────────────────────
export const reconcilePendingOrders = async () => {
    try {
        console.log('[ReconciliationWorker] Starting automated gateway audit for pending orders...');
        
        // Scan for transactions that are still PENDING and created in the last 24 hours
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const pendingTransactions = await PaymentTransaction.find({
            status: 'PENDING',
            createdAt: { $gte: since }
        });

        if (pendingTransactions.length === 0) {
            console.log('[ReconciliationWorker] Clean ledger: Zero pending transactions require verification.');
            return;
        }

        console.log(`[ReconciliationWorker] Auditing ${pendingTransactions.length} pending transactions...`);

        for (const tx of pendingTransactions) {
            const order = await Order.findById(tx.order);
            if (!order) {
                console.warn(`[ReconciliationWorker] Associated order missing for Tx: ${tx._id}`);
                continue;
            }

            // Skip if the order has already been marked paid elsewhere (e.g. manual override or late webhook)
            if (order.paymentStatus === 'paid') {
                tx.status = 'SUCCESS';
                await tx.save();
                console.log(`[ReconciliationWorker] Auto-aligned transaction ${tx._id} to SUCCESS since Order was already paid.`);
                continue;
            }

            // ── A. Process M-Pesa Reconciliation ───────────────────
            if (tx.provider === 'MPESA') {
                try {
                    console.log(`[ReconciliationWorker] Querying Daraja status for checkoutID: ${tx.transactionId}`);
                    const result = await queryMpesaStkStatusService(tx.transactionId);

                    if (result.ResultCode === '0' || result.ResultCode === 0) {
                        // Success! Parse metadata if present to fetch receipt, or use checkoutRequestId as fallback
                        let receiptNumber = tx.transactionId;
                        if (result.ResultDesc?.includes('Receipt:')) {
                            // Safaricom sandbox may append receipt number in desc
                            const parts = result.ResultDesc.split('Receipt:');
                            if (parts[1]) receiptNumber = parts[1].trim().split(' ')[0];
                        }

                        // Update ledger status and swap key with official receipt number
                        tx.status = 'SUCCESS';
                        tx.transactionId = receiptNumber;
                        tx.rawResponse = { ...tx.rawResponse, cronReconciled: true, gatewayQueryResult: result };
                        await tx.save();

                        // Mark Order paid
                        order.paymentStatus = 'paid';
                        order.orderStatus = 'open'; // Keep lifecycle open until fulfilled; status virtual = 'Confirmed'
                        order.transactionId = receiptNumber;
                        order.orderEvents.push({
                            status: 'PAYMENT_CONFIRMED',
                            note: `Reconciled PAID via M-Pesa automated background worker. Receipt: ${receiptNumber}`,
                            user: null
                        });
                        await order.save();
                        console.log(`🎉 [ReconciliationWorker] [M-Pesa] Order ${order.orderNumber} successfully recovered and marked PAID`);

                    } else if (['1032', '1037', '2001', '9002'].includes(result.ResultCode?.toString())) {
                        // Failed at gateway
                        tx.status = 'FAILED';
                        tx.rawResponse = { ...tx.rawResponse, cronReconciled: true, gatewayQueryResult: result };
                        await tx.save();

                        order.paymentStatus = 'failed';
                        order.orderEvents.push({
                            status: 'PAYMENT_FAILED',
                            note: `M-Pesa transaction expired or cancelled. Reason: ${result.ResultDesc}`,
                            user: null
                        });
                        await order.save();
                        console.log(`❌ [ReconciliationWorker] [M-Pesa] Order ${order.orderNumber} updated to FAILED`);
                    }
                } catch (mpesaErr) {
                    console.error(`[ReconciliationWorker] M-Pesa query failed for Order ${order.orderNumber}:`, mpesaErr.message);
                }
            }

            // ── B. Process PayPal Reconciliation ───────────────────
            else if (tx.provider === 'PAYPAL') {
                try {
                    console.log(`[ReconciliationWorker] Querying PayPal status for orderID: ${tx.transactionId}`);
                    const result = await getPayPalOrderService(tx.transactionId);

                    if (result.status === 'COMPLETED') {
                        tx.status = 'SUCCESS';
                        tx.rawResponse = { ...tx.rawResponse, cronReconciled: true, gatewayQueryResult: result };
                        await tx.save();

                        order.paymentStatus = 'paid';
                        order.orderStatus = 'open'; // Keep lifecycle open; status virtual = 'Confirmed'
                        order.orderEvents.push({
                            status: 'PAYMENT_CONFIRMED',
                            note: 'Reconciled PAID via PayPal automated background worker.',
                            user: null
                        });
                        await order.save();
                        console.log(`🎉 [ReconciliationWorker] [PayPal] Order ${order.orderNumber} recovered and marked PAID`);

                    } else if (result.status === 'APPROVED') {
                        // Approved but not captured yet! Let's complete the capture right now to secure the payment
                        console.log(`[ReconciliationWorker] [PayPal] Transaction is APPROVED but not captured. Sending capture query...`);
                        const captureResult = await capturePayPalOrderService(tx.transactionId);

                        if (captureResult.status === 'COMPLETED') {
                            tx.status = 'SUCCESS';
                            tx.rawResponse = { ...tx.rawResponse, cronReconciled: true, captureResult };
                            await tx.save();

                            order.paymentStatus = 'paid';
                            order.orderStatus = 'open'; // Keep lifecycle open; status virtual = 'Confirmed'
                            order.orderEvents.push({
                                status: 'PAYMENT_CONFIRMED',
                                note: 'PayPal Payment JIT Captured & Reconciled via automated background worker.',
                                user: null
                            });
                            await order.save();
                            console.log(`🎉 [ReconciliationWorker] [PayPal] JIT Capture success for Order ${order.orderNumber}`);
                        }
                    } else if (['VOIDED', 'EXPIRED'].includes(result.status)) {
                        tx.status = 'FAILED';
                        tx.rawResponse = { ...tx.rawResponse, cronReconciled: true, gatewayQueryResult: result };
                        await tx.save();

                        order.paymentStatus = 'failed';
                        order.orderEvents.push({
                            status: 'PAYMENT_FAILED',
                            note: `PayPal checkout session was ${result.status.toLowerCase()}.`,
                            user: null
                        });
                        await order.save();
                        console.log(`❌ [ReconciliationWorker] [PayPal] Order ${order.orderNumber} updated to FAILED`);
                    }
                } catch (paypalErr) {
                    console.error(`[ReconciliationWorker] PayPal check failed for Order ${order.orderNumber}:`, paypalErr.message);
                }
            }
        }

    } catch (error) {
        console.error('❌ [ReconciliationWorker] Error during pending payment reconciliation:', error);
    }
};

// ── Start All Cron Jobs ───────────────────────────────────────────────────────
export const startCronJobs = () => {
    console.log(`[Cron] System initialized. System cleanups and reconciliation scheduled.`);

    // 1. Contact cleanup — run once a day at midnight
    cron.schedule('0 0 * * *', cleanupRepliedContacts);
    setTimeout(cleanupRepliedContacts, 5_000); // Wait 5s for DB to be ready

    // 2. Card fraud detection — run every 12 hours
    cron.schedule('0 */12 * * *', checkCardFraud);
    setTimeout(checkCardFraud, 35_000); // 35s delay (after contact cleanup)

    // 3. Payment Reconciliation Worker — runs every 15 minutes
    cron.schedule('*/15 * * * *', reconcilePendingOrders);
    setTimeout(reconcilePendingOrders, 65_000); // 65s delay to allow system to fully warm up

    console.log('✅ [Cron] All node-cron jobs scheduled successfully: Contact Cleanup (Daily) • Fraud Detection (12h) • Payment Reconciliation (15m)');
};
