import mongoose from 'mongoose';

const storeCreditTransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['earned_refund', 'earned_loyalty_redemption', 'earned_admin_grant', 'spent_checkout', 'expired'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  balanceBefore: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  note: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const StoreCreditTransaction = mongoose.model('StoreCreditTransaction', storeCreditTransactionSchema);
export default StoreCreditTransaction;
