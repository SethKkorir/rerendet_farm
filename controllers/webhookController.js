import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import PaymentTransaction from '../models/PaymentTransaction.js';
import Stripe from 'stripe';
import { logPaymentEvent } from '../services/paymentAuditService.js';
import { emailQueue } from '../queues/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// CORE WEBHOOK PROCESSING LOGIC — extracted as a pure function so:
//   1. The HTTP handler can call it and gracefully route exceptions to the DLQ.
//   2. The DLQ worker can re-invoke it directly without going through HTTP.
//
// @param {Object} body         - The raw parsed JSON body from Safaricom
// @param {string} sourceIp     - Caller IP for audit logging
// @returns {Object}            - { resultCode, resultDesc } for the HTTP response
// ─────────────────────────────────────────────────────────────────────────────
export const processWebhookPayload = async (body, sourceIp = 'unknown') => {
  const startTime = Date.now();

  const { Body } = body;
  if (!Body || !Body.stkCallback) {
    throw new Error('Invalid M-Pesa Callback Payload: missing Body.stkCallback');
  }

  const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } =
    Body.stkCallback;

  console.log(
    `📡 [Webhook] Processing CheckoutRequestID: ${CheckoutRequestID} | ResultCode: ${ResultCode}`
  );

  // ── Log raw callback receipt ───────────────────────────────────────────────
  logPaymentEvent({
    event: 'CALLBACK_RECEIVED',
    checkoutRequestId: CheckoutRequestID,
    provider: 'MPESA',
    resultCode: ResultCode,
    resultDesc: ResultDesc,
    sourceIp,
    metadata: { merchantRequestId: MerchantRequestID }
  });

  // ── PILLAR 2: Atomic Idempotency Gate ─────────────────────────────────────
  // Use findOneAndUpdate with upsert to atomically claim this CheckoutRequestID.
  // If a record already exists and is in a terminal state (SUCCESS or FAILED),
  // we return immediately — this callback is a duplicate.
  //
  // The PROCESSING status acts as an optimistic lock: the first request that
  // wins the upsert sets PROCESSING, all subsequent ones see it already exists
  // and either bail (terminal) or detect an in-flight duplicate (PROCESSING).
  let existingTx;
  try {
    existingTx = await PaymentTransaction.findOneAndUpdate(
      {
        idempotencyKey: CheckoutRequestID,
        provider: 'MPESA'
      },
      {
        $setOnInsert: {
          idempotencyKey: CheckoutRequestID,
          transactionId: CheckoutRequestID, // Will be updated to receipt number on success
          provider: 'MPESA',
          status: 'PROCESSING',
          amount: 0,
          currency: 'KES',
          rawResponse: body
        }
      },
      {
        upsert: true,
        new: false, // Return the ORIGINAL document (null if this was an insert)
        setDefaultsOnInsert: true
      }
    );
  } catch (upsertErr) {
    // E11000 duplicate key = another request already inserted — treat as duplicate
    if (upsertErr.code === 11000) {
      console.log(
        `🔒 [Webhook] Idempotency: CheckoutID ${CheckoutRequestID} already processing — duplicate callback ignored`
      );
      logPaymentEvent({
        event: 'IDEMPOTENCY_HIT',
        checkoutRequestId: CheckoutRequestID,
        provider: 'MPESA',
        sourceIp,
        metadata: { reason: 'duplicate_key_on_upsert' }
      });
      return { ResultCode: 0, ResultDesc: 'Callback already processed (idempotency)' };
    }
    throw upsertErr;
  }

  // If existingTx is non-null, a record was found (not inserted)
  if (existingTx) {
    if (existingTx.status === 'SUCCESS' || existingTx.status === 'FAILED') {
      console.log(
        `🔒 [Webhook] Idempotency: CheckoutID ${CheckoutRequestID} already terminal (${existingTx.status}) — duplicate callback ignored`
      );
      logPaymentEvent({
        event: 'IDEMPOTENCY_HIT',
        checkoutRequestId: CheckoutRequestID,
        provider: 'MPESA',
        sourceIp,
        metadata: { existingStatus: existingTx.status }
      });
      return { ResultCode: 0, ResultDesc: 'Callback already processed (idempotency)' };
    }
    // Status is PROCESSING or PENDING — continue to update it
    console.log(
      `ℹ️ [Webhook] Found existing PENDING/PROCESSING tx for ${CheckoutRequestID}, continuing update`
    );
  }

  // ── Parse Metadata ─────────────────────────────────────────────────────────
  const finalTxStatus = ResultCode === 0 ? 'SUCCESS' : 'FAILED';
  let finalTxReceipt = CheckoutRequestID;
  let amount = 0;

  if (ResultCode === 0 && CallbackMetadata && Array.isArray(CallbackMetadata.Item)) {
    const items = CallbackMetadata.Item;
    const amountItem = items.find((i) => i.Name === 'Amount');
    const receiptItem = items.find((i) => i.Name === 'MpesaReceiptNumber');
    amount = amountItem ? amountItem.Value : 0;
    finalTxReceipt = receiptItem ? receiptItem.Value : CheckoutRequestID;
  }

  // ── PILLAR 2: Session Transaction — atomic Order + PaymentTransaction writes ──
  const session = await mongoose.startSession();
  let order = null;

  try {
    await session.withTransaction(async () => {
      // 1. Update the PaymentTransaction to terminal state
      await PaymentTransaction.findOneAndUpdate(
        { idempotencyKey: CheckoutRequestID, provider: 'MPESA' },
        {
          $set: {
            transactionId: finalTxStatus === 'SUCCESS' ? finalTxReceipt : CheckoutRequestID,
            status: finalTxStatus,
            amount: amount,
            processedAt: new Date(),
            rawResponse: body,
            metadata: {
              checkoutRequestId: CheckoutRequestID,
              merchantRequestId: MerchantRequestID,
              resultDesc: ResultDesc
            }
          }
        },
        { session }
      );

      // 2. Find the order (by transactionId or via the tx's order ref)
      const txRef = await PaymentTransaction.findOne(
        { idempotencyKey: CheckoutRequestID, provider: 'MPESA' },
        { order: 1 },
        { session }
      );

      if (txRef?.order) {
        order = await Order.findById(txRef.order).session(session);
      }

      if (!order) {
        // Fallback: search order by transactionId
        order = await Order.findOne({ transactionId: CheckoutRequestID }).session(session);
      }

      if (!order) {
        console.warn(
          `⚠️ [Webhook] No matching Order found for CheckoutID: ${CheckoutRequestID}`
        );
        return; // Exit transaction — tx record is still updated
      }

      // 3. Update Order status (idempotent — only mutate if not already in terminal state)
      if (ResultCode === 0) {
        if (order.paymentStatus !== 'paid') {
          order.paymentStatus = 'paid';
          order.transactionId = finalTxReceipt;
          order.orderEvents.push({
            status: 'PAYMENT_CONFIRMED',
            note: `M-Pesa STK payment confirmed. Receipt: ${finalTxReceipt}. Amount: KES ${amount}`,
            user: null
          });
          await order.save({ session });
          console.log(`💰 [Webhook] Order ${order.orderNumber} successfully marked as PAID`);
        } else {
          console.log(
            `ℹ️ [Webhook] Order ${order.orderNumber} already PAID — no duplicate mutation`
          );
        }
      } else {
        // STK failure
        if (order.paymentStatus !== 'failed' && order.paymentStatus !== 'paid') {
          order.paymentStatus = 'failed';
          order.orderEvents.push({
            status: 'PAYMENT_FAILED',
            note: `M-Pesa payment failed: ${ResultDesc} (Code: ${ResultCode})`,
            user: null
          });
          await order.save({ session });
          console.log(`❌ [Webhook] Order ${order.orderNumber} marked as FAILED`);
        }
      }
    });
  } finally {
    session.endSession();
  }

  // ── PILLAR 6: Enqueue confirmation email (decoupled, non-blocking) ─────────
  if (ResultCode === 0 && order && order.paymentStatus === 'paid') {
    try {
      await emailQueue.add('orderConfirmation', {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        email: order.shippingAddress?.email || null
      });
      logPaymentEvent({
        event: 'EMAIL_DISPATCHED',
        checkoutRequestId: CheckoutRequestID,
        orderId: order._id,
        orderNumber: order.orderNumber,
        provider: 'MPESA',
        metadata: { queue: 'emailQueue', jobName: 'orderConfirmation' }
      });
    } catch (queueErr) {
      // Non-fatal — email queue failure should not fail the webhook response
      console.error(
        `⚠️ [Webhook] Failed to enqueue confirmation email for Order ${order?.orderNumber}:`,
        queueErr.message
      );
    }
  }

  // ── Audit log final outcome ────────────────────────────────────────────────
  const processingDurationMs = Date.now() - startTime;
  logPaymentEvent({
    event: ResultCode === 0 ? 'ORDER_PAID' : 'ORDER_FAILED',
    checkoutRequestId: CheckoutRequestID,
    mpesaReceiptNumber: finalTxStatus === 'SUCCESS' ? finalTxReceipt : null,
    orderId: order?._id || null,
    orderNumber: order?.orderNumber || null,
    amount,
    provider: 'MPESA',
    resultCode: ResultCode,
    resultDesc: ResultDesc,
    sourceIp,
    processingDurationMs
  });

  return { ResultCode: 0, ResultDesc: 'Callback received and processed successfully' };
};


