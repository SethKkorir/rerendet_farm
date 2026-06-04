// controllers/orderController.js - ENHANCED WITH SECURITY
import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import { calculateShipping } from '../utils/shippingCalculator.js';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeObject, sanitizeEmail, sanitizePhone, sanitizeAmount } from '../utils/inputSanitizer.js';
import sendEmail from '../utils/sendEmail.js';
import { getOrderConfirmationEmail, getOrderStatusEmail } from '../utils/emailTemplates.js';
import { sendLowStockAlert } from '../utils/adminNotificationService.js';
import Coupon from '../models/Coupon.js';
import Subscription from '../models/Subscription.js';
import AbandonedCheckout from '../models/AbandonedCheckout.js';

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      shippingAddress,
      paymentMethod,
      items,
      subtotal,
      shippingCost,
      tax,
      totalAmount,
      notes,
      couponCode,
      isSubscription,
      subscriptionFrequency,
      useStoreCredit
    } = req.body;

    const userId = req.user._id;

    console.log('🛒 Creating order for user:', userId);
    console.log('📦 Order items:', items?.length);

    // ✅ SECURITY: Sanitize shipping address to prevent XSS
    const sanitizedAddress = sanitizeObject(shippingAddress);
    sanitizedAddress.email = sanitizeEmail(shippingAddress.email);
    sanitizedAddress.phone = sanitizePhone(shippingAddress.phone);

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.warn('⚠️ No items in order:', items);
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Order items are required'
      });
    }

    if (!sanitizedAddress || !paymentMethod) {
      console.warn('⚠️ Missing address or payment method:', { hasAddress: !!sanitizedAddress, paymentMethod });
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Shipping address and payment method are required'
      });
    }

    if (!sanitizedAddress.email || !sanitizedAddress.phone) {
      console.warn('⚠️ Missing email or phone:', { email: sanitizedAddress.email, phone: sanitizedAddress.phone });
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Valid email and phone number are required'
      });
    }

    // Check landmark requirement
    if (!sanitizedAddress.landmark || !sanitizedAddress.landmark.trim()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Landmark or delivery instructions are required.'
      });
    }

    // ✅ SECURITY: Generate unique order number with UUID
    const uuid = uuidv4().split('-')[0].toUpperCase();
    const timestamp = Date.now().toString().slice(-8);
    const orderNumber = `ORD-${timestamp}-${uuid}`;

    // Process order items and validate stock
    let calculatedSubtotal = 0;
    const orderItems = [];
    const stockUpdates = [];

    for (const item of items) {
      // Validate item structure
      if (!item.product || !item.name || !item.price || !item.quantity || !item.size) {
        console.warn('⚠️ Invalid item data:', item);
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: 'Invalid item data. All item fields are required.'
        });
      }

      const product = await Product.findById(item.product).session(session);

      if (!product) {
        console.warn('⚠️ Product not found:', { id: item.product, name: item.name });
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `Product not found: ${item.name}`
        });
      }

      // Check stock availability (GAP 2)
      if (product.availableStock < item.quantity) {
        console.warn('⚠️ Stock failure:', { product: product.name, available: product.availableStock, requested: item.quantity });
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for: ${product.name}`
        });
      }

      const itemPrice = parseFloat(product.sizes.find(s => s.size === item.size)?.price || product.price || item.price);
      const itemQuantity = parseInt(item.quantity);
      const itemTotal = itemPrice * itemQuantity;
      calculatedSubtotal += itemTotal;

      orderItems.push({
        product: product._id,
        name: item.name,
        price: itemPrice,
        quantity: itemQuantity,
        size: item.size,
        image: item.image || product.images?.[0]?.url || '/default-product.jpg',
        itemTotal: itemTotal
      });

      stockUpdates.push({
        productId: product._id,
        quantity: itemQuantity,
        currentStock: product.availableStock
      });
    }

    // ✅ DISCOUNT LOGIC
    let discount = 0;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true }).session(session);
      if (coupon && coupon.isValid() && calculatedSubtotal >= coupon.minOrderAmount) {
        if (coupon.discountType === 'percentage') {
          discount = sanitizeAmount(calculatedSubtotal * (coupon.discountAmount / 100));
        } else {
          discount = sanitizeAmount(coupon.discountAmount);
        }
        // Increment use count
        coupon.usedCount += 1;
        await coupon.save({ session });
      }
    }

    // Apply Subscription Discount (5%)
    if (isSubscription) {
      const subscriptionDiscount = sanitizeAmount(calculatedSubtotal * 0.05);
      discount += subscriptionDiscount;
    }

    const finalSubtotal = sanitizeAmount(calculatedSubtotal);
    const finalShippingCost = sanitizeAmount(shippingCost);
    const taxableAmount = Math.max(0, finalSubtotal - discount);
    const finalTax = 0; // No VAT — tax disabled
    const calculatedTotal = sanitizeAmount(taxableAmount + finalShippingCost);

    // Apply Store Credit if requested
    const userObj = await User.findById(userId).session(session);
    let storeCreditApplied = 0;
    if (useStoreCredit && userObj && userObj.storeCreditBalance > 0) {
      storeCreditApplied = Math.min(userObj.storeCreditBalance, calculatedTotal);
    }
    const finalTotalAfterCredit = sanitizeAmount(calculatedTotal - storeCreditApplied);

    const clientTotal = sanitizeAmount(totalAmount);

    console.log('💰 Validating order amounts:', {
      itemsSubtotal: calculatedSubtotal,
      discount: discount,
      shipping: finalShippingCost,
      storeCreditApplied,
      totalBeforeCredit: calculatedTotal,
      totalAfterCredit: finalTotalAfterCredit
    });

    // Prevent price manipulation (tolerance: KES 2)
    if (Math.abs(finalTotalAfterCredit - clientTotal) > 2.0) {
      await session.abortTransaction();
      session.endSession();
      console.warn(`⚠️ Price mismatch: Client=${clientTotal}, Server=${finalTotalAfterCredit}, Discount=${discount}, StoreCreditApplied=${storeCreditApplied}`);
      return res.status(400).json({
        success: false,
        message: 'Order amount validation failed. Please refresh your cart.'
      });
    }

    const finalTotal = finalTotalAfterCredit;

    // Create order with granular status
    const order = new Order({
      orderNumber: orderNumber,
      user: userId,
      items: orderItems,
      shippingAddress: {
        firstName: sanitizedAddress.firstName,
        lastName: sanitizedAddress.lastName,
        email: sanitizedAddress.email,
        phone: sanitizedAddress.phone,
        address: sanitizedAddress.address,
        city: sanitizedAddress.city,
        county: sanitizedAddress.county,
        country: sanitizedAddress.country || 'Kenya',
        postalCode: sanitizedAddress.postalCode || '',
        landmark: sanitizedAddress.landmark
      },
      subtotal: finalSubtotal,
      shippingCost: finalShippingCost,
      tax: finalTax,
      discountAmount: discount,
      total: finalTotal,
      couponCode: couponCode ? couponCode.toUpperCase() : undefined,
      isSubscription: isSubscription || false,
      subscriptionFrequency: subscriptionFrequency,
      storeCreditApplied: storeCreditApplied,

      // Metadata
      paymentMethod: paymentMethod,
      notes: notes || '',

      // === NEW LIFECYCLE STATE ===
      orderStatus: 'open', // Default open
      paymentStatus: finalTotal === 0 ? 'paid' : 'pending', // Paid if fully covered by store credit
      fulfillmentStatus: 'unfulfilled',
      roastStage: 'pending',

      // Initial History
      orderEvents: [
        {
          status: 'ORDER_CREATED',
          note: 'Order placed by customer via checkout',
          user: userId
        }
      ]
    });

    // Log creation event
    order.orderEvents.push({
      status: 'ORDER_CREATED',
      note: `Order initiated via ${paymentMethod}`,
      user: userId
    });

    console.log('📝 Saving order to database...');

    const savedOrder = await order.save({ session });

    // Deduct Store Credit if applied
    if (storeCreditApplied > 0 && userObj) {
      userObj.storeCreditBalance = sanitizeAmount(userObj.storeCreditBalance - storeCreditApplied);
      await userObj.save({ session });

      const StoreCreditTransaction = (await import('../models/StoreCreditTransaction.js')).default;
      await StoreCreditTransaction.create([{
        user: userId,
        amount: -storeCreditApplied,
        type: 'purchase',
        balanceAfter: userObj.storeCreditBalance,
        description: `Applied store credit to order #${orderNumber}`,
        order: order._id
      }], { session });
    }

    // Update customer reorder streak and average days
    if (userObj) {
      const now = new Date();
      if (userObj.lastReorderDate) {
        const diffTime = Math.abs(now - new Date(userObj.lastReorderDate));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Update average reorder days
        if (userObj.reorderAverageDays > 0) {
          userObj.reorderAverageDays = Math.round((userObj.reorderAverageDays + diffDays) / 2);
        } else {
          userObj.reorderAverageDays = diffDays;
        }

        // Streak logic
        const threshold = userObj.reorderAverageDays || 30;
        if (diffDays <= threshold + 2) {
          userObj.reorderStreak += 1;
        } else {
          userObj.reorderStreak = 1;
        }
      } else {
        userObj.reorderStreak = 1;
        userObj.reorderAverageDays = 0;
      }
      userObj.lastReorderDate = now;
      await userObj.save({ session });
    }

    // ✅ SUBSCRIPTION LOGIC: Create Subscription if requested
    if (isSubscription) {
      const nextBilling = new Date();
      if (subscriptionFrequency === 'weekly') nextBilling.setDate(nextBilling.getDate() + 7);
      else if (subscriptionFrequency === 'bi-weekly') nextBilling.setDate(nextBilling.getDate() + 14);
      else nextBilling.setMonth(nextBilling.getMonth() + 1);

      const subscription = new Subscription({
        user: userId,
        products: orderItems.map(item => ({
          product: item.product,
          quantity: item.quantity,
          size: item.size,
          price: item.price
        })),
        frequency: subscriptionFrequency,
        nextBillingDate: nextBilling,
        shippingAddress: order.shippingAddress,
        paymentMethod: order.paymentMethod
      });
      await subscription.save({ session });
    }

    // Update product stock (Atomic Reservation - GAP 2)
    for (const update of stockUpdates) {
      const baseProduct = await Product.findById(update.productId).session(session);

      if (baseProduct.isBundle) {
        for (const detail of baseProduct.bundleDetails) {
          const totalToIncrement = detail.quantity * update.quantity;

          const updatedChild = await Product.findOneAndUpdate(
            { _id: detail.product },
            { $inc: { "inventory.reservedStock": totalToIncrement } },
            { session, new: true }
          );

          if (!updatedChild) {
            throw new Error(`Failed to reserve stock for bundle component: ${detail.product}`);
          }
        }
      } else {
        const updatedProduct = await Product.findOneAndUpdate(
          { _id: update.productId },
          { $inc: { "inventory.reservedStock": update.quantity } },
          { session, new: true }
        );

        if (!updatedProduct) {
          throw new Error(`Failed to reserve stock for product: ${baseProduct.name}`);
        }

        // Low Stock Alert
        if (updatedProduct.availableStock <= updatedProduct.inventory.lowStockThreshold) {
          sendLowStockAlert(updatedProduct).catch(console.error);
        }
      }
    }

    // ✅ LOYALTY POINTS: Award 1 point per 100 KES of PRODUCT VALUE (Subtotal)
    try {
      const pointsEarned = Math.floor(finalSubtotal / 100);
      if (pointsEarned > 0 && userObj) {
        const updatedUserObj = await User.findByIdAndUpdate(userId, { $inc: { loyaltyPoints: pointsEarned } }, { session, new: true });
        
        const LoyaltyTransaction = (await import('../models/LoyaltyTransaction.js')).default;
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 12); // expires in 12 months

        await LoyaltyTransaction.create([{
          user: userId,
          points: pointsEarned,
          type: 'earning',
          balanceAfter: updatedUserObj.loyaltyPoints,
          description: `Earned from order #${orderNumber}`,
          order: savedOrder._id,
          expiresAt
        }], { session });

        console.log(`✨ Awarded ${pointsEarned} loyalty points to user ${userId}`);
      }
    } catch (loyaltyError) {
      console.error('⚠️ Loyalty points error:', loyaltyError);
    }

    await session.commitTransaction();
    session.endSession();

    console.log('✅ Order saved successfully:', savedOrder.orderNumber);

    // Populate order for response
    const populatedOrder = await Order.findById(savedOrder._id)
      .populate('user', 'firstName lastName email phone')
      .populate('items.product', 'name images category');

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      data: populatedOrder
    });

    // Alert administrators about new order placement
    try {
      const { sendNewOrderAdminAlert } = await import('../utils/adminNotificationService.js');
      sendNewOrderAdminAlert(savedOrder).catch(console.error);
    } catch (alertErr) {
      console.error('❌ Failed to trigger admin order alert:', alertErr.message);
    }

    // Send order confirmation email only if paid or Cash on Delivery
    if (savedOrder.paymentStatus === 'paid' || savedOrder.paymentMethod === 'cod') {
        const frontendUrl = (!process.env.FRONTEND_URL || process.env.FRONTEND_URL.includes('localhost') || process.env.FRONTEND_URL.includes('127.0.0.1')) && (process.env.NODE_ENV === 'production' || process.env.VERCEL)
          ? 'https://rerendet-farm.vercel.app'
          : (process.env.FRONTEND_URL || 'http://localhost:3000');
        const dashboardUrl = `${frontendUrl}/account/orders/${savedOrder._id}`;

        // Prepare email data
        const emailData = {
          order: {
            ...savedOrder.toObject(),
            formattedDate: new Date(savedOrder.createdAt).toLocaleDateString(),
            items: orderItems,
          },
          dashboardUrl
        };

        // Fetch store logo
        let logoUrl;
        try {
          const { default: Settings } = await import('../models/Settings.js');
          const settings = await Settings.getSettings();
          logoUrl = settings?.store?.logo;
        } catch (e) {
          // ignore
        }

        const emailHtml = getOrderConfirmationEmail(
          savedOrder.shippingAddress.firstName,
          savedOrder.orderNumber,
          orderItems,
          finalTotal,
          savedOrder.trackingNumber,
          logoUrl,
          savedOrder._id.toString()
        );

        await sendEmail({
          to: savedOrder.shippingAddress.email,
          subject: `Order Selection Confirmed - #${savedOrder.orderNumber}`,
          html: emailHtml
        });

        console.log(`📧 Confirmation email sent to ${savedOrder.shippingAddress.email}`);
      } catch (emailError) {
        console.error('❌ Failed to send confirmation email:', emailError);
      }
    } else {
      console.log(`⏳ Payment pending for order #${savedOrder.orderNumber}. Confirmation email deferred until payment completion.`);
    }

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error('❌ Order creation error:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Get user orders
// @route   GET /api/orders/my
// @access  Private
const getUserOrders = asyncHandler(async (req, res) => {
  if (!req.user || !req.user._id) {
    console.error('❌ getUserOrders: req.user is missing or incomplete', {
      hasUser: !!req.user,
      userId: req.user?._id
    });
    return res.status(401).json({
      success: false,
      message: 'Not authorized, user context missing'
    });
  }

  const userId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;



  try {
    const [ordersList, total] = await Promise.all([
      Order.find({ user: userId })
        .select('orderNumber items total orderStatus paymentStatus fulfillmentStatus createdAt')
        .populate('items.product', 'name images')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments({ user: userId })
    ]);

    // Manually map virtual fields to preserve lean query performance
    const orders = ordersList.map(order => {
      let status = 'Confirmed';
      if (order.orderStatus === 'cancelled') status = 'Cancelled';
      else if (order.fulfillmentStatus === 'returned') status = 'Returned';
      else if (order.fulfillmentStatus === 'delivered') status = 'Delivered';
      else if (order.fulfillmentStatus === 'shipped') status = 'Shipped';
      else if (order.fulfillmentStatus === 'packed') status = 'Processing';

      return {
        ...order,
        status, // preserve backward compatible virtual 'status'
        id: order._id.toString()
      };
    });

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔍 Fetching order:', id);

    let order;

    // Check if it's a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      order = await Order.findById(id)
        .populate('user', 'firstName lastName email phone role')
        .populate('items.product', 'name images price category');
    }

    // If not found by ID or ID was not a valid ObjectId, try finding by identifiers
    if (!order) {
      order = await Order.findOne({
        $or: [
          { orderNumber: id },
          { trackingNumber: id }
        ]
      })
        .populate('user', 'firstName lastName email phone role')
        .populate('items.product', 'name images price category');
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found. Please check your order number.'
      });
    }

    // Check authorization: Owner or Admin
    const isOwner = order.user?._id.toString() === req.user?._id.toString();
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super-admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order details'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('❌ Get order by ID/Number error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Get all orders (Admin)
// @route   GET /api/orders
// @access  Private/Admin
const getOrders = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    fulfillmentStatus,
    paymentStatus,
    search,
    startDate,
    endDate
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  let filter = {};

  try {
    // Fulfillment Status Filter
    const effectiveFulfill = fulfillmentStatus || status;
    if (effectiveFulfill && effectiveFulfill !== 'all') {
      filter.fulfillmentStatus = effectiveFulfill;
    }

    // Payment Status Filter
    if (paymentStatus && paymentStatus !== 'all') {
      filter.paymentStatus = paymentStatus;
    }

    // Date Range Filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const d = new Date(startDate);
        if (!isNaN(d.getTime())) {
          d.setHours(0, 0, 0, 0);
          filter.createdAt.$gte = d;
        }
      }
      if (endDate) {
        const d = new Date(endDate);
        if (!isNaN(d.getTime())) {
          d.setHours(23, 59, 59, 999);
          filter.createdAt.$lte = d;
        }
      }
    }

    // Search Filter
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'shippingAddress.firstName': { $regex: search, $options: 'i' } },
        { 'shippingAddress.lastName': { $regex: search, $options: 'i' } },
        { 'shippingAddress.email': { $regex: search, $options: 'i' } }
      ];
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .select('orderNumber totalAmount paymentStatus fulfillmentStatus createdAt user shippingAddress.email shippingAddress.phone')
        .populate('user', 'firstName lastName email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Order.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          current: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders: ' + error.message
    });
  }
});

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  const {
    orderStatus,
    paymentStatus,
    fulfillmentStatus,
    trackingNumber,
    adminNotes,
    location,
    message
  } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Track changes for history logging
  const changes = [];

  // Status Label Map for better UX
  const STATUS_LABELS = {
    unfulfilled: 'Confirmed',
    packed: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    returned: 'Returned'
  };

  // 1. Update Payment Status
  if (paymentStatus && order.paymentStatus !== paymentStatus) {
    order.paymentStatus = paymentStatus;
    changes.push(`Payment status updated to ${paymentStatus}`);

    // Auto-update event log
    order.orderEvents.push({
      status: 'PAYMENT_UPDATE',
      note: `Payment status changed to ${paymentStatus} by admin`,
      user: req.user._id
    });
  }

  // 2. Update Fulfillment Status
  if (fulfillmentStatus && order.fulfillmentStatus !== fulfillmentStatus) {
    // Validation for tracking number
    if (fulfillmentStatus === 'shipped' && !trackingNumber && !order.trackingNumber) {
      res.status(400);
      throw new Error('Tracking number is required when marking an order as shipped.');
    }

    const previousFulfillmentStatus = order.fulfillmentStatus;
    order.fulfillmentStatus = fulfillmentStatus;
    const fulfillmentLabel = STATUS_LABELS[fulfillmentStatus] || fulfillmentStatus;
    changes.push(`Fulfillment status updated to ${fulfillmentLabel}`);

    // Auto-update event log
    order.orderEvents.push({
      status: 'FULFILLMENT_UPDATE',
      note: `Fulfillment status changed to ${fulfillmentLabel} by admin`,
      user: req.user._id
    });

    // Award loyalty points and update streak if marked delivered
    if (fulfillmentStatus === 'delivered' && previousFulfillmentStatus !== 'delivered') {
      const User = (await import('../models/User.js')).default;
      const user = await User.findById(order.user);
      if (user) {
        let streak = user.reorderStreak || 0;
        let multiplier = user.streakBonusMultiplier || 1.0;
        const lastOrder = user.lastOrderDate;
        const now = new Date();

        if (lastOrder) {
          const diffTime = Math.abs(now - new Date(lastOrder));
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays <= 28) {
            streak += 1;
          } else {
            streak = 1;
          }
        } else {
          streak = 1;
        }

        multiplier = Math.min(2.0, 1.0 + Math.floor(streak / 3) * 0.1);

        user.reorderStreak = streak;
        user.streakBonusMultiplier = multiplier;
        user.lastOrderDate = now;
        user.pointsExpiryDate = new Date(now.getTime() + 12 * 30 * 24 * 60 * 60 * 1000); // 12 months

        // Compute running average of last 5 delivered orders reorder days
        const Order = mongoose.model('Order');
        const deliveredOrders = await Order.find({
          user: user._id,
          fulfillmentStatus: 'delivered'
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('createdAt');

        const orderDates = deliveredOrders.map(o => o.createdAt);
        if (!orderDates.some(d => d.getTime() === order.createdAt.getTime())) {
          orderDates.unshift(order.createdAt);
        }
        const last5Dates = orderDates.slice(0, 5);

        let averageReorderDays = null;
        if (last5Dates.length >= 2) {
          let totalDays = 0;
          for (let i = 0; i < last5Dates.length - 1; i++) {
            const diffMs = new Date(last5Dates[i]) - new Date(last5Dates[i + 1]);
            totalDays += diffMs / (1000 * 60 * 60 * 24);
          }
          averageReorderDays = totalDays / (last5Dates.length - 1);
        }
        user.averageReorderDays = averageReorderDays;

        await user.save();

        const earnedPoints = Math.floor(order.total * 0.05 * multiplier);
        if (earnedPoints > 0) {
          const { mutateLoyaltyPoints } = await import('./authController.js');
          await mutateLoyaltyPoints(
            user._id,
            earnedPoints,
            'earned_order',
            { orderId: order._id }
          );
        }
      }
    }
  }

  // 3. Update Overall Order Status (Optional, often derived, but allow manual override)
  if (orderStatus && order.orderStatus !== orderStatus) {
    order.orderStatus = orderStatus;
    changes.push(`Order status updated to ${orderStatus}`);

    order.orderEvents.push({
      status: 'ORDER_UPDATE',
      note: `Order status changed to ${orderStatus} by admin`,
      user: req.user._id
    });
  }

  // Update Metadata
  if (trackingNumber) order.trackingNumber = trackingNumber;
  if (adminNotes) order.notes = adminNotes; // Map adminNotes to notes or new field

  // Legacy support: Update statusUpdatedAt if any change
  if (changes.length > 0) {
    order.statusUpdatedAt = new Date();
  }

  // Add to legacy trackingHistory for backward compatibility / frontend display
  if (changes.length > 0) {
    const rawFulfill = fulfillmentStatus || order.fulfillmentStatus;
    const historyStatus = STATUS_LABELS[rawFulfill] || rawFulfill;

    order.trackingHistory.push({
      status: historyStatus.toLowerCase(), // Store lowercase for icon mapping
      location: location || '',
      message: message || changes.join('. '),
      timestamp: new Date()
    });
  }

  const updatedOrder = await order.save();

  // Re-populate for frontend consistency
  await updatedOrder.populate('user', 'firstName lastName email');

  // SEND EMAIL NOTIFICATION (Only for significant fulfillment/payment changes)
  if ((fulfillmentStatus && ['shipped', 'delivered', 'returned'].includes(fulfillmentStatus)) || message) {
    try {
      // Fetch store logo
      let logoUrl;
      try {
        const { default: Settings } = await import('../models/Settings.js');
        const settings = await Settings.getSettings();
        logoUrl = settings?.store?.logo;
      } catch (e) {
        // ignore
      }

      // Determine effective status for email (use label)
      const rawStatus = fulfillmentStatus || order.fulfillmentStatus;
      const emailStatus = STATUS_LABELS[rawStatus] || rawStatus;

      const emailHtml = getOrderStatusEmail(
        updatedOrder.user.firstName,
        updatedOrder.orderNumber,
        emailStatus,
        updatedOrder.trackingNumber,
        message || `Your order is now ${emailStatus}.`,
        logoUrl,
        updatedOrder._id.toString()
      );

      // Dynamic subject based on status
      const subject = `Order Update: ${emailStatus} - #${updatedOrder.orderNumber}`;

      await sendEmail({
        to: updatedOrder.user.email,
        subject: subject,
        html: emailHtml
      });

      console.log(`📧 Status update email sent to ${updatedOrder.user.email}`);
    } catch (emailError) {
      console.error('❌ Failed to send status update email:', emailError);
    }
  }

  res.json({
    success: true,
    message: 'Order status updated successfully',
    data: updatedOrder
  });
});

