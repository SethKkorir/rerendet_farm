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
import { getOrderConfirmationEmail, getOrderStatusEmail, getOrderAwaitingPaymentEmail, getPaymentReportReceivedCustomerEmail } from '../utils/emailTemplates.js';
import { sendLowStockAlert, sendNewOrderAwaitingPaymentAdminAlert, sendNewOrderAdminAlert, sendPaymentReportedAdminAlert, sendCustomerDeliveryConfirmationAdminAlert } from '../utils/adminNotificationService.js';
import { generateReceiptPDF } from '../utils/receiptGenerator.js';
import Coupon from '../models/Coupon.js';
import Subscription from '../models/Subscription.js';
import AbandonedCheckout from '../models/AbandonedCheckout.js';

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
  let session = null;
  let useTransaction = false;

  try {
    session = await mongoose.startSession();
    session.startTransaction();
    useTransaction = true;
  } catch (sessErr) {
    console.warn('⚠️ MongoDB transactions unavailable, continuing without transaction:', sessErr.message);
    if (session) {
      try { await session.endSession(); } catch (_) {}
      session = null;
    }
  }

  const sessionOpt = useTransaction && session ? { session } : {};

  const abortAndEnd = async () => {
    if (useTransaction && session) {
      try { await session.abortTransaction(); } catch (_) {}
      try { session.endSession(); } catch (_) {}
    }
  };

  try {
    const {
      idempotencyKey,
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
      useStoreCredit,
      appliedStoreCredit
    } = req.body;

    const userId = req.user._id;

    // STRICT ROLE SEPARATION: Administrators can never place customer orders
    const isPrivilegedAdmin = req.user.userType === 'admin' || ['admin', 'super-admin', 'super_admin', 'owner', 'fulfillment_staff'].includes(req.user.role);
    if (isPrivilegedAdmin) {
      await abortAndEnd();
      res.status(403);
      throw new Error('Administrator accounts cannot place customer orders. Please use a customer account.');
    }

    console.log('🛒 Creating order for user:', userId, 'IdempotencyKey:', idempotencyKey);
    console.log('📦 Order items:', items?.length);

    // ✅ IDEMPOTENCY: If client sends an idempotencyKey, return existing pending/paid order
    if (idempotencyKey) {
      const existingOrder = await Order.findOne({
        user: userId,
        idempotencyKey: idempotencyKey,
        paymentStatus: { $in: ['pending', 'paid'] }
      }, null, sessionOpt);

      if (existingOrder) {
        console.log(`🔁 Idempotent order match found: ${existingOrder.orderNumber}`);
        await abortAndEnd();
        return res.status(200).json({
          success: true,
          message: 'Existing order retrieved',
          data: existingOrder
        });
      }
    }

    // ✅ SECURITY: Sanitize shipping address to prevent XSS
    const sanitizedAddress = sanitizeObject(shippingAddress || {});
    sanitizedAddress.email = sanitizeEmail(shippingAddress?.email || req.user?.email);
    sanitizedAddress.phone = sanitizePhone(shippingAddress?.phone || req.user?.phone || '0700000000');
    sanitizedAddress.firstName = sanitizedAddress.firstName || req.user?.firstName || 'Valued';
    sanitizedAddress.lastName = sanitizedAddress.lastName || req.user?.lastName || 'Customer';
    sanitizedAddress.country = sanitizedAddress.country || 'Kenya';
    sanitizedAddress.address = sanitizedAddress.address || sanitizedAddress.street || sanitizedAddress.city || 'Standard Address';
    sanitizedAddress.city = sanitizedAddress.city || sanitizedAddress.town || sanitizedAddress.county || 'Nairobi';
    sanitizedAddress.county = sanitizedAddress.county || sanitizedAddress.city || 'Nairobi';
    sanitizedAddress.landmark = (sanitizedAddress.landmark || '').trim() ||
      (sanitizedAddress.deliveryInstructions || '').trim() ||
      sanitizedAddress.address ||
      sanitizedAddress.city ||
      'Standard delivery';

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.warn('⚠️ No items in order:', items);
      await abortAndEnd();
      return res.status(400).json({
        success: false,
        message: 'Order items are required'
      });
    }

    if (!paymentMethod) {
      console.warn('⚠️ Missing payment method');
      await abortAndEnd();
      return res.status(400).json({
        success: false,
        message: 'Payment method is required'
      });
    }

    // Check payment method availability against store settings
    try {
      const { default: Settings } = await import('../models/Settings.js');
      const storeSettings = await Settings.getSettings();
      if (paymentMethod === 'cod' && storeSettings?.payment?.paymentMethods?.cashOnDelivery === false) {
        await abortAndEnd();
        return res.status(400).json({
          success: false,
          message: 'Cash on delivery is currently disabled. Please select Paybill.'
        });
      }
      if (paymentMethod === 'paybill' && storeSettings?.payment?.paymentMethods?.mpesa === false) {
        await abortAndEnd();
        return res.status(400).json({
          success: false,
          message: 'M-Pesa payment is currently disabled. Please contact support.'
        });
      }
    } catch (e) {
      // Continue if settings lookup fails
    }

    if (!sanitizedAddress.email || !sanitizedAddress.phone) {
      console.warn('⚠️ Missing email or phone:', { email: sanitizedAddress.email, phone: sanitizedAddress.phone });
      await abortAndEnd();
      return res.status(400).json({
        success: false,
        message: 'Valid email and phone number are required'
      });
    }

    // Compact order number (e.g. RF-2841) and 4-digit tracking ID with collision check
    let orderNumber = `RF-${Math.floor(1000 + Math.random() * 9000)}`;
    for (let i = 0; i < 5; i++) {
      const exists = await Order.exists({ orderNumber });
      if (!exists) break;
      orderNumber = `RF-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    let trackingNumber = Math.floor(1000 + Math.random() * 9000).toString();
    for (let i = 0; i < 5; i++) {
      const exists = await Order.exists({ trackingNumber, orderStatus: { $ne: 'cancelled' }, fulfillmentStatus: { $ne: 'delivered' } });
      if (!exists) break;
      trackingNumber = Math.floor(1000 + Math.random() * 9000).toString();
    }

    // Process order items and validate stock
    let calculatedSubtotal = 0;
    const orderItems = [];
    const stockUpdates = [];

    for (const item of items) {
      if (!item.product) {
        console.warn('⚠️ Invalid item data (missing product ID):', item);
        await abortAndEnd();
        return res.status(400).json({
          success: false,
          message: 'Invalid item data. Product ID is required.'
        });
      }

      const product = await Product.findById(item.product, null, sessionOpt);

      if (!product) {
        console.warn('⚠️ Product not found:', { id: item.product, name: item.name });
        await abortAndEnd();
        return res.status(400).json({
          success: false,
          message: `Product not found: ${item.name || item.product}`
        });
      }

      const itemQuantity = Math.max(1, parseInt(item.quantity) || 1);
      const itemSize = (item.size || 'Standard').toString().trim();

      // Check stock availability (safely check if stock tracking is active)
      const currentAvail = typeof product.availableStock === 'number'
        ? product.availableStock
        : Math.max(0, (product.inventory?.physicalStock ?? 9999) - (product.inventory?.reservedStock ?? 0));

      if (product.inventory?.physicalStock !== undefined && product.inventory.physicalStock > 0 && currentAvail < itemQuantity) {
        console.warn('⚠️ Stock failure:', { product: product.name, available: currentAvail, requested: itemQuantity });
        await abortAndEnd();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for: ${product.name}`
        });
      }

      // Determine price
      let matchedPrice = null;
      if (Array.isArray(product.sizes) && product.sizes.length > 0) {
        const found = product.sizes.find(s => s.size && s.size.trim().toLowerCase() === itemSize.toLowerCase());
        if (found && typeof found.price === 'number') {
          matchedPrice = found.price;
        } else if (typeof product.sizes[0]?.price === 'number') {
          matchedPrice = product.sizes[0].price;
        }
      }
      if (matchedPrice === null) {
        matchedPrice = typeof product.price === 'number' ? product.price : (parseFloat(item.price) || 0);
      }

      const itemPrice = parseFloat(matchedPrice);
      const itemTotal = itemPrice * itemQuantity;
      calculatedSubtotal += itemTotal;

      const itemImage = item.image || product.images?.[0]?.url || '/default-product.jpg';

      orderItems.push({
        product: product._id,
        name: item.name || product.name,
        price: itemPrice,
        quantity: itemQuantity,
        size: itemSize,
        grind: item.grind || undefined,
        image: itemImage,
        itemTotal: itemTotal
      });

      stockUpdates.push({
        productId: product._id,
        quantity: itemQuantity,
        currentStock: currentAvail
      });
    }

    // ✅ DISCOUNT LOGIC
    let discount = 0;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true }, null, sessionOpt);
      if (coupon && coupon.isValid() && calculatedSubtotal >= coupon.minOrderAmount) {
        if (coupon.discountType === 'percentage') {
          discount = sanitizeAmount(calculatedSubtotal * (coupon.discountAmount / 100));
        } else {
          discount = sanitizeAmount(coupon.discountAmount);
        }
        // Increment use count
        coupon.usedCount += 1;
        await coupon.save(sessionOpt);
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
    const wantsStoreCredit = !!(useStoreCredit || appliedStoreCredit > 0 || req.body.applyStoreCredit);
    const userObj = await User.findById(userId, null, sessionOpt);
    let storeCreditApplied = 0;
    if (wantsStoreCredit && userObj && userObj.storeCreditBalance > 0) {
      const requestedCredit = typeof appliedStoreCredit === 'number' && appliedStoreCredit > 0
        ? Math.min(appliedStoreCredit, userObj.storeCreditBalance)
        : userObj.storeCreditBalance;
      storeCreditApplied = Math.min(requestedCredit, calculatedTotal);
    }
    const finalTotalAfterCredit = sanitizeAmount(calculatedTotal - storeCreditApplied);

    const clientTotal = sanitizeAmount(totalAmount);

    console.log('💰 Validating order amounts:', {
      itemsSubtotal: calculatedSubtotal,
      discount: discount,
      shipping: finalShippingCost,
      storeCreditApplied,
      totalBeforeCredit: calculatedTotal,
      totalAfterCredit: finalTotalAfterCredit,
      clientTotal
    });

    // Prevent price manipulation with generous tolerance (KES 100 or 10%)
    const priceDiff = Math.abs(finalTotalAfterCredit - clientTotal);
    const maxAllowedDiff = Math.max(100.0, finalTotalAfterCredit * 0.1);
    if (priceDiff > maxAllowedDiff) {
      await abortAndEnd();
      console.warn(`⚠️ Price mismatch: Client=${clientTotal}, Server=${finalTotalAfterCredit}, Diff=${priceDiff}`);
      return res.status(400).json({
        success: false,
        message: 'Order amount validation failed. Please refresh your cart.'
      });
    }

    const finalTotal = finalTotalAfterCredit;

    // Create order with granular status
    const order = new Order({
      orderNumber: orderNumber,
      trackingNumber: trackingNumber,
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
        country: sanitizedAddress.country,
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
      idempotencyKey: idempotencyKey || undefined,
      notes: notes || '',
      paymentExpiresAt: paymentMethod === 'paybill'
        ? new Date(Date.now() + (parseInt(process.env.PAYBILL_EXPIRY_HOURS, 10) || 24) * 60 * 60 * 1000)
        : undefined,

      // === NEW LIFECYCLE STATE ===
      orderStatus: 'open',
      paymentStatus: finalTotal === 0 ? 'paid' : 'pending',
      fulfillmentStatus: 'unfulfilled',
      roastStage: 'pending',

      // Initial History
      orderEvents: [
        {
          status: 'ORDER_CREATED',
          note: 'Order placed by customer via checkout',
          user: userId
        },
        {
          status: 'ORDER_CREATED',
          note: `Order initiated via ${paymentMethod}`,
          user: userId
        }
      ]
    });

    console.log('📝 Saving order to database...');

    const savedOrder = await order.save(sessionOpt);

    // Deduct Store Credit if applied
    if (storeCreditApplied > 0 && userObj) {
      userObj.storeCreditBalance = sanitizeAmount(userObj.storeCreditBalance - storeCreditApplied);
      await userObj.save(sessionOpt);

      const StoreCreditTransaction = (await import('../models/StoreCreditTransaction.js')).default;
      await StoreCreditTransaction.create([{
        user: userId,
        amount: -storeCreditApplied,
        type: 'purchase',
        balanceAfter: userObj.storeCreditBalance,
        description: `Applied store credit to order #${orderNumber}`,
        order: order._id
      }], sessionOpt);
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
      await userObj.save(sessionOpt);
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
      await subscription.save(sessionOpt);
    }

    // Update product stock (Atomic Reservation)
    for (const update of stockUpdates) {
      const baseProduct = await Product.findById(update.productId, null, sessionOpt);
      if (!baseProduct) continue;

      if (baseProduct.isBundle && Array.isArray(baseProduct.bundleDetails)) {
        for (const detail of baseProduct.bundleDetails) {
          const totalToIncrement = detail.quantity * update.quantity;
          await Product.findOneAndUpdate(
            { _id: detail.product },
            { $inc: { "inventory.reservedStock": totalToIncrement } },
            sessionOpt
          );
        }
      } else {
        const updatedProduct = await Product.findOneAndUpdate(
          { _id: update.productId },
          { $inc: { "inventory.reservedStock": update.quantity } },
          { ...sessionOpt, new: true }
        );

        if (updatedProduct && updatedProduct.inventory?.lowStockThreshold !== undefined) {
          if (updatedProduct.availableStock <= updatedProduct.inventory.lowStockThreshold) {
            sendLowStockAlert(updatedProduct).catch(console.error);
          }
        }
      }
    }

    // ✅ LOYALTY POINTS: Award 1 point per 100 KES of PRODUCT VALUE (Subtotal)
    try {
      const pointsEarned = Math.floor(finalSubtotal / 100);
      if (pointsEarned > 0 && userObj) {
        const updatedUserObj = await User.findByIdAndUpdate(userId, { $inc: { loyaltyPoints: pointsEarned } }, { ...sessionOpt, new: true });
        
        const LoyaltyTransaction = (await import('../models/LoyaltyTransaction.js')).default;
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 12);

        await LoyaltyTransaction.create([{
          user: userId,
          points: pointsEarned,
          type: 'earning',
          balanceAfter: updatedUserObj.loyaltyPoints,
          description: `Earned from order #${orderNumber}`,
          order: savedOrder._id,
          expiresAt
        }], sessionOpt);

        console.log(`✨ Awarded ${pointsEarned} loyalty points to user ${userId}`);
      }
    } catch (loyaltyError) {
      console.error('⚠️ Loyalty points error:', loyaltyError);
    }

    if (useTransaction && session) {
      await session.commitTransaction();
      session.endSession();
    }

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

    // Notification Dispatch logic
    try {
      let logoUrl;
      try {
        const { default: Settings } = await import('../models/Settings.js');
        const settings = await Settings.getSettings();
        logoUrl = settings?.store?.logo;
      } catch (e) {
        // ignore
      }

      if (savedOrder.paymentStatus === 'paid' || savedOrder.paymentMethod === 'cod') {
        // Cash on Delivery or fully paid immediate order: trigger confirmation email and admin alert
        try {
          sendNewOrderAdminAlert(savedOrder).catch(console.error);
        } catch (alertErr) {
          console.error('❌ Failed to trigger admin order alert:', alertErr.message);
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
      } else if (savedOrder.paymentMethod === 'paybill') {
        // Paybill orders: send "Order received, awaiting payment" instructions (NO receipt issued yet)
        try {
          sendNewOrderAwaitingPaymentAdminAlert(savedOrder).catch(console.error);
        } catch (alertErr) {
          console.error('❌ Failed to trigger awaiting payment admin alert:', alertErr.message);
        }

        const paybillNum = process.env.PAYBILL_NUMBER || '516600';
        const paybillAcc = process.env.PAYBILL_ACCOUNT || '934558';
        const whatsappNum = process.env.WHATSAPP_NUMBER || '254705684984';

        const awaitingHtml = getOrderAwaitingPaymentEmail(
          savedOrder.shippingAddress.firstName,
          savedOrder.orderNumber,
          orderItems,
          finalTotal,
          savedOrder.trackingNumber,
          logoUrl,
          savedOrder._id.toString(),
          paybillNum,
          paybillAcc,
          whatsappNum
        );

        await sendEmail({
          to: savedOrder.shippingAddress.email,
          subject: `Order Received (Awaiting Payment) - #${savedOrder.orderNumber}`,
          html: awaitingHtml
        });

        console.log(`📧 Awaiting payment instructions email sent to ${savedOrder.shippingAddress.email}`);
      } else {
        console.log(`⏳ Payment pending for order #${savedOrder.orderNumber}. Confirmation email deferred.`);
      }
    } catch (notifErr) {
      console.error('❌ Notification dispatch error:', notifErr.message);
    }

  } catch (error) {
    if (useTransaction && session) {
      try { await session.abortTransaction(); } catch (_) {}
      try { session.endSession(); } catch (_) {}
    }

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

  // Query by user ID OR user's registered email/phone to ensure past orders are never missed
  const userEmails = [req.user.email].filter(Boolean).map(e => e.trim().toLowerCase());
  const userPhones = [req.user.phone].filter(Boolean).map(p => p.trim());

  const userConditions = [{ user: userId }];
  if (userEmails.length > 0) {
    userConditions.push({ 'shippingAddress.email': { $in: userEmails.map(e => new RegExp(`^${e}$`, 'i')) } });
  }
  if (userPhones.length > 0) {
    userConditions.push({ 'shippingAddress.phone': { $in: userPhones } });
  }
  const userFilter = userConditions.length === 1 ? userConditions[0] : { $or: userConditions };

  try {
    const [ordersList, total] = await Promise.all([
      Order.find(userFilter)
        .select('orderNumber items total subtotal shippingCost discountAmount tax shippingAddress paymentMethod paymentStatus orderStatus fulfillmentStatus roastStage transactionId trackingNumber customerDeliveredConfirmed customerDeliveredConfirmedAt createdAt')
        .populate('items.product', 'name images price category')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(userFilter)
    ]);

    // Manually map virtual fields to preserve lean query performance
    const orders = ordersList.map(order => {
      let status = 'Confirmed';
      if (order.orderStatus === 'cancelled') status = 'Cancelled';
      else if (order.fulfillmentStatus === 'returned') status = 'Returned';
      else if (order.fulfillmentStatus === 'delivered') status = 'Delivered';
      else if (order.fulfillmentStatus === 'shipped') status = 'Shipped';
      else if (order.fulfillmentStatus === 'packed' || order.roastStage === 'packaged') status = 'Packed';
      else if (['roasting_in_progress', 'roast_scheduled', 'resting_quality_check'].includes(order.roastStage)) status = 'Roasting';
      else if (order.paymentStatus === 'paid') status = 'Processing';
      else if (order.paymentStatus === 'failed') status = 'Payment Failed';

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

    let status = 'Confirmed';
    if (order.orderStatus === 'cancelled') status = 'Cancelled';
    else if (order.fulfillmentStatus === 'returned') status = 'Returned';
    else if (order.fulfillmentStatus === 'delivered') status = 'Delivered';
    else if (order.fulfillmentStatus === 'shipped') status = 'Shipped';
    else if (order.fulfillmentStatus === 'packed' || order.roastStage === 'packaged') status = 'Packed';
    else if (['roasting_in_progress', 'roast_scheduled', 'resting_quality_check'].includes(order.roastStage)) status = 'Roasting';
    else if (order.paymentStatus === 'paid') status = 'Processing';
    else if (order.paymentStatus === 'failed') status = 'Payment Failed';

    const orderObj = order.toObject ? order.toObject() : { ...order };
    orderObj.status = status;

    res.json({
      success: true,
      data: orderObj
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

  // Server-Side Transition Validation Matrix
  if (paymentStatus && order.paymentStatus !== paymentStatus) {
    if (paymentStatus === 'refunded') {
      res.status(400);
      throw new Error('Refunding must be processed through the Initiate Refund action endpoint.');
    }
    if (!Order.validateTransition('paymentStatus', order.paymentStatus, paymentStatus)) {
      res.status(400);
      throw new Error(`Invalid payment status transition from '${order.paymentStatus}' to '${paymentStatus}'.`);
    }
  }

  if (fulfillmentStatus && order.fulfillmentStatus !== fulfillmentStatus) {
    if (!Order.validateTransition('fulfillmentStatus', order.fulfillmentStatus, fulfillmentStatus)) {
      res.status(400);
      throw new Error(`Invalid fulfillment status transition from '${order.fulfillmentStatus}' to '${fulfillmentStatus}'.`);
    }
  }

  if (orderStatus && order.orderStatus !== orderStatus) {
    if (!Order.validateTransition('orderStatus', order.orderStatus, orderStatus)) {
      res.status(400);
      throw new Error(`Invalid overall order status transition from '${order.orderStatus}' to '${orderStatus}'.`);
    }
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
  const { country = 'Kenya', county } = req.body;

  if (!country) {
    return res.status(400).json({
      success: false,
      message: 'Country is required'
    });
  }

  const isKenya = country.trim().toLowerCase() === 'kenya';
  if (isKenya && !county) {
    return res.status(400).json({
      success: false,
      message: 'County is required for delivery within Kenya'
    });
  }

  try {
    const { default: Settings } = await import('../models/Settings.js');
    const settings = await Settings.getSettings();
    const baseShippingPrice = settings?.payment?.shippingPrice ?? 500;

    let shippingCost = baseShippingPrice;
    let estimate = '1–2 business days';

    if (!isKenya) {
      const eastAfricanNeighbors = ['uganda', 'tanzania', 'rwanda', 'burundi', 'south sudan', 'ethiopia'];
      const isEastAfrica = eastAfricanNeighbors.includes(country.trim().toLowerCase());

      if (isEastAfrica) {
        shippingCost = 1200; // Regional East Africa Rate
        estimate = '3–5 business days (Regional Courier)';
      } else {
        shippingCost = 2500; // Worldwide International Air Express Rate
        estimate = '5–7 business days (DHL Express Worldwide)';
      }
    } else {
      // Check if admin has configured a custom county price
      const customRate = settings?.countyShipping?.find(
        item => item.county.toLowerCase() === (county || '').trim().toLowerCase()
      );

      if (customRate !== undefined && customRate !== null) {
        shippingCost = customRate.price;
        estimate = (county || '').toLowerCase() === 'nairobi' ? 'Same day / Next day' : '1–2 business days';
      } else {
        const { getShippingZone } = await import('../utils/kenyaLocations.js');
        const zone = getShippingZone(county);

        if (baseShippingPrice <= 50) {
          // Flat rate mode for nominal/promotional fees
          shippingCost = baseShippingPrice;
          estimate = '1–2 business days';
        } else {
          // Premium Adaptive Zone Scaling (relative to base standard fee)
          if (zone === 'Nairobi') {
            shippingCost = Math.max(0, baseShippingPrice - 300);
            estimate = 'Same day / Next day';
          } else if (zone === 'Metropolitan') {
            shippingCost = Math.max(0, baseShippingPrice - 150);
            estimate = '1–2 business days';
          } else if (zone === 'Major City') {
            shippingCost = Math.max(0, baseShippingPrice - 50);
            estimate = '1–2 business days';
          } else {
            // Rest of Kenya
            shippingCost = Math.max(0, baseShippingPrice + 100);
            estimate = '2–3 business days';
          }
        }
      }
    }

    res.json({
      success: true,
      data: {
        shippingCost,
        estimate,
        estimatedDays: estimate,
        country,
        county: isKenya ? county : undefined,
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

  // Validate cancellationReason gracefully
  let cancellationReason = req.body?.cancellationReason || req.body?.reason || 'changed_mind';
  let cancellationNote = req.body?.cancellationNote || req.body?.note || '';
  const allowedReasons = [
    'changed_mind',
    'wrong_size_selected',
    'found_better_price',
    'payment_issue',
    'ordered_by_mistake',
    'customer_portal_cancellation',
    'other'
  ];
  if (!allowedReasons.includes(cancellationReason)) {
    cancellationNote = cancellationNote || cancellationReason;
    cancellationReason = 'other';
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
    firstName: order.shippingAddress.firstName ? (order.shippingAddress.firstName[0] + '***') : 'Customer',
    lastName: '***',
    address: '*** (Protected for privacy)',
    landmark: '***',
    city: order.shippingAddress.city || '',
    county: order.shippingAddress.county || '',
    town: order.shippingAddress.town || '',
    country: order.shippingAddress.country || 'Kenya',
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
    paymentMethod: order.paymentMethod,
    paymentExpiresAt: order.paymentExpiresAt,
    paymentGraceExpiresAt: order.paymentGraceExpiresAt,
    paymentReporting: order.paymentReporting?.reported ? {
      reported: true,
      reportedAt: order.paymentReporting.reportedAt,
      customerPhone: order.paymentReporting.customerPhone ? ('***-***-' + order.paymentReporting.customerPhone.slice(-4)) : undefined
    } : undefined,
    paymentConfirmation: order.paymentConfirmation ? {
      confirmedAt: order.paymentConfirmation.confirmedAt,
      amountReceived: order.paymentConfirmation.amountReceived
    } : null,
    paymentConfirmations: Array.isArray(order.paymentConfirmations) ? order.paymentConfirmations.map(c => ({
      amountReceived: c.amountReceived,
      confirmedAt: c.confirmedAt,
      receiptNumber: c.receiptNumber
    })) : [],
    receipt: (order.receipt && order.receipt.receiptNumber && order.paymentStatus === 'paid') ? {
      receiptNumber: order.receipt.receiptNumber,
      issueDate: order.receipt.issueDate,
      paymentType: order.receipt.paymentType,
      hasReceipt: true
    } : null,
    items: order.items || [],
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee ?? order.shippingCost,
    total: order.total,
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

// @desc    Customer Reports Paybill Payment ("I've made the payment")
// @route   POST /api/orders/:id/report-payment
// @access  Public (Order ID or Order Number)
const reportPayment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { mpesaCode, customerPhone, notes } = req.body;

  let order;
  if (mongoose.Types.ObjectId.isValid(id)) {
    order = await Order.findById(id);
  }
  if (!order) {
    order = await Order.findOne({ orderNumber: id });
  }

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found.'
    });
  }

  if (order.paymentMethod !== 'paybill') {
    return res.status(400).json({
      success: false,
      message: 'Payment reporting is only applicable to M-Pesa Paybill orders.'
    });
  }

  if (order.orderStatus === 'cancelled' || order.paymentStatus === 'expired') {
    return res.status(400).json({
      success: false,
      message: 'This order has expired or been cancelled. Payment cannot be reported.'
    });
  }

  if (order.paymentStatus === 'paid') {
    return res.status(400).json({
      success: false,
      message: 'Payment for this order has already been verified and confirmed.'
    });
  }

  const cleanCode = (mpesaCode || '').trim().toUpperCase();
  if (!cleanCode) {
    return res.status(400).json({
      success: false,
      message: 'M-Pesa confirmation code is required to report payment.'
    });
  }
  const cleanPhone = (customerPhone || order.shippingAddress?.phone || '').trim();
  const cleanNotes = (notes || '').trim();

  // Check if reporting was already sent recently (avoid spam notifications)
  const isDuplicateReport = order.paymentReporting?.reported &&
    order.paymentReporting.mpesaCode === cleanCode &&
    order.paymentReporting.reportedAt &&
    (Date.now() - new Date(order.paymentReporting.reportedAt).getTime()) < 5 * 60 * 1000;

  const prevReportCount = order.paymentReporting?.reportedCount || 0;

  // Extend review grace window so background expiry job does not cancel during admin review
  const graceHours = parseInt(process.env.PAYMENT_REVIEW_GRACE_HOURS || process.env.PAYBILL_EXPIRY_GRACE_HOURS, 10) || 24;
  const newGraceExpiresAt = new Date(Date.now() + graceHours * 60 * 60 * 1000);

  order.paymentReporting = {
    reported: true,
    reportedAt: new Date(),
    mpesaCode: cleanCode || (order.paymentReporting?.mpesaCode || ''),
    customerPhone: cleanPhone,
    notes: cleanNotes,
    reportedCount: prevReportCount + 1
  };

  order.paymentGraceExpiresAt = newGraceExpiresAt;

  // Update status to payment_reported if still pending
  if (order.paymentStatus === 'pending') {
    order.paymentStatus = 'payment_reported';
  }

  order.orderEvents.push({
    status: 'PAYMENT_REPORTED',
    note: `Customer reported payment. M-Pesa Code: ${cleanCode || 'Not provided'}. Phone: ${cleanPhone}`,
    timestamp: new Date()
  });

  await order.save();

  // Notifications (only if not a repeated rapid re-click)
  if (!isDuplicateReport) {
    try {
      // 1. Notify Admin Verification Queue
      sendPaymentReportedAdminAlert(order, cleanCode).catch(err =>
        console.error('Failed to send admin payment reported alert:', err.message)
      );

      // 2. Notify Customer of Report Received (Acknowledgement only, NO receipt issued yet)
      const customerEmail = order.shippingAddress?.email || order.user?.email;
      const customerName = order.shippingAddress?.firstName || order.user?.firstName || 'Valued Customer';

      if (customerEmail) {
        let logoUrl;
        try {
          const settings = await Settings.getSettings();
          logoUrl = settings?.store?.logo;
        } catch (_) {}

        const emailHtml = getPaymentReportReceivedCustomerEmail(
          customerName,
          order.orderNumber,
          cleanCode,
          logoUrl,
          order._id,
          order.trackingNumber
        );

        sendEmail({
          to: customerEmail,
          subject: `Payment Report Received: Order #${order.orderNumber} - Rerendet Coffee`,
          html: emailHtml
        }).catch(err => console.error('Failed to send payment report customer email:', err.message));
      }
    } catch (notifErr) {
      console.error('Error dispatching payment report notifications:', notifErr);
    }
  }

  res.json({
    success: true,
    message: 'Payment report received. Our finance team will verify the transaction against our bank records shortly.',
    data: {
      paymentStatus: order.paymentStatus,
      paymentReporting: order.paymentReporting,
      paymentGraceExpiresAt: order.paymentGraceExpiresAt
    }
  });
});

// @desc    Customer confirms package received / delivery completed
// @route   POST /api/orders/:id/confirm-delivery
// @access  Protected or Public with order identifier
const confirmDeliveryCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let order;
  if (mongoose.Types.ObjectId.isValid(id)) {
    order = await Order.findById(id).populate('user', 'firstName lastName email phone role');
  }
  if (!order) {
    order = await Order.findOne({
      $or: [
        { orderNumber: id },
        { trackingNumber: id }
      ]
    }).populate('user', 'firstName lastName email phone role');
  }

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found.'
    });
  }

  // Security check: if req.user exists and is not admin, verify ownership
  if (req.user && req.user.role !== 'admin' && order.user) {
    const orderUserId = order.user._id ? order.user._id.toString() : order.user.toString();
    if (orderUserId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to confirm delivery for this order.'
      });
    }
  }

  if (order.orderStatus === 'cancelled') {
    return res.status(400).json({
      success: false,
      message: 'This order was cancelled and cannot be marked as delivered.'
    });
  }

  // Already confirmed
  if (order.fulfillmentStatus === 'delivered' && order.customerDeliveredConfirmed) {
    return res.json({
      success: true,
      message: 'Package arrival was already confirmed. Thank you!',
      data: order
    });
  }

  // Update order delivery status
  order.fulfillmentStatus = 'delivered';
  order.customerDeliveredConfirmed = true;
  order.customerDeliveredConfirmedAt = new Date();

  // Audit trail
  order.orderEvents.push({
    status: 'DELIVERED',
    note: 'Delivery confirmed received by customer.',
    user: req.user?._id || order.user?._id || undefined,
    timestamp: new Date()
  });

  const city = order.shippingAddress?.city || 'Delivery Address';
  order.trackingHistory.push({
    status: 'delivered',
    location: city,
    message: 'Package arrived & verified received by customer.',
    timestamp: new Date()
  });

  await order.save();

  // Trigger admin email alert
  try {
    sendCustomerDeliveryConfirmationAdminAlert(order).catch(console.error);
  } catch (alertErr) {
    console.error('❌ Failed to trigger delivery confirmation admin alert:', alertErr.message);
  }

  res.json({
    success: true,
    message: 'Thank you for confirming! We hope you love your coffee.',
    data: {
      _id: order._id,
      orderNumber: order.orderNumber,
      trackingNumber: order.trackingNumber,
      fulfillmentStatus: order.fulfillmentStatus,
      customerDeliveredConfirmed: order.customerDeliveredConfirmed,
      customerDeliveredConfirmedAt: order.customerDeliveredConfirmedAt
    }
  });
});

