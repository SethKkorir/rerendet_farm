import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';
import PaymentTransaction from '../models/PaymentTransaction.js';
import Stripe from 'stripe';

// @desc    Handle MPESA STK Push Callback (Server-to-Server Webhook)
// @route   POST /api/webhooks/mpesa
// @access  Public
export const handleMpesaWebhook = asyncHandler(async (req, res) => {
    // ✅ SECURITY: Validate secret via header OR query parameter (Safaricom URL query param support)
    const webhookSecret = req.headers['x-webhook-secret'] || req.query.secret;
    const configSecret = process.env.WEBHOOK_SECRET || 'rerendet_secure_webhook_2026_key_99';

    if (webhookSecret !== configSecret) {
        console.error('🚫 [Webhook] Unauthorized MPESA attempt - Invalid Webhook Secret Token');
        return res.status(401).json({ success: false, message: 'Unauthorized Webhook Access' });
    }

    console.log('📨 [Webhook] Received Secure M-Pesa Callback payload from Safaricom');

    const { Body } = req.body;
    if (!Body || !Body.stkCallback) {
        console.error('❌ [Webhook] Invalid M-Pesa Callback Payload format');
        return res.status(400).send('Invalid Payload Structure');
    }

    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = Body.stkCallback;

    console.log(`📡 [Webhook] Processing CheckoutRequestID: ${CheckoutRequestID} | ResultCode: ${ResultCode}`);

    // Find the associated transaction in our database
    let tx = await PaymentTransaction.findOne({ transactionId: CheckoutRequestID, provider: 'MPESA' });
    let order = null;

    if (tx) {
        order = await Order.findById(tx.order);
    } else {
        // Fallback: search Order by transactionId directly
        order = await Order.findOne({ transactionId: CheckoutRequestID });
    }

    // Initialize/Update transaction details
    const finalTxStatus = ResultCode === 0 ? 'SUCCESS' : 'FAILED';
    let finalTxReceipt = CheckoutRequestID; // default fallback
    let amount = 0;

    // Parse Metadata parameters if payment succeeded
    if (ResultCode === 0 && CallbackMetadata && Array.isArray(CallbackMetadata.Item)) {
        const items = CallbackMetadata.Item;
        const amountItem = items.find(i => i.Name === 'Amount');
        const receiptItem = items.find(i => i.Name === 'MpesaReceiptNumber');

        amount = amountItem ? amountItem.Value : (order ? order.total : 0);
        finalTxReceipt = receiptItem ? receiptItem.Value : CheckoutRequestID;
    }

    // 1. Update or create the PaymentTransaction Ledger entry (Idempotency Audit Trail)
    if (tx) {
        tx.status = finalTxStatus;
        // Keep the original checkout ID in metadata, but update primary transactionId to Safaricom's official Receipt Number
        if (ResultCode === 0 && finalTxReceipt !== CheckoutRequestID) {
            tx.metadata = { ...tx.metadata, checkoutRequestId: CheckoutRequestID, resultDesc: ResultDesc };
            tx.transactionId = finalTxReceipt; // Official MPESA Receipt Number (e.g. NLK98FD12S)
        } else {
            tx.metadata = { ...tx.metadata, resultDesc: ResultDesc };
        }
        tx.amount = amount || tx.amount;
        tx.rawResponse = req.body;
        await tx.save();
        console.log(`📝 [Webhook] Updated existing transaction record ${tx._id} to ${finalTxStatus}`);
    } else {
        // Create new ledger entry if none existed yet (e.g. out-of-sync flow)
        tx = await PaymentTransaction.create({
            order: order ? order._id : null,
            provider: 'MPESA',
            transactionId: ResultCode === 0 ? finalTxReceipt : CheckoutRequestID,
            amount: amount || (order ? order.total : 0),
            currency: 'KES',
            status: finalTxStatus,
            rawResponse: req.body,
            metadata: { checkoutRequestId: CheckoutRequestID, resultDesc: ResultDesc }
        });
        console.log(`📝 [Webhook] Created fresh transaction record ${tx._id} with status ${finalTxStatus}`);
    }

    // 2. Process Order state updates
    if (order) {
        if (ResultCode === 0) {
            if (order.paymentStatus !== 'paid') {
                order.paymentStatus = 'paid';
                order.status = 'confirmed';
                order.transactionId = finalTxReceipt; // Update with actual receipt number
                order.orderEvents.push({
                    status: 'PAYMENT_CONFIRMED',
                    note: `M-Pesa STK payment confirmed. Receipt: ${finalTxReceipt}. Amount: KES ${amount}`,
                    user: null
                });
                await order.save();
                console.log(`💰 [Webhook] Order ${order.orderNumber} successfully marked as PAID`);
            } else {
                console.log(`ℹ️ [Webhook] Order ${order.orderNumber} already marked as PAID, ignoring duplicate webhook`);
            }
        } else {
            // STK failure (cancelled by user or transaction error)
            if (order.paymentStatus !== 'failed' && order.paymentStatus !== 'paid') {
                order.paymentStatus = 'failed';
                order.orderEvents.push({
                    status: 'PAYMENT_FAILED',
                    note: `M-Pesa payment failed: ${ResultDesc} (Code: ${ResultCode})`,
                    user: null
                });
                await order.save();
                console.log(`❌ [Webhook] Order ${order.orderNumber} marked as FAILED`);
            }
        }
    } else {
        console.warn(`⚠️ [Webhook] No matching Order found in system for CheckoutID: ${CheckoutRequestID}`);
    }

    // Safaricom Daraja expects a strict 200 OK containing JSON acknowledging the callback receipt
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Callback received and processed successfully' });
});

// @desc    Handle Stripe Webhook
// @route   POST /api/webhooks/stripe
// @access  Public
export const handleStripeWebhook = asyncHandler(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig) {
        console.error('🚫 [Webhook] Stripe signature header missing');
        return res.status(400).send('Webhook Error: Stripe signature header missing');
    }

    if (!endpointSecret) {
        console.error('🚫 [Webhook] STRIPE_WEBHOOK_SECRET is not configured');
        return res.status(500).send('Server Configuration Error - Webhook Secret missing');
    }

    let event;
    try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        // req.body is the raw Buffer since we routed it through express.raw
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error(`🚫 [Webhook] Stripe signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`📨 [Webhook] Cryptographically Verified Stripe Event: ${event?.type}`);

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const orderId = session.client_reference_id;

        console.log(`💰 [Webhook] Stripe Session Completed: ${orderId}`);

        if (orderId) {
            const order = await Order.findById(orderId);
            if (order && order.paymentStatus !== 'paid') {
                order.paymentStatus = 'paid';
                order.status = 'confirmed';
                order.transactionId = session.payment_intent;
                await order.save();

                // Log transaction in Ledger
                await PaymentTransaction.create({
                    order: order._id,
                    provider: 'STRIPE',
                    transactionId: session.payment_intent,
                    amount: session.amount_total / 100,
                    currency: 'KES',
                    status: 'SUCCESS',
                    rawResponse: session
                });
                console.log(`✅ [Webhook] Stripe payment processed successfully for Order ${order.orderNumber}`);
            }
        }
    }

    res.json({ received: true });
});