// @desc    Calculate shipping cost
// @route   POST /api/orders/shipping-cost
// @access  Public
const calculateShippingCost = asyncHandler(async (req, res) => {
  const { country, county } = req.body;

  if (!country || !county) {
    return res.status(400).json({
      success: false,
      message: 'Country and county are required'
    });
  }

  try {
    const { default: Settings } = await import('../models/Settings.js');
    const settings = await Settings.getSettings();
    const baseShippingPrice = settings?.payment?.shippingPrice ?? 500;

    let shippingCost = baseShippingPrice;

    if (country.toLowerCase() !== 'kenya') {
      shippingCost = 2000; // International Rate
    } else {
      // Check if admin has configured a custom county price
      const customRate = settings?.countyShipping?.find(
        item => item.county.toLowerCase() === county.trim().toLowerCase()
      );

      if (customRate !== undefined && customRate !== null) {
        shippingCost = customRate.price;
      } else {
        const { getShippingZone } = await import('../utils/kenyaLocations.js');
        const zone = getShippingZone(county);

        if (baseShippingPrice <= 50) {
          // Flat rate mode for nominal/promotional fees
          shippingCost = baseShippingPrice;
        } else {
          // Premium Adaptive Zone Scaling (relative to base standard fee)
          if (zone === 'Nairobi') {
            shippingCost = Math.max(0, baseShippingPrice - 300);
          } else if (zone === 'Metropolitan') {
            shippingCost = Math.max(0, baseShippingPrice - 150);
          } else if (zone === 'Major City') {
            shippingCost = Math.max(0, baseShippingPrice - 50);
          } else {
            // Rest of Kenya
            shippingCost = Math.max(0, baseShippingPrice + 100);
          }
        }
      }
    }

    res.json({
      success: true,
      data: {
        shippingCost,
        currency: 'KES'
      }
    });
  } catch (error) {
    console.error('Calculate shipping error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate shipping cost'
    });
  }
});

