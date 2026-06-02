// models/PaymentAuditLog.js
import mongoose from 'mongoose';

/**
 * PaymentAuditLog — Immutable, append-only event ledger.
 *
 * Every payment lifecycle event across M-Pesa, PayPal, and Stripe writes
 * a structured record here. This collection is write-only from application
 * code — records are never updated or deleted.
 *
 * Indexed fields allow the admin dashboard to run granular financial queries
 * (e.g. "show me all DLQ_ENQUEUED events for the last 7 days").
 */
const paymentAuditLogSchema = new mongoose.Schema(
  {
    // ── Event Classification ─────────────────────────────────────────────────
    event: {
      type: String,
      required: true,
      enum: [
        'CALLBACK_RECEIVED',         // Webhook hit our endpoint
        'IDEMPOTENCY_HIT',           // Duplicate callback blocked
        'ORDER_PAID',                // Order successfully marked paid
        'ORDER_FAILED',              // Payment failure recorded on order
        'DLQ_ENQUEUED',              // Callback crashed → sent to Dead Letter Queue
        'DLQ_REPROCESSED',          // DLQ worker successfully reprocessed a callback
        'DLQ_EXHAUSTED',             // All DLQ retry attempts failed → admin alerted
        'RECONCILIATION_RESOLVED',   // Pending order resolved by scheduled reconciler
        'RECONCILIATION_QUERY_FAILED', // Safaricom query failed during reconciliation
        'EMAIL_DISPATCHED',          // Confirmation email enqueued to emailQueue
        'ADMIN_ALERTED',             // Admin notification sent
      ],
      index: true
    },

    // ── Payment Identity ─────────────────────────────────────────────────────
    checkoutRequestId: {
      type: String,
      index: true,
      default: null
    },
    mpesaReceiptNumber: {
      type: String,
      default: null
    },
    provider: {
      type: String,
      enum: ['MPESA', 'PAYPAL', 'STRIPE', 'SYSTEM'],
      default: 'MPESA'
    },

    // ── Order Reference ──────────────────────────────────────────────────────
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      index: true,
      default: null
    },
    orderNumber: {
      type: String,
      default: null
    },
    amount: {
      type: Number,
      default: null
    },

    // ── Safaricom Result ─────────────────────────────────────────────────────
    resultCode: {
      type: Number,
      default: null
    },
    resultDesc: {
      type: String,
      default: null
    },

    // ── Request Context ──────────────────────────────────────────────────────
    sourceIp: {
      type: String,
      default: null
    },
    processingDurationMs: {
      type: Number,
      default: null
    },

    // ── Error Detail ─────────────────────────────────────────────────────────
    error: {
      type: String,
      default: null
    },

    // ── Flexible Metadata ────────────────────────────────────────────────────
    metadata: {
      type: Object,
      default: null
    }
  },
  {
    timestamps: true, // createdAt, updatedAt (createdAt is the event timestamp)
    versionKey: false
  }
);

// Compound index for time-range financial reports
paymentAuditLogSchema.index({ event: 1, createdAt: -1 });
paymentAuditLogSchema.index({ orderId: 1, createdAt: -1 });
paymentAuditLogSchema.index({ checkoutRequestId: 1, createdAt: -1 });

// Optional TTL: uncomment to auto-purge logs older than 2 years
// paymentAuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 });

const PaymentAuditLog = mongoose.model('PaymentAuditLog', paymentAuditLogSchema);

export default PaymentAuditLog;
