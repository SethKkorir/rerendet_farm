import mongoose from 'mongoose';

const restockSubscriptionSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notified: {
    type: Boolean,
    default: false,
    index: true
  },
  notifiedAt: {
    type: Date
  }
}, {
  timestamps: true
});

restockSubscriptionSchema.index({ product: 1, email: 1 }, { unique: true });

const RestockSubscription = mongoose.model('RestockSubscription', restockSubscriptionSchema);
export default RestockSubscription;
