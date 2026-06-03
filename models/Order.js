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
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
    index: true
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
    enum: [null, 'roast_scheduled', 'roasting_in_progress', 'resting_quality_check', 'packaged', 'handed_to_courier'],
    default: null,
    index: true
  },

  // Metadata
  paymentMethod: { type: String, required: true },
  transactionId: { type: String },
  manualTransactionId: { type: String }, // For Paybill/Manual Verification
  paymentVerificationStatus: {
    type: String,
    enum: ['unverified', 'verified', 'rejected'],
    default: 'unverified'
  },
  trackingNumber: { type: String },
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

  // Inventory Reservation (Auto-expiry)
  expiresAt: {
    type: Date,
    default: function () {
      // Default: Expires in 30 minutes if unpaid
      return new Date(Date.now() + 30 * 60 * 1000);
    },
    index: { expires: 0 } // Create TTL index but managing logic manually for better control
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
    // 1. Generate Order Number
    if (!this.orderNumber) {
      const timestamp = Date.now().toString().slice(-8);
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      this.orderNumber = `ORD-${timestamp}-${random}`;
    }

    // 2. Generate Tracking Number (8 chars total: RC + 6 random)
    if (!this.trackingNumber) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded I, O, 0, 1 for clarity
      let randomPart = '';
      for (let i = 0; i < 6; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      this.trackingNumber = `RC${randomPart}`;
    }

    // Initial Log
    this.orderEvents.push({
      status: 'ORDER_CREATED',
      note: 'Order placed by customer'
    });
  }
  next();
});

// Add indexes for performance
orderSchema.index({ createdAt: -1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });
orderSchema.index({ user: 1 });

const Order = mongoose.model('Order', orderSchema, 'orders');

export default Order;