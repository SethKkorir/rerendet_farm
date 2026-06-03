import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Settings from '../models/Settings.js';
import User from '../models/User.js';
import crypto from 'crypto';
import { mutateStoreCredit, mutateLoyaltyPoints } from './authController.js';

// Security validation for checkout window
const validateSecurityToken = (req, res, next) => {
  const { securityToken, timestamp } = req.body;
  if (Date.now() - timestamp > 300000) {
    return res.status(419).json({
      success: false,
      message: 'Session expired. Please refresh and try again.'
    });
  }
  if (!securityToken || securityToken.length < 10) {
    return res.status(400).json({
      success: false,
      message: 'Invalid security token'
    });
  }
  next();
};

// @desc    Create new order with transactional safety
// @route   POST /api/checkout/order
// @access  Private
export const createOrder = [
  validateSecurityToken,
  asyncHandler(async (req, res) => {
    const {
      items,
      shippingInfo,
      paymentMethod,
      subtotal,
      deliveryFee,
      total,
      mpesaPhone,
      securityToken,
      applyStoreCredit,
      storeCreditAmount = 0,
      redeemPoints,
      pointsToRedeem = 0
    } = req.body;

    // 1. Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400);
      throw new Error('Order items are required');
    }

    // 2. Validate landmark field for Kenyan addresses
    if (!shippingInfo || !shippingInfo.landmark || shippingInfo.landmark.trim().length < 10) {
      res.status(400);
      throw new Error('Landmark description is required and must be at least 10 characters for Kenyan deliveries.');
    }

    // 3. Look up delivery rate based on county/region
    const settings = await Settings.getSettings();
    const rates = settings.deliveryRates || [];
    const regionName = shippingInfo.county || shippingInfo.region || 'Other';
    const rateConfig = rates.find(r => r.region.toLowerCase() === regionName.toLowerCase()) || 
                       rates.find(r => r.region.toLowerCase() === 'other');
    
    const expectedDeliveryFee = rateConfig ? rateConfig.feeKES : 500;
    const estimatedDeliveryDays = rateConfig ? rateConfig.estimatedDays : 5;

    // Start database session for atomicity
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      // 4. Validate and calculate item totals & stock checks
      let calculatedSubtotal = 0;
      const orderItems = [];

      for (const item of items) {
        const product = await Product.findById(item.productId || item._id).session(session);
        if (!product) {
          throw new Error(`Product ${item.name || 'Unknown'} not found`);
        }

        const physicalStock = product.inventory?.physicalStock || 0;
        const reservedStock = product.inventory?.reservedStock || 0;
        const availableStock = physicalStock - reservedStock;

        if (availableStock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}. Only ${availableStock} available.`);
        }

        calculatedSubtotal += product.price * item.quantity;
        orderItems.push({
          product: product._id,
          name: product.name,
          quantity: item.quantity,
          price: product.price,
          size: item.size || '250g',
          image: product.images?.[0]?.url || product.image
        });

        // Reserve stock atomically
        product.inventory.reservedStock = (product.inventory.reservedStock || 0) + item.quantity;
        await product.save({ session });
      }

      // 5. Calculate discounts (Store credit and Loyalty redemptions)
      let storeCreditApplied = 0;
      let pointsDiscountApplied = 0;

      // Handle loyalty points redemption (100 points = KES 10)
      if (redeemPoints && pointsToRedeem > 0) {
        const user = await User.findById(req.user._id).session(session);
        if (user.loyaltyPoints < pointsToRedeem) {
          throw new Error('Insufficient loyalty points balance');
        }
        pointsDiscountApplied = Math.floor(pointsToRedeem / 10);
      }

      // Handle store credit
      if (applyStoreCredit && storeCreditAmount > 0) {
        const user = await User.findById(req.user._id).session(session);
        if (user.storeCreditBalance < storeCreditAmount) {
          throw new Error('Insufficient store credit balance');
        }
        storeCreditApplied = storeCreditAmount;
      }

      const rawTotal = calculatedSubtotal + expectedDeliveryFee - pointsDiscountApplied - storeCreditApplied;
      const finalTotal = Math.max(0, rawTotal);

      // Verify total match
      if (Math.abs(finalTotal - total) > 5) {
        throw new Error(`Order total validation failed. Expected KSh ${finalTotal}, received KSh ${total}`);
      }

      // 6. Generate unique order number
      const orderNumber = 'RND-' + Date.now().toString().slice(-6) + crypto.randomBytes(2).toString('hex').toUpperCase();

      // Create the order document
      const order = new Order({
        user: req.user._id,
        orderNumber,
        items: orderItems,
        shippingAddress: {
          name: shippingInfo.name || `${req.user.firstName} ${req.user.lastName}`,
          phone: shippingInfo.phone || req.user.phone || '',
          address: shippingInfo.address || '',
          city: shippingInfo.city || '',
          county: regionName,
          town: shippingInfo.town || '',
          postalCode: shippingInfo.postalCode || '',
          landmark: shippingInfo.landmark
        },
        subtotal: calculatedSubtotal,
        deliveryFee: expectedDeliveryFee,
        countyDeliveryRate: expectedDeliveryFee,
        estimatedDeliveryDays,
        total: finalTotal,
        paymentMethod,
        transactionId: paymentMethod === 'mpesa' ? '' : undefined,
        paymentStatus: finalTotal === 0 ? 'paid' : 'pending',
        fulfillmentStatus: 'unfulfilled',
        orderEvents: [{
          status: 'ORDER_CREATED',
          note: `Order initiated by customer. Total: KSh ${finalTotal}. Delivery fee: KSh ${expectedDeliveryFee}.`,
          user: req.user._id
        }]
      });

      const savedOrder = await order.save({ session });

      // Apply credit debit atomically if applicable
      if (storeCreditApplied > 0) {
        await mutateStoreCredit(
          req.user._id,
          -storeCreditApplied,
          'spent_checkout',
          { note: `Applied to order #${orderNumber}`, orderId: savedOrder._id },
          session
        );
      }

      // Apply points debit atomically if applicable
      if (pointsDiscountApplied > 0) {
        await mutateLoyaltyPoints(
          req.user._id,
          -pointsToRedeem,
          'spent_redemption',
          { orderId: savedOrder._id },
          session
        );
      }

      await session.commitTransaction();
      session.endSession();

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: savedOrder,
        orderId: savedOrder._id,
        orderNumber: savedOrder.orderNumber
      });

    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error('Checkout transaction aborted:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Error processing checkout transaction'
      });
    }
  })
];

// @desc    Get user orders with pagination
// @route   GET /api/checkout/orders
// @access  Private
export const getUserOrders = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const orders = await Order.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('items.product', 'name images price');

  const total = await Order.countDocuments({ user: req.user._id });

  res.json({
    success: true,
    data: orders,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});