// controllers/subscriptionController.js
import Subscription from '../models/Subscription.js';
import Product from '../models/Product.js';
import ActivityLog from '../models/ActivityLog.js';
import asyncHandler from 'express-async-handler';

// Helper to compute next billing date from frequency
const calculateNextDate = (fromDate, frequency) => {
  const date = new Date(fromDate || Date.now());
  if (frequency === 'weekly') {
    date.setDate(date.getDate() + 7);
  } else if (frequency === 'bi-weekly') {
    date.setDate(date.getDate() + 14);
  } else {
    // monthly default (30 days)
    date.setDate(date.getDate() + 30);
  }
  return date;
};

// @desc    Get all subscriptions for authenticated customer
// @route   GET /api/subscriptions/mine
// @access  Private (Customer)
export const getMySubscriptions = asyncHandler(async (req, res) => {
  const subscriptions = await Subscription.find({ user: req.user._id })
    .populate('products.product', 'name price images image availableStock roastLevel grindOptions')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: subscriptions
  });
});

// @desc    Create a new recurring subscription
// @route   POST /api/subscriptions
// @access  Private (Customer)
export const createSubscription = asyncHandler(async (req, res) => {
  const { products, frequency = 'monthly', shippingAddress, paymentMethod = 'mpesa' } = req.body;

  if (!products || !Array.isArray(products) || products.length === 0) {
    res.status(400);
    throw new Error('Please select at least one coffee product for your subscription');
  }

  if (!shippingAddress || !shippingAddress.address || !shippingAddress.city) {
    res.status(400);
    throw new Error('Valid delivery address is required for recurring subscriptions');
  }

  // Populate locked prices and verify products exist
  const formattedProducts = [];
  for (const item of products) {
    const product = await Product.findById(item.product || item.productId || item._id);
    if (!product) {
      res.status(404);
      throw new Error(`Product ${item.name || item.product} not found`);
    }

    let unitPrice = product.price;
    if (item.size && Array.isArray(product.sizes)) {
      const sizeObj = product.sizes.find(s => s.size === item.size);
      if (sizeObj && sizeObj.price) unitPrice = sizeObj.price;
    }

    formattedProducts.push({
      product: product._id,
      quantity: Number(item.quantity) || 1,
      size: item.size || 'Standard 250g',
      price: unitPrice
    });
  }

  const nextBillingDate = calculateNextDate(new Date(), frequency);

  const subscription = await Subscription.create({
    user: req.user._id,
    products: formattedProducts,
    frequency,
    discount: 5, // 5% default subscriber discount
    status: 'active',
    nextBillingDate,
    shippingAddress,
    paymentMethod
  });

  // Audit log
  await ActivityLog.create({
    user: req.user._id,
    action: 'SUBSCRIPTION_CREATED',
    entityName: `Subscription #${subscription._id}`,
    details: { frequency, productCount: formattedProducts.length }
  }).catch(() => {});

  const populated = await Subscription.findById(subscription._id)
    .populate('products.product', 'name price images image availableStock roastLevel');

  res.status(201).json({
    success: true,
    message: 'Subscription created successfully! You save 5% on every delivery.',
    data: populated
  });
});

// @desc    Pause subscription
// @route   PUT /api/subscriptions/:id/pause
// @access  Private (Customer)
export const pauseSubscription = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findOne({ _id: req.params.id, user: req.user._id });

  if (!subscription) {
    res.status(404);
    throw new Error('Subscription not found');
  }

  if (subscription.status === 'cancelled') {
    res.status(400);
    throw new Error('Cancelled subscriptions cannot be paused');
  }

  subscription.status = 'paused';
  await subscription.save();

  await ActivityLog.create({
    user: req.user._id,
    action: 'SUBSCRIPTION_PAUSED',
    entityName: `Subscription #${subscription._id}`
  }).catch(() => {});

  res.json({
    success: true,
    message: 'Subscription paused. No charges will occur until resumed.',
    data: subscription
  });
});

// @desc    Resume paused subscription
// @route   PUT /api/subscriptions/:id/resume
// @access  Private (Customer)
export const resumeSubscription = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findOne({ _id: req.params.id, user: req.user._id });

  if (!subscription) {
    res.status(404);
    throw new Error('Subscription not found');
  }

  if (subscription.status === 'cancelled') {
    res.status(400);
    throw new Error('Cancelled subscriptions cannot be resumed. Please create a new subscription.');
  }

  subscription.status = 'active';
  // Recalculate next billing date if previous date has passed
  if (new Date(subscription.nextBillingDate) < new Date()) {
    subscription.nextBillingDate = calculateNextDate(new Date(), subscription.frequency);
  }
  await subscription.save();

  await ActivityLog.create({
    user: req.user._id,
    action: 'SUBSCRIPTION_RESUMED',
    entityName: `Subscription #${subscription._id}`
  }).catch(() => {});

  res.json({
    success: true,
    message: 'Subscription resumed successfully.',
    data: subscription
  });
});

// @desc    Skip next subscription delivery
// @route   PUT /api/subscriptions/:id/skip
// @access  Private (Customer)
export const skipNextDelivery = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findOne({ _id: req.params.id, user: req.user._id });

  if (!subscription) {
    res.status(404);
    throw new Error('Subscription not found');
  }

  if (subscription.status !== 'active') {
    res.status(400);
    throw new Error('Only active subscriptions can skip deliveries');
  }

  // Advance next billing date by 1 full cycle
  const currentNext = new Date(subscription.nextBillingDate || Date.now());
  const newNextDate = calculateNextDate(currentNext, subscription.frequency);
  subscription.nextBillingDate = newNextDate;
  await subscription.save();

  await ActivityLog.create({
    user: req.user._id,
    action: 'SUBSCRIPTION_SKIPPED',
    entityName: `Subscription #${subscription._id}`,
    details: { skippedTo: newNextDate }
  }).catch(() => {});

  res.json({
    success: true,
    message: `Next delivery skipped! Next scheduled roast: ${newNextDate.toLocaleDateString()}`,
    data: subscription
  });
});

// @desc    Update subscription frequency
// @route   PUT /api/subscriptions/:id/frequency
// @access  Private (Customer)
export const updateSubscriptionFrequency = asyncHandler(async (req, res) => {
  const { frequency } = req.body;

  if (!['weekly', 'bi-weekly', 'monthly'].includes(frequency)) {
    res.status(400);
    throw new Error('Invalid frequency. Must be weekly, bi-weekly, or monthly');
  }

  const subscription = await Subscription.findOne({ _id: req.params.id, user: req.user._id });

  if (!subscription) {
    res.status(404);
    throw new Error('Subscription not found');
  }

  subscription.frequency = frequency;
  subscription.nextBillingDate = calculateNextDate(new Date(), frequency);
  await subscription.save();

  res.json({
    success: true,
    message: `Delivery schedule updated to ${frequency}.`,
    data: subscription
  });
});

// @desc    Cancel subscription
// @route   PUT /api/subscriptions/:id/cancel
// @access  Private (Customer)
export const cancelSubscription = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const subscription = await Subscription.findOne({ _id: req.params.id, user: req.user._id });

  if (!subscription) {
    res.status(404);
    throw new Error('Subscription not found');
  }

  subscription.status = 'cancelled';
  await subscription.save();

  await ActivityLog.create({
    user: req.user._id,
    action: 'SUBSCRIPTION_CANCELLED',
    entityName: `Subscription #${subscription._id}`,
    details: { reason: reason || 'Customer requested cancellation' }
  }).catch(() => {});

  res.json({
    success: true,
    message: 'Subscription cancelled. No future charges will be made.',
    data: subscription
  });
});