// @desc    Log a failed or abandoned checkout attempt
// @route   POST /api/orders/abandoned
// @access  Private
const logAbandonedCheckout = asyncHandler(async (req, res) => {
  const { items, totalAmount, paymentMethod, failureReason, shippingAddress } = req.body;

  const abandoned = await AbandonedCheckout.create({
    user: req.user._id,
    items,
    totalAmount,
    paymentMethod,
    failureReason,
    shippingAddress
  });

  res.status(201).json({
    success: true,
    data: abandoned
  });
});

// @desc    Get abandoned checkouts (Admin)
// @route   GET /api/orders/abandoned
// @access  Private/Admin
const getAbandonedCheckouts = asyncHandler(async (req, res) => {
  const abandoned = await AbandonedCheckout.find()
    .populate('user', 'firstName lastName email phone')
    .sort({ createdAt: -1 })
    .limit(50);

  res.json({
    success: true,
    data: abandoned
  });
});

// @desc    Generate PDF invoice for order
// @route   GET /api/orders/:id/invoice
// @access  Private
const generateOrderInvoice = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'firstName lastName email');

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Check if user owns the order or is admin
  if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to access this invoice');
  }

  // Import invoice generator
  const { default: generateInvoice } = await import('../utils/invoiceGenerator.js');

  // Generate and stream PDF
  generateInvoice(order, res);
});

