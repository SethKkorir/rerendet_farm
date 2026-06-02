// scripts/reconcilePayments.js
/**
 * Payment Reconciliation Job — Pillar 4
 *
 * Runs on a scheduled cron (every 5 minutes via server.js).
 * Finds all orders stuck in paymentStatus: 'pending' for more than 15 minutes
 * and resolves them by querying Safaricom's stkpushquery API.
 *
 * This covers the failure mode where:
 *   - Safaricom's callback was never delivered (network drop)
 *   - The customer closed the browser before our JIT polling ran
 *   - The DLQ exhausted all retries without resolving the order
 *
 * Each outcome is written to PaymentAuditLog for financial reporting.
 * Confirmation emails are enqueued to emailQueue (not sent inline).
 */

import mongoose from 'mongoose';
import Order from '../models/Order.js';
import PaymentTransaction from '../models/PaymentTransaction.js';
import { queryMpesaStkStatusService } from '../services/mpesaService.js';
import { logPaymentEvent } from '../services/paymentAuditService.js';
import { emailQueue } from '../queues/index.js';

// Orders stuck pending for more than this threshold are eligible for reconciliation
const PENDING_THRESHOLD_MINUTES = 15;

// Process at most this many orders per run to prevent memory/timeout spikes
const MAX_ORDERS_PER_RUN = 50;

// Safaricom result codes that represent definitive failure (not transient)
const MPESA_FAILURE_CODES = new Set(['1032', '1037', '2001', '9002']);

/**
 * runPaymentReconciliation
 *
 * The main exported function. Called by the cron scheduler in server.js.
 * Designed to be idempotent — safe to call multiple times concurrently
 * (each order is updated atomically).
 */