// @desc    Handle MPESA STK Push Callback (Server-to-Server Webhook)
// @route   POST /api/webhooks/mpesa
// @access  Public — guarded by rate limiter + Safaricom IP allowlist
export const handleMpesaWebhook = asyncHandler(async (req, res) => {
  // ── Shared-secret validation ───────────────────────────────────────────────
  const webhookSecret = req.headers['x-webhook-secret'] || req.query.secret;
  const configSecret = process.env.WEBHOOK_SECRET || 'rerendet_secure_webhook_2026_key_99';

  if (webhookSecret !== configSecret) {
    console.error('🚫 [Webhook] Unauthorized MPESA attempt - Invalid Webhook Secret Token');
    return res.status(401).json({ success: false, message: 'Unauthorized Webhook Access' });
  }

  console.log('📨 [Webhook] Received Secure M-Pesa Callback payload from Safaricom');

  // ── Extract source IP for audit logging ───────────────────────────────────
  const sourceIp = req.headers['x-forwarded-for']
    ? req.headers['x-forwarded-for'].split(',')[0].trim()
    : req.ip || req.socket?.remoteAddress || 'unknown';

  // ── PILLAR 3: DLQ routing on exception ────────────────────────────────────
  // We return 200 to Safaricom regardless of processing outcome so Safaricom
  // does not retry. Retries are handled internally by the DLQ worker.
  try {
    const result = await processWebhookPayload(req.body, sourceIp);
    return res.status(200).json(result);
  } catch (err) {
    console.error('❌ [Webhook] Processing failed — routing to Dead Letter Queue:', err.message);

    // Fire-and-forget: enqueue to DLQ, don't await (so we respond to Safaricom immediately)
    import('../queues/index.js').then(({ callbackDLQ }) => {
      if (callbackDLQ) {
        callbackDLQ
          .add('failedCallback', {
            body: req.body,
            sourceIp,
            error: err.message,
            failedAt: new Date().toISOString()
          })
          .then(() => {
            console.log('📬 [Webhook] Failed callback enqueued to DLQ for reprocessing');
            logPaymentEvent({
              event: 'DLQ_ENQUEUED',
              checkoutRequestId: req.body?.Body?.stkCallback?.CheckoutRequestID || null,
              provider: 'MPESA',
              sourceIp,
              error: err.message
            });
          })
          .catch((dlqErr) =>
            console.error('❌ [Webhook] CRITICAL: DLQ enqueue also failed:', dlqErr.message)
          );
      }
    }).catch((importErr) => {
      console.error('❌ [Webhook] Could not import callbackDLQ:', importErr.message);
    });

    // Always return 200 to Safaricom — DLQ handles internal retries
    return res.status(200).json({
      ResultCode: 0,
      ResultDesc: 'Callback acknowledged — queued for processing'
    });
  }
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
        order.transactionId = session.payment_intent;
        await order.save();

        // Log transaction in Ledger
        await PaymentTransaction.create({
          order: order._id,
          provider: 'STRIPE',
          transactionId: session.payment_intent,
          idempotencyKey: session.payment_intent,
          amount: session.amount_total / 100,
          currency: 'KES',
          status: 'SUCCESS',
          processedAt: new Date(),
          rawResponse: session
        });

        // PILLAR 6: Queue confirmation email
        emailQueue.add('orderConfirmation', {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber
        }).catch((err) => console.error('⚠️ [Webhook] Stripe email enqueue failed:', err.message));

        console.log(
          `✅ [Webhook] Stripe payment processed successfully for Order ${order.orderNumber}`
        );
      }
    }
  }

  res.json({ received: true });
});