// @desc    Validate coupon code
// @route   POST /api/orders/validate-coupon
// @access  Private
const validateCoupon = asyncHandler(async (req, res) => {
  const { code, subtotal } = req.body;
  if (!code) {
    return res.status(400).json({ success: false, message: 'Coupon code is required' });
  }

  const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });

  if (!coupon) {
    return res.status(404).json({ success: false, message: 'Invalid coupon code' });
  }

  if (!coupon.isValid()) {
    return res.status(400).json({ success: false, message: 'Coupon has expired or reached usage limit' });
  }

  if (subtotal && subtotal < coupon.minOrderAmount) {
    return res.status(400).json({
      success: false,
      message: `Minimum order amount for this coupon is KES ${coupon.minOrderAmount}`
    });
  }

  res.json({
    success: true,
    data: {
      code: coupon.code,
      discountType: coupon.discountType,
      discountAmount: coupon.discountAmount
    }
  });
});

// @route   POST /api/orders/:id/cancel
// @access  Private
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Ensure user owns order or is admin
  if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to cancel this order');
  }

  if (order.orderStatus === 'cancelled') {
    res.status(400);
    throw new Error('Order is already cancelled');
  }

  // Check condition 1: if status is not confirmed (i.e. not unfulfilled)
  const isConfirmed = order.fulfillmentStatus === 'unfulfilled';
  if (!isConfirmed) {
    res.status(400);
    throw new Error('Order cannot be cancelled after processing has begun.');
  }

  // Validate cancellationReason
  const { cancellationReason, cancellationNote } = req.body;
  const allowedReasons = ['changed_mind', 'wrong_size_selected', 'found_better_price', 'payment_issue', 'ordered_by_mistake', 'other'];
  if (!cancellationReason || !allowedReasons.includes(cancellationReason)) {
    res.status(400);
    throw new Error('Valid cancellation reason is required');
  }

  // Check condition 2: if order was placed more than 30 minutes ago
  let cancellationFee = 0;
  let cancellationFeeApplied = false;
  let cancellationWarning = '';
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  if (order.createdAt < thirtyMinutesAgo) {
    const settings = await Settings.findOne().select('cancellationFeeKES').lean();
    cancellationFee = settings?.cancellationFeeKES ?? 200;
    cancellationFeeApplied = true;
    cancellationWarning = 'Roasting may have already begun — a cancellation fee may apply.';
  }

  order.cancellationReason = cancellationReason;
  order.cancellationNote = cancellationNote || '';
  order.cancellationFee = cancellationFee;
  order.cancellationFeeApplied = cancellationFeeApplied;
  order.orderStatus = 'cancelled';

  order.orderEvents.push({
    status: 'CANCELLED',
    note: `Cancelled by customer. Reason: ${cancellationReason}. Warning: ${cancellationWarning}`,
    user: req.user._id
  });

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Refund remaining balance to store credit if order was paid
    if (order.paymentStatus === 'paid') {
      const refundAmount = Math.max(0, order.total - cancellationFee);
      if (refundAmount > 0) {
        const { mutateStoreCredit } = await import('./authController.js');
        await mutateStoreCredit(
          order.user,
          refundAmount,
          'earned_refund',
          { note: `Refund for cancelled order #${order.orderNumber} (minus KSh ${cancellationFee} fee)`, orderId: order._id },
          session
        );
      }
      order.paymentStatus = 'refunded';
    }

    // Revert loyalty points earned on this order
    // Find if user earned points on this order and reverse them
    const LoyaltyTransaction = (await import('../models/LoyaltyTransaction.js')).default;
    const earnedTxn = await LoyaltyTransaction.findOne({ orderId: order._id, type: 'earned_order' }).session(session);
    if (earnedTxn) {
      const { mutateLoyaltyPoints } = await import('./authController.js');
      await mutateLoyaltyPoints(
        order.user,
        -earnedTxn.points,
        'reversed_cancellation',
        { orderId: order._id },
        session
      );
    }

    // If points discount was applied at checkout, refund it (loyalty points spent reversal)
    const spentTxn = await LoyaltyTransaction.findOne({ orderId: order._id, type: 'spent_redemption' }).session(session);
    if (spentTxn) {
      const { mutateLoyaltyPoints } = await import('./authController.js');
      await mutateLoyaltyPoints(
        order.user,
        Math.abs(spentTxn.points),
        'earned_order', // return points
        { orderId: order._id },
        session
      );
    }

    // Also refund store credit spent on the order if any (concurrency safe reversal)
    const StoreCreditTransaction = (await import('../models/StoreCreditTransaction.js')).default;
    const spentCreditTxn = await StoreCreditTransaction.findOne({ orderId: order._id, type: 'spent_checkout' }).session(session);
    if (spentCreditTxn) {
      const { mutateStoreCredit } = await import('./authController.js');
      await mutateStoreCredit(
        order.user,
        Math.abs(spentCreditTxn.amount),
        'earned_refund',
        { note: `Reversal of store credit spent on cancelled order #${order.orderNumber}`, orderId: order._id },
        session
      );
    }

    await order.save({ session });

    // Replenish stock atomically by decrementing reservedStock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { 'inventory.reservedStock': -item.quantity }
      }).session(session);
    }

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }

  res.json({
    success: true,
    message: 'Order cancelled successfully and transactions reversed',
    cancellationWarning,
    data: order
  });
});

