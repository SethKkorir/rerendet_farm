// controllers/orderController.js - ENHANCED WITH SECURITY
import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
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
      subscriptionFrequency
    } = req.body;

    const userId = req.user._id;

    // ✅ RELAXED SECURITY: Allow Admins to place orders for testing flow
    /*
    if (req.user.userType === 'admin' || req.user.role === 'admin' || req.user.role === 'super-admin') {
      console.warn('🚫 Admin attempted to create order:', req.user.email);
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        success: false,
        message: 'Administrators are not allowed to place orders. Please use a regular customer account.'
      });
    }
    */

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

      // Check stock availability
      if (product.inventory.stock < item.quantity) {
        console.warn('⚠️ Stock failure:', { product: product.name, available: product.inventory.stock, requested: item.quantity });
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.inventory.stock}, Requested: ${item.quantity}`
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
        currentStock: product.inventory.stock
      });
    }

    // ✅ DISCOUNT LOGIC
    let discount = 0;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
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
    const clientTotal = sanitizeAmount(totalAmount);

    console.log('💰 Validating order amounts:', {
      itemsSubtotal: calculatedSubtotal,
      discount: discount,
      shipping: finalShippingCost,
      total: calculatedTotal
    });

    // Prevent price manipulation (tolerance: KES 2)
    if (Math.abs(calculatedTotal - clientTotal) > 2.0) {
      await session.abortTransaction();
      session.endSession();
      console.warn(`⚠️ Price mismatch: Client=${clientTotal}, Server=${calculatedTotal}, Discount=${discount}`);
      return res.status(400).json({
        success: false,
        message: 'Order amount validation failed. Please refresh your cart.'
      });
    }

    const finalTotal = calculatedTotal;

    console.log('✅ Order amounts validated:', {
      subtotal: finalSubtotal,
      shipping: finalShippingCost,
      total: finalTotal
    });

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
        postalCode: sanitizedAddress.postalCode || ''
      },
      subtotal: finalSubtotal,
      shippingCost: finalShippingCost,
      tax: finalTax,
      discountAmount: discount,
      total: finalTotal,
      couponCode: couponCode ? couponCode.toUpperCase() : undefined,
      isSubscription: isSubscription || false,
      subscriptionFrequency: subscriptionFrequency,

      // Metadata
      paymentMethod: paymentMethod,
      notes: notes || '',

      // === NEW LIFECYCLE STATE ===
      orderStatus: 'open', // Default open
      paymentStatus: 'pending', // Always start as pending regardless of method (except specialized flows)
      fulfillmentStatus: 'unfulfilled',

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

    // Update product stock (Atomic Reservation)
    for (const update of stockUpdates) {
      // Find the product being updated
      const baseProduct = await Product.findById(update.productId).session(session);

      if (baseProduct.isBundle) {
        // Decrement from kids if it's a bundle
        for (const detail of baseProduct.bundleDetails) {
          const totalToDecrement = detail.quantity * update.quantity;

          const updatedChild = await Product.findOneAndUpdate(
            { _id: detail.product, "inventory.stock": { $gte: totalToDecrement } },
            { $inc: { "inventory.stock": -totalToDecrement } },
            { session, new: true }
          );

          if (!updatedChild) {
            throw new Error(`Insufficient stock for bundle component: ${detail.product}`);
          }
        }
      } else {
        // Standard Atomic Update for single product
        const updatedProduct = await Product.findOneAndUpdate(
          { _id: update.productId, "inventory.stock": { $gte: update.quantity } },
          { $inc: { "inventory.stock": -update.quantity } },
          { session, new: true }
        );

        if (!updatedProduct) {
          throw new Error(`Insufficient stock for product: ${baseProduct.name}`);
        }

        // Automatic inStock sync
        if (updatedProduct.inventory.stock <= 0) {
          await Product.updateOne({ _id: update.productId }, { $set: { inStock: false } }, { session });
        }

        // Low Stock Alert
        if (updatedProduct.inventory.stock <= updatedProduct.inventory.lowStockAlert) {
          sendLowStockAlert(updatedProduct).catch(console.error);
        }
      }
    }

    // ✅ LOYALTY POINTS: Award 1 point per 100 KES of PRODUCT VALUE (Subtotal)
    try {
      const pointsEarned = Math.floor(finalSubtotal / 100);
      if (pointsEarned > 0) {
        await User.findByIdAndUpdate(userId, { $inc: { loyaltyPoints: pointsEarned } }, { session });
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

    // Send order confirmation email only if paid or Cash on Delivery
    if (savedOrder.paymentStatus === 'paid' || savedOrder.paymentMethod === 'cod') {
      try {
        const dashboardUrl = `${process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://rerendet-farm.vercel.app' : 'http://localhost:3000')}/account/orders/${savedOrder._id}`;

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

    order.fulfillmentStatus = fulfillmentStatus;
    const fulfillmentLabel = STATUS_LABELS[fulfillmentStatus] || fulfillmentStatus;
    changes.push(`Fulfillment status updated to ${fulfillmentLabel}`);

    // Auto-update event log
    order.orderEvents.push({
      status: 'FULFILLMENT_UPDATE',
      note: `Fulfillment status changed to ${fulfillmentLabel} by admin`,
      user: req.user._id
    });
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

// @desc    Cancel order (Self-service for user before shipping)
// @route   POST /api/orders/:id/cancel
// @access  Private
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Ensure user owns order
  if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to cancel this order');
  }

  if (order.orderStatus === 'cancelled') {
    res.status(400);
    throw new Error('Order is already cancelled');
  }

  // Strictly enforce cancellation ONLY before shipping or packed statuses
  if (['packed', 'shipped', 'delivered', 'returned'].includes(order.fulfillmentStatus)) {
    res.status(400);
    throw new Error(`Cannot cancel order because fulfillment status is already '${order.fulfillmentStatus}'`);
  }

  // Update order status to cancelled
  order.orderStatus = 'cancelled';
  order.orderEvents.push({
    status: 'CANCELLED',
    note: 'Cancelled by customer (Self-Service Dashboard)',
    user: req.user._id
  });
  await order.save();

  // Replenish stock atomically!
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { 'inventory.stock': item.quantity },
      $set: { inStock: true }
    });
  }

  res.json({
    success: true,
    message: 'Order cancelled successfully and inventory replenished',
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
  trackOrderPublic
};