export const runPaymentReconciliation = async () => {
  const startTime = Date.now();
  const thresholdDate = new Date(Date.now() - PENDING_THRESHOLD_MINUTES * 60 * 1000);

  console.log(
    `🔄 [Reconciler] Starting payment reconciliation run at ${new Date().toISOString()}`
  );
  console.log(
    `   Scanning orders pending > ${PENDING_THRESHOLD_MINUTES} minutes (before ${thresholdDate.toISOString()})`
  );

  let eligibleOrders;
  try {
    eligibleOrders = await Order.find({
      paymentStatus: 'pending',
      paymentMethod: { $regex: /mpesa/i }, // Only M-Pesa orders need Daraja reconciliation
      createdAt: { $lt: thresholdDate },
      transactionId: { $exists: true, $ne: null, $ne: '' } // Must have a CheckoutRequestID
    })
      .select('_id orderNumber transactionId paymentStatus paymentMethod createdAt shippingAddress user')
      .limit(MAX_ORDERS_PER_RUN)
      .lean();
  } catch (dbErr) {
    console.error('❌ [Reconciler] Failed to query eligible orders:', dbErr.message);
    return;
  }

  if (!eligibleOrders || eligibleOrders.length === 0) {
    console.log('✅ [Reconciler] No stale pending M-Pesa orders found. Run complete.');
    return;
  }

  console.log(
    `📋 [Reconciler] Found ${eligibleOrders.length} stale pending order(s) to reconcile`
  );

  let resolved = 0;
  let failed = 0;
  let skipped = 0;

  for (const orderSnap of eligibleOrders) {
    const { _id: orderId, orderNumber, transactionId: checkoutRequestId } = orderSnap;

    try {
      console.log(
        `   🔍 Querying Safaricom for Order #${orderNumber} | CheckoutID: ${checkoutRequestId}`
      );

      // ── Query Safaricom Daraja ─────────────────────────────────────────────
      let queryResult;
      try {
        queryResult = await queryMpesaStkStatusService(checkoutRequestId);
      } catch (queryErr) {
        console.warn(
          `   ⚠️ [Reconciler] Daraja query failed for Order #${orderNumber}: ${queryErr.message}`
        );
        logPaymentEvent({
          event: 'RECONCILIATION_QUERY_FAILED',
          checkoutRequestId,
          orderId,
          orderNumber,
          provider: 'MPESA',
          error: queryErr.message,
          metadata: { reconcilerRun: new Date().toISOString() }
        });
        skipped++;
        continue;
      }

      const resultCode = queryResult.ResultCode?.toString();
      const resultDesc = queryResult.ResultDesc || '';

      // ── Open a Mongoose session for atomic writes ──────────────────────────
      const session = await mongoose.startSession();

      try {
        await session.withTransaction(async () => {
          // Re-fetch the order inside the transaction to get the latest state
          const order = await Order.findById(orderId).session(session);

          if (!order || order.paymentStatus !== 'pending') {
            // Race condition: order was resolved by a concurrent webhook — skip
            console.log(
              `   ℹ️ [Reconciler] Order #${orderNumber} already resolved (${order?.paymentStatus || 'not found'}) — skipping`
            );
            skipped++;
            return;
          }

          if (resultCode === '0') {
            // ── Payment confirmed by Safaricom ───────────────────────────────
            const receiptItem = queryResult.CallbackMetadata?.Item?.find(
              (i) => i.Name === 'MpesaReceiptNumber'
            );
            const amountItem = queryResult.CallbackMetadata?.Item?.find(
              (i) => i.Name === 'Amount'
            );
            const mpesaReceipt = receiptItem?.Value || checkoutRequestId;
            const amount = amountItem?.Value || 0;

            order.paymentStatus = 'paid';
            order.transactionId = mpesaReceipt;
            order.orderEvents.push({
              status: 'PAYMENT_CONFIRMED',
              note: `M-Pesa payment reconciled by scheduled job. Receipt: ${mpesaReceipt}. Amount: KES ${amount}`,
              user: null
            });
            await order.save({ session });

            // Update or create the PaymentTransaction record
            await PaymentTransaction.findOneAndUpdate(
              { idempotencyKey: checkoutRequestId, provider: 'MPESA' },
              {
                $set: {
                  transactionId: mpesaReceipt,
                  status: 'SUCCESS',
                  amount,
                  processedAt: new Date(),
                  metadata: {
                    checkoutRequestId,
                    resultDesc,
                    resolvedBy: 'reconciler'
                  }
                }
              },
              { upsert: true, session }
            );

            console.log(
              `   ✅ [Reconciler] Order #${orderNumber} resolved → PAID (Receipt: ${mpesaReceipt})`
            );
            resolved++;

            // Enqueue confirmation email (Pillar 6 — decoupled, non-blocking)
            emailQueue
              .add('orderConfirmation', {
                orderId: order._id.toString(),
                orderNumber: order.orderNumber
              })
              .catch((err) =>
                console.error(
                  `   ⚠️ [Reconciler] Email enqueue failed for Order #${orderNumber}:`,
                  err.message
                )
              );

            logPaymentEvent({
              event: 'RECONCILIATION_RESOLVED',
              checkoutRequestId,
              mpesaReceiptNumber: mpesaReceipt,
              orderId: order._id,
              orderNumber: order.orderNumber,
              amount,
              provider: 'MPESA',
              resultCode: 0,
              resultDesc,
              processingDurationMs: Date.now() - startTime,
              metadata: { resolvedBy: 'reconciler' }
            });
          } else if (MPESA_FAILURE_CODES.has(resultCode)) {
            // ── Definitive failure from Safaricom ────────────────────────────
            order.paymentStatus = 'failed';
            order.orderEvents.push({
              status: 'PAYMENT_FAILED',
              note: `M-Pesa payment definitively failed during reconciliation: ${resultDesc} (Code: ${resultCode})`,
              user: null
            });
            await order.save({ session });

            await PaymentTransaction.findOneAndUpdate(
              { idempotencyKey: checkoutRequestId, provider: 'MPESA' },
              {
                $set: {
                  status: 'FAILED',
                  processedAt: new Date(),
                  metadata: {
                    checkoutRequestId,
                    resultCode,
                    resultDesc,
                    resolvedBy: 'reconciler'
                  }
                }
              },
              { upsert: true, session }
            );

            console.log(
              `   ❌ [Reconciler] Order #${orderNumber} resolved → FAILED (Code: ${resultCode} — ${resultDesc})`
            );
            failed++;

            logPaymentEvent({
              event: 'ORDER_FAILED',
              checkoutRequestId,
              orderId: order._id,
              orderNumber: order.orderNumber,
              provider: 'MPESA',
              resultCode: parseInt(resultCode, 10),
              resultDesc,
              metadata: { resolvedBy: 'reconciler' }
            });
          } else {
            // Unknown / transient result code — leave pending, reconciler will retry next run
            console.log(
              `   ⏳ [Reconciler] Order #${orderNumber} returned non-terminal code ${resultCode} (${resultDesc}) — leaving pending`
            );
            skipped++;
          }
        });
      } finally {
        session.endSession();
      }
    } catch (err) {
      console.error(
        `   ❌ [Reconciler] Unexpected error processing Order #${orderNumber}:`,
        err.message
      );
      logPaymentEvent({
        event: 'RECONCILIATION_QUERY_FAILED',
        checkoutRequestId,
        orderId,
        orderNumber,
        provider: 'MPESA',
        error: err.message,
        metadata: { unhandled: true, reconcilerRun: new Date().toISOString() }
      });
      skipped++;
    }
  }

  const durationMs = Date.now() - startTime;
  console.log(
    `✅ [Reconciler] Run complete in ${durationMs}ms | Resolved: ${resolved} | Failed: ${failed} | Skipped: ${skipped}`
  );
};

export default runPaymentReconciliation;