// @desc    Get order cancellation warning and preview
// @route   GET /api/orders/:id/cancel-warning
// @access  Private
const getCancelOrderWarning = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Ensure user owns order or is admin
  if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to access this order info');
  }

  let fee = 0;
  let warning = 'You can cancel this order for a full refund.';
  if (order.roastStage && order.roastStage !== 'none' && order.roastStage !== 'pending') {
    const settingsObj = await Settings.findOne().select('cancellationFeeKES').lean();
    fee = settingsObj?.cancellationFeeKES ?? 200;
    warning = `Roasting has already started for your order. Cancelling now will incur a KSh ${fee} cancellation fee.`;
  }

  res.json({
    success: true,
    data: {
      fee,
      warning,
      refundableAmount: Math.max(0, order.total - fee)
    }
  });
});

// @desc    Get order aggregates and report info
// @route   GET /api/orders/reports/aggregates
// @access  Private/Admin
const getOrderAggregates = asyncHandler(async (req, res) => {
  const aggregates = await Order.aggregate([
    {
      $group: {
        _id: null,
        totalSales: { $sum: '$total' },
        count: { $sum: 1 },
        avgOrderValue: { $avg: '$total' }
      }
    }
  ]);
  res.json({
    success: true,
    data: aggregates[0] || { totalSales: 0, count: 0, avgOrderValue: 0 }
  });
});

