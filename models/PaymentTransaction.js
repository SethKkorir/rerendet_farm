import mongoose from 'mongoose';

const paymentTransactionSchema = new mongoose.Schema({
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: false
    },
    provider: {
        type: String,
        enum: ['MPESA', 'STRIPE', 'PAYPAL'],
        required: true
    },
    transactionId: {
        type: String, // MPESA Receipt Number or Stripe PaymentIntent ID
        required: true
        // Note: uniqueness enforced by compound index below (with provider), not here
    },
    /**
     * idempotencyKey — Stores the original CheckoutRequestID even after
     * transactionId is updated to the official MPESA receipt number.
     * This allows idempotency checks to always match on the original
     * Safaricom request identifier regardless of receipt substitution.
     */
    idempotencyKey: {
        type: String,
        index: true,
        default: null
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'KES'
    },
    status: {
        type: String,
        enum: ['SUCCESS', 'FAILED', 'PENDING', 'CANCELLED', 'PROCESSING'],
        required: true
    },
    rawResponse: {
        type: Object // Store the full JSON from the provider for debugging
    },
    metadata: {
        type: Object // Flexible field for any extra provider-specific info
    },
    lastQueriedAt: {
        type: Date
    },
    /**
     * processedAt — Timestamp of when the transaction reached a terminal state
     * (SUCCESS or FAILED). Used for reconciliation age calculations.
     */
    processedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

/**
 * Compound unique index: (transactionId + provider)
 *
 * Why compound instead of single-field unique on transactionId:
 * Different providers can theoretically generate the same string ID
 * (e.g. Stripe and MPESA both using timestamp-based IDs). The compound
 * index is tighter and semantically correct — uniqueness is scoped to
 * a provider's own transaction namespace.
 */
paymentTransactionSchema.index({ transactionId: 1, provider: 1 }, { unique: true });

// Index for fast order-based lookups
paymentTransactionSchema.index({ order: 1, provider: 1 });

const PaymentTransaction = mongoose.model('PaymentTransaction', paymentTransactionSchema);

export default PaymentTransaction;

