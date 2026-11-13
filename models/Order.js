// models/Order.js - REFACTORED FOR GRANULAR LIFECYCLE MANAGEMENT
import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  image: { type: String, required: true },
  size: { type: String, required: true },
  grind: { type: String },
  itemTotal: { type: Number, required: true }
});

const shippingAddressSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  country: { type: String, required: true },
  county: { type: String },
  town: { type: String },
  address: { type: String, required: true },
  city: { type: String }, // Keep for legacy
  postalCode: { type: String },
  landmark: { type: String }
});

const orderEventSchema = new mongoose.Schema({
  status: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  note: { type: String },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // User who triggered the event (null if system)
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  shippingAddress: shippingAddressSchema,

  // Financials
  subtotal: { type: Number, required: true },
  shippingCost: { type: Number, required: true, default: 0 },
  tax: { type: Number, required: true, default: 0 },
  total: { type: Number, required: true },

  // === GRANULAR STATUS FIELDS ===

  // Overall Lifecycle State
  orderStatus: {
    type: String,
    enum: ['open', 'completed', 'cancelled'],
    default: 'open',
    index: true
  },

  // Payment Lifecycle
  paymentStatus: {
    type: String,
    enum: ['pending', 'payment_reported', 'paid', 'partially_paid', 'expired', 'failed', 'refunded'],
    default: 'pending',
    index: true
  },

  // Customer Payment Reporting (unconfirmed until admin verifies)
  paymentReporting: {
    reported: { type: Boolean, default: false },
    reportedAt: { type: Date },
    mpesaCode: { type: String, trim: true, uppercase: true },
    customerPhone: { type: String, trim: true },
    notes: { type: String, trim: true },
    reportedCount: { type: Number, default: 0 }
  },

  // Manual Paybill Confirmation Details (latest/aggregate for backward compatibility)
  paymentConfirmation: {
    mpesaCode: {
      type: String,
      trim: true,
      uppercase: true
    },
    amountReceived: {
      type: Number
    },
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    confirmedAt: {
      type: Date
    }
  },

  // Verified Payment Transactions History (Supports Multiple Partial Payments)
  paymentConfirmations: [
    {
      mpesaCode: {
        type: String,
        trim: true,
        uppercase: true,
        required: true
      },
      amountReceived: {
        type: Number,
        required: true
      },
      confirmedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      confirmedAt: {
        type: Date,
        default: Date.now
      },
      receiptNumber: {
        type: String,
        trim: true
      },
      notes: {
        type: String,
        trim: true
      }
    }
  ],

  // Official Digital Payment Receipt
  receipt: {
    receiptNumber: { type: String, trim: true },
    issueDate: { type: Date },
    paymentType: { type: String, enum: ['full', 'partial'] },
    amountReceived: { type: Number },
    outstandingBalance: { type: Number, default: 0 },
    downloadUrl: { type: String },
    generatedAt: { type: Date }
  },

  // Payment Expiration for Paybill Orders
  paymentExpiresAt: {
    type: Date,
    index: true
  },

  // Extended Grace Expiry after Customer Reports Payment (allows admin review window)
  paymentGraceExpiresAt: {
    type: Date,
    index: true
  },

  // Stock Reservation Status (for idempotent release)
  stockReleased: {
    type: Boolean,
    default: false
  },

  // Fulfillment Lifecycle (Packing & Delivery)
  fulfillmentStatus: {
    type: String,
    enum: ['unfulfilled', 'packed', 'shipped', 'delivered', 'returned'],
    default: 'unfulfilled',
    index: true
  },

  // Cancellation reasons and fees
  cancellationReason: { type: String },
  cancellationNote: { type: String },
  cancellationFee: { type: Number, default: 0 },
  cancellationFeeApplied: { type: Boolean, default: false },

  // Delivery details
  deliveryFee: { type: Number, default: 0 },
  countyDeliveryRate: { type: Number },
  estimatedDeliveryDays: { type: Number },

  // Roast stages & substages
  roastStage: {
    type: String,
    enum: [null, 'pending', 'none', 'roast_scheduled', 'roasting_in_progress', 'resting_quality_check', 'packaged', 'handed_to_courier'],
    default: null,
    index: true
  },

  // Metadata
  paymentMethod: {
    type: String,
    enum: ['paybill', 'cod', 'mpesa', 'card'],
    default: 'paybill',
    required: true
  },
  idempotencyKey: { type: String, index: true },
  transactionId: { type: String },
  manualTransactionId: { type: String }, // For Paybill/Manual Verification
  paymentVerificationStatus: {
    type: String,
    enum: ['unverified', 'verified', 'rejected'],
    default: 'unverified'
  },
  trackingNumber: { type: String, index: true },
  customerDeliveredConfirmed: { type: Boolean, default: false },
  customerDeliveredConfirmedAt: { type: Date },
  estimatedDeliveryDate: { type: Date },
  notes: { type: String },

  // Audit Trail
  orderEvents: [orderEventSchema],
  trackingHistory: [
    {
      status: String,
      location: String,
      message: String,
      timestamp: { type: Date, default: Date.now }
    }
  ],

  // Subscription & Discounts
  isSubscription: { type: Boolean, default: false },
  subscriptionFrequency: { type: String, enum: ['weekly', 'bi-weekly', 'monthly'] },
  couponCode: { type: String, uppercase: true },
  discountAmount: { type: Number, default: 0 },

  // Inventory Reservation (Auto-expiry timestamp reference)
  expiresAt: {
    type: Date,
    default: function () {
      // Default: 24 hours if unpaid
      const hours = parseInt(process.env.PAYBILL_EXPIRY_HOURS, 10) || 24;
      return new Date(Date.now() + hours * 60 * 60 * 1000);
    }
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Backward Compatibility Virtual for 'status'
orderSchema.virtual('status').get(function () {
  if (this.orderStatus === 'cancelled') return 'Cancelled';
  if (this.fulfillmentStatus === 'returned') return 'Returned';
  if (this.fulfillmentStatus === 'delivered') return 'Delivered';
  if (this.fulfillmentStatus === 'shipped') return 'Shipped';
  if (this.fulfillmentStatus === 'packed') return 'Processing';

  // If we reach here, it's either confirmed (paid/CoD) or pending
  // We treat all open uncancelled orders as 'Confirmed' at minimum once placed
  return 'Confirmed';
});

// Generate Order Number & Tracking Number
orderSchema.pre('save', function (next) {
  if (this.isNew) {
    // 1. Generate Order Number (Compact e.g. RF-2841)
    if (!this.orderNumber) {
      const random = Math.floor(1000 + Math.random() * 9000).toString();
      this.orderNumber = `RF-${random}`;
    }

    // 2. Generate Tracking Number (Simple 4-digit code e.g. 2345)
    if (!this.trackingNumber) {
      this.trackingNumber = Math.floor(1000 + Math.random() * 9000).toString();
    }

    // 3. Set paymentExpiresAt for Paybill orders (default: 24h)
    if (this.paymentMethod === 'paybill' && !this.paymentExpiresAt) {
      const hours = parseInt(process.env.PAYBILL_EXPIRY_HOURS, 10) || 24;
      this.paymentExpiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    }

    // Initial Log
    this.orderEvents.push({
      status: 'ORDER_CREATED',
      note: 'Order placed by customer'
    });
  }
  next();
});

// Statics: Validate Status Transitions
orderSchema.statics.validateTransition = function (type, currentVal, newVal) {
  if (!currentVal || !newVal || currentVal === newVal) return true;

  if (type === 'paymentStatus') {
    const allowed = {
      pending: ['payment_reported', 'paid', 'partially_paid', 'expired', 'failed'],
      payment_reported: ['paid', 'partially_paid', 'expired', 'pending', 'failed'],
      partially_paid: ['payment_reported', 'paid', 'failed', 'expired'],
      failed: ['paid', 'pending', 'payment_reported'],
      paid: ['refunded'],
      expired: ['paid', 'pending'],
      refunded: []
    };
    return (allowed[currentVal] || []).includes(newVal);
  }

  if (type === 'fulfillmentStatus') {
    const allowed = {
      unfulfilled: ['packed', 'shipped', 'cancelled', 'returned'],
      packed: ['shipped', 'cancelled', 'returned'],
      shipped: ['delivered', 'returned'],
      delivered: ['returned'],
      returned: []
    };
    return (allowed[currentVal] || []).includes(newVal);
  }

  if (type === 'orderStatus') {
    const allowed = {
      open: ['completed', 'cancelled'],
      completed: ['cancelled'],
      cancelled: []
    };
    return (allowed[currentVal] || []).includes(newVal);
  }

  return true;
};

// Add indexes for performance & uniqueness
orderSchema.index({ createdAt: -1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });
orderSchema.index({ user: 1 });
orderSchema.index({ paymentMethod: 1, paymentStatus: 1, paymentExpiresAt: 1 });
orderSchema.index({ 'paymentConfirmation.mpesaCode': 1 }, { unique: true, sparse: true });
orderSchema.index({ 'paymentConfirmations.mpesaCode': 1 }, { unique: true, sparse: true });
orderSchema.index({ 'receipt.receiptNumber': 1 }, { unique: true, sparse: true });

const Order = mongoose.model('Order', orderSchema, 'orders');

export default Order;