// @desc    Download Official Digital Payment Receipt (PDF)
// @route   GET /api/orders/:id/receipt
// @access  Protected (Order Customer or Admin)
const downloadOrderReceipt = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let order;
  if (mongoose.Types.ObjectId.isValid(id)) {
    order = await Order.findById(id).populate('user', 'firstName lastName email');
  }
  if (!order) {
    order = await Order.findOne({ orderNumber: id }).populate('user', 'firstName lastName email');
  }

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found.'
    });
  }

  // Security check: Must be the customer who placed the order OR an admin
  const isOwner = req.user && order.user && order.user._id.toString() === req.user._id.toString();
  const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'super-admin');

  if (!isOwner && !isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized: You do not have permission to view or download this payment receipt.'
    });
  }

  // Verification check: Receipt is strictly issued ONLY once payment is confirmed by administrator
  const hasVerifiedPayment = (order.paymentStatus === 'paid' || order.paymentStatus === 'partially_paid') &&
    order.receipt && order.receipt.receiptNumber;

  if (!hasVerifiedPayment) {
    return res.status(400).json({
      success: false,
      message: 'Payment receipt is only generated after an administrator verifies payment.'
    });
  }

  await generateReceiptPDF(order, res);
});

// @desc    Validate Cart Items and Stock Server-Side
// @route   POST /api/orders/validate-cart
// @access  Public
const validateCart = asyncHandler(async (req, res) => {
  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.json({
      success: true,
      isValid: true,
      hasIssues: false,
      items: [],
      subtotal: 0
    });
  }

  let serverSubtotal = 0;
  let hasIssues = false;
  const validatedItems = [];

  for (const item of items) {
    const product = await Product.findById(item.product || item._id);

    if (!product || product.status === 'archived') {
      hasIssues = true;
      validatedItems.push({
        ...item,
        isUnavailable: true,
        availableStock: 0,
        issueMessage: `"${item.name || 'Item'}" is no longer available.`
      });
      continue;
    }

    const availableStock = product.availableStock !== undefined ? product.availableStock : (product.inventory?.quantity || 0);
    const sizeConfig = product.sizes?.find(s => s.size === item.size);
    const currentPrice = sizeConfig?.price || product.price || item.price;
    const requestedQuantity = parseInt(item.quantity) || 1;

    let isOutOfStock = false;
    let isLowStock = false;
    let priceChanged = false;
    let issueMessage = null;

    if (availableStock <= 0 || product.inStock === false) {
      isOutOfStock = true;
      hasIssues = true;
      issueMessage = `"${product.name}" is currently out of stock.`;

      try {
        const { createAlert } = await import('../models/AdminAlert.js');
        await createAlert(
          'warning',
          'low_stock',
          `🚨 Out of Stock Cart Removal: Item "${product.name}" is out of stock (Available: ${availableStock}) and was auto-purged from customer cart.`,
          { productId: product._id }
        );
      } catch (err) {
        console.warn('AdminAlert cart validation warning:', err.message);
      }
    } else if (availableStock < requestedQuantity) {
      isLowStock = true;
      hasIssues = true;
      issueMessage = `Only ${availableStock} left in stock for "${product.name}".`;
    }

    if (item.price && Math.abs(item.price - currentPrice) > 0.01) {
      priceChanged = true;
      issueMessage = `Price for "${product.name}" updated to KSh ${currentPrice.toLocaleString()}.`;
    }

    const itemTotal = currentPrice * (isOutOfStock ? 0 : requestedQuantity);
    if (!isOutOfStock) {
      serverSubtotal += itemTotal;
    }

    validatedItems.push({
      product: product._id,
      name: product.name,
      image: product.images?.[0]?.url || item.image || '/default-product.jpg',
      size: item.size || 'Standard',
      price: currentPrice,
      quantity: requestedQuantity,
      availableStock,
      isOutOfStock,
      isLowStock,
      priceChanged,
      issueMessage,
      itemTotal
    });
  }

  res.json({
    success: true,
    isValid: !hasIssues,
    hasIssues,
    items: validatedItems,
    subtotal: serverSubtotal
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
  trackOrderPublic,
  reportPayment,
  confirmDeliveryCustomer,
  downloadOrderReceipt,
  validateCart
};
