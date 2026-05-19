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
        required: true,
        unique: true
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
        enum: ['SUCCESS', 'FAILED', 'PENDING', 'CANCELLED'],
        required: true
    },
    rawResponse: {
        type: Object, // Store the full JSON from the provider for debugging
    },
    metadata: {
        type: Object // Flexible field for any extra provider-specific info
    },
    lastQueriedAt: {
        type: Date
    }
}, {
    timestamps: true
});

const PaymentTransaction = mongoose.model('PaymentTransaction', paymentTransactionSchema);

export default PaymentTransaction;