// @desc    Update roast stage of an order
// @route   PUT /api/orders/:id/roast-stage
// @access  Private/Admin
const updateRoastStage = asyncHandler(async (req, res) => {
  const { roastStage } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  order.roastStage = roastStage;
  order.orderEvents.push({
    status: `ROAST_STAGE_${roastStage.toUpperCase()}`,
    note: `Roast stage transitioned to ${roastStage}`,
    user: req.user._id
  });
  await order.save();

  res.json({
    success: true,
    message: `Roast stage updated to ${roastStage}`,
    data: order
  });
});

// @desc    Public order tracking
// @route   GET /api/orders/track/:id
// @access  Public
const trackOrderPublic = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  let order;
  if (mongoose.Types.ObjectId.isValid(id)) {
    order = await Order.findById(id).lean();
  }
  
  if (!order) {
    order = await Order.findOne({
      $or: [
        { orderNumber: id },
        { trackingNumber: id }
      ]
    }).lean();
  }

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found. Please check your order number or tracking ID.'
    });
  }

  // Mask sensitive PII for public access
  const maskedAddress = order.shippingAddress ? {
    ...order.shippingAddress,
    address: '*** (Hidden for privacy)',
    phone: '***-***-' + (order.shippingAddress.phone?.slice(-4) || '****'),
    email: '***@***.***'
  } : {};

  const safeOrderData = {
    _id: order._id,
    orderNumber: order.orderNumber,
    trackingNumber: order.trackingNumber,
    orderStatus: order.orderStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    paymentStatus: order.paymentStatus,
    trackingHistory: order.trackingHistory,
    estimatedDeliveryDate: order.estimatedDeliveryDate,
    shippingAddress: maskedAddress,
    createdAt: order.createdAt
  };

  res.json({
    success: true,
    data: safeOrderData
  });
});

export {
  createOrder,
  getUserOrders,
  getOrderById,
  getOrders,
  updateOrderStatus,
  calculateShippingCost,
  logAbandonedCheckout,
  getAbandonedCheckouts,
  generateOrderInvoice,
  validateCoupon,
  cancelOrder,
  getCancelOrderWarning,
  getOrderAggregates,
  updateRoastStage,
  trackOrderPublic
};
