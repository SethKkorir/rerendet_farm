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
import { runPaymentReconciliation } from '../scripts/reconcilePayments.js';

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

// ── Elite Payment Reconciliation Worker (Delegated to hardened reconcilePayments.js) ─────────
// The full implementation lives in scripts/reconcilePayments.js (Pillar 4).
// This wrapper preserves the existing export name for backward compatibility.
export const reconcilePendingOrders = async () => {
    try {
        await runPaymentReconciliation();
    } catch (error) {
        console.error('❌ [ReconciliationWorker] Unhandled error in reconciliation run:', error.message);
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

    // 3. Payment Reconciliation Worker — runs every 5 minutes (Pillar 4)
    //    Scans orders stuck in paymentStatus:'pending' for >15 min and resolves via Daraja API.
    cron.schedule('*/5 * * * *', reconcilePendingOrders);
    setTimeout(reconcilePendingOrders, 65_000); // 65s delay to allow system to fully warm up

    // GAP 1: SLA Breach scanner running every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
        try {
            console.log('[Cron] Scanning for SLA breaches (orders stuck > 2 hours in confirmed)...');
            const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
            
            // Query unfulfilled confirmed orders older than 2 hours
            const SLAOrders = await Order.find({
                fulfillmentStatus: 'unfulfilled',
                createdAt: { $lt: twoHoursAgo }
            });

            const { createAlert } = await import('../models/AdminAlert.js');

            for (const order of SLAOrders) {
                const AdminAlert = (await import('../models/AdminAlert.js')).default;
                const existingAlert = await AdminAlert.findOne({
                    category: 'sla_breach',
                    orderId: order._id,
                    isResolved: false
                });

                if (!existingAlert) {
                    await createAlert(
                        'warning',
                        'sla_breach',
                        `SLA Breach: Order #${order.orderNumber} placed at ${order.createdAt} is still unfulfilled.`,
                        { orderId: order._id }
                    );
                    console.log(`[Cron] SLA Breach alert created for Order #${order.orderNumber}`);
                }
            }
        } catch (err) {
            console.error('[Cron] SLA Breach scanner error:', err.message);
        }
    });

    // GAP 1: Low stock scanner running every 30 minutes
    cron.schedule('*/30 * * * *', async () => {
        try {
            console.log('[Cron] Running Low Stock scanner...');
            const Product = (await import('../models/Product.js')).default;
            const lowStockProducts = await Product.find({
                isActive: true,
                $expr: {
                  $lte: [
                    { $subtract: ["$inventory.physicalStock", "$inventory.reservedStock"] },
                    "$inventory.lowStockThreshold"
                  ]
                }
            });

            const { createAlert } = await import('../models/AdminAlert.js');

            for (const prod of lowStockProducts) {
                const AdminAlert = (await import('../models/AdminAlert.js')).default;
                const existingAlert = await AdminAlert.findOne({
                    category: 'low_stock',
                    productId: prod._id,
                    isResolved: false
                });

                if (!existingAlert) {
                    await createAlert(
                        'warning',
                        'low_stock',
                        `Low Stock Alert: Product ${prod.name} has dropped below threshold. Available: ${prod.inventory.physicalStock - prod.inventory.reservedStock}`,
                        { productId: prod._id }
                    );
                    console.log(`[Cron] Low Stock alert created for Product ${prod.name}`);
                }
            }
        } catch (err) {
            console.error('[Cron] Low stock scanner error:', err.message);
        }
    });

    // GAP 3: Audit log anomaly detection running every 60 minutes
    cron.schedule('0 * * * *', async () => {
        try {
            console.log('[Cron] Running audit log anomaly detection scans...');
            const { createAlert } = await import('../models/AdminAlert.js');
            const ActivityLog = (await import('../models/ActivityLog.js')).default;
            const User = (await import('../models/User.js')).default;

            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

            // Anomaly 1: >10 payment overrides in 24 hours
            const overrideStats = await ActivityLog.aggregate([
                {
                    $match: {
                        action: 'MANUAL_PAYMENT_OVERRIDE',
                        createdAt: { $gte: twentyFourHoursAgo }
                    }
                },
                {
                    $group: {
                        _id: '$admin',
                        count: { $sum: 1 }
                    }
                },
                {
                    $match: {
                        count: { $gt: 10 }
                    }
                }
            ]);

            for (const stat of overrideStats) {
                if (stat._id) {
                    const adminUser = await User.findById(stat._id);
                    if (adminUser) {
                        await createAlert(
                            'critical',
                            'failed_payment',
                            `Anomaly: Admin ${adminUser.firstName} ${adminUser.lastName} (${adminUser.email}) has performed ${stat.count} payment overrides in the last 24 hours.`
                        );
                    }
                }
            }

            // Anomaly 2: 3 or more manual payment overrides without receipt in 60 minutes
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            const overrideNoReceiptStats = await ActivityLog.aggregate([
                {
                    $match: {
                        action: 'MANUAL_PAYMENT_OVERRIDE',
                        createdAt: { $gte: oneHourAgo },
                        'details.receiptProvided': false
                    }
                },
                {
                    $group: {
                        _id: '$admin',
                        count: { $sum: 1 }
                    }
                },
                {
                    $match: {
                        count: { $gte: 3 }
                    }
                }
            ]);

            for (const stat of overrideNoReceiptStats) {
                if (stat._id) {
                    const adminUser = await User.findById(stat._id);
                    if (adminUser) {
                        await createAlert(
                            'critical',
                            'failed_payment',
                            `Anomaly: Admin ${adminUser.firstName} ${adminUser.lastName} (${adminUser.email}) marked ${stat.count} orders paid without M-Pesa receipt in 60 minutes.`
                        );
                    }
                }
            }
        } catch (err) {
            console.error('[Cron] Anomaly detection scanner error:', err.message);
        }
    });

    console.log('✅ [Cron] All node-cron jobs scheduled: Contact Cleanup (Daily) • Fraud Detection (12h) • Payment Reconciliation (5m) • SLA Breach (15m) • Low Stock (30m) • Audit Anomaly (60m)');
};
