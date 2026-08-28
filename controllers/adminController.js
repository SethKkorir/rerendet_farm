// controllers/adminController.js - COMPLETELY REWRITTEN WITH FORM DATA FIXES
import asyncHandler from 'express-async-handler';
import moment from 'moment';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Contact from '../models/Contact.js';
import Settings from '../models/Settings.js';
import { logActivity } from '../utils/activityLogger.js';
import ActivityLog from '../models/ActivityLog.js'; // For fetching logs later
import PaymentTransaction from '../models/PaymentTransaction.js';
import mongoose from 'mongoose';
import sendEmail from '../utils/sendEmail.js';
import { getMaintenanceEmail, getMaintenanceResolvedEmail, getOrderStatusEmail } from '../utils/emailTemplates.js';
import nodemailer from 'nodemailer';
import axios from 'axios';
import { invalidateCatalog, redisClient, isRedisConnected } from '../config/redis.js';
import { emailQueue, subscriptionQueue, retryQueue } from '../queues/index.js';
import SystemHealthLog from '../models/SystemHealthLog.js';
// Optimization: Simple in-memory cache for dashboard stats
let statsCache = {
  data: null,
  lastUpdated: 0,
  ttl: 5 * 60 * 1000 // 5 minutes
};

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard/stats
// @access  Private/Admin
const getDashboardStats = asyncHandler(async (req, res) => {
  const { timeframe = '30d', force = false } = req.query;
  
  // Return cached data if available and not expired
  if (!force && statsCache.data && (Date.now() - statsCache.lastUpdated < statsCache.ttl)) {
    return res.json({
      success: true,
      data: statsCache.data,
      cached: true,
      lastUpdated: new Date(statsCache.lastUpdated)
    });
  }

  const today = new Date();
  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  let startDate;
  switch (timeframe) {
    case '7d':
      startDate = new Date(new Date().setDate(today.getDate() - 7));
      break;
    case '90d':
      startDate = new Date(new Date().setDate(today.getDate() - 90));
      break;
    case '1y':
      startDate = new Date(new Date().setFullYear(today.getFullYear() - 1));
      break;
    case 'all':
      startDate = new Date(0); // Beginning of time
      break;
    case '30d':
    default:
      startDate = new Date(new Date().setDate(today.getDate() - 30));
  }

  const [
    totalOrders,
    totalRawCarts,
    totalProducts,
    totalUsers,
    totalRevenueResult,
    todayOrders,
    todayRevenueResult,
    recentOrders,
    lowStockProducts,
    pendingCount,
    newUsersThisMonth,
    shippedOrders
  ] = await Promise.all([
    Order.countDocuments({ paymentStatus: 'paid' }).lean(),
    Order.countDocuments().lean(),
    Product.countDocuments({ isActive: true }).lean(),
    User.countDocuments({ userType: 'customer' }).lean(),
    Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]),
    Order.countDocuments({ paymentStatus: 'paid', createdAt: { $gte: startOfToday } }).lean(),
    Order.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          createdAt: { $gte: startOfToday }
        }
      },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]),
    Order.find()
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    Product.find({
      isActive: true,
      $or: [
        { 'inventory.stock': { $lte: 10 } },
        { stock: { $lte: 10 } }
      ]
    }).limit(10).lean(),
    Order.countDocuments({ paymentStatus: 'pending' }).lean(),
    User.countDocuments({ userType: 'customer', createdAt: { $gte: startOfMonth } }).lean(),
    Order.countDocuments({ fulfillmentStatus: 'shipped' }).lean()
  ]);

  const totalRevenue = totalRevenueResult[0]?.total || 0;
  const todayRevenue = todayRevenueResult[0]?.total || 0;

  const resultData = {
    overview: {
      totalOrders,
      totalRawCarts,
      totalProducts,
      totalUsers,
      totalRevenue,
      todayOrders,
      todayRevenue,
      pendingOrders: pendingCount,
      newUsersThisMonth,
      shippedOrders
    },
    recentOrders,
    lowStockProducts
  };

  // Update cache
  statsCache = {
    data: resultData,
    lastUpdated: Date.now(),
    ttl: 5 * 60 * 1000
  };

  res.json({
    success: true,
    data: resultData
  });
});

// @desc    Get all orders
// @route   GET /api/admin/orders
// @access  Private/Admin
const getOrders = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    paymentStatus,
    fulfillmentStatus,
    status, // Support legacy/backward compat if needed
    search,
    startDate,
    endDate
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  let filter = {};

  // 1. Fulfillment Status Filter
  const effectiveFulfillmentStatus = fulfillmentStatus || status;
  if (effectiveFulfillmentStatus && effectiveFulfillmentStatus !== 'all') {
    filter.fulfillmentStatus = effectiveFulfillmentStatus;
  }

  // 2. Payment Status Filter
  if (paymentStatus && paymentStatus !== 'all') {
    filter.paymentStatus = paymentStatus;
  }

  // 3. Date Range Filter
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
    // Remove if empty
    if (Object.keys(filter.createdAt).length === 0) delete filter.createdAt;
  }

  // 4. Search Filter (Order #, Name, Email, Phone, Tracking #)
  if (search) {
    filter.$or = [
      { orderNumber: { $regex: search, $options: 'i' } },
      { trackingNumber: { $regex: search, $options: 'i' } },
      { 'shippingAddress.firstName': { $regex: search, $options: 'i' } },
      { 'shippingAddress.lastName': { $regex: search, $options: 'i' } },
      { 'shippingAddress.email': { $regex: search, $options: 'i' } },
      { 'shippingAddress.phone': { $regex: search, $options: 'i' } }
    ];
  }

  try {
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('user', 'firstName lastName email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Order.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          current: parseInt(page),
          page: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('❌ Fetch Admin Orders Error:', error);
    res.status(500);
    throw new Error('Failed to fetch orders: ' + error.message);
  }
});

// @desc    Get order details
// @route   GET /api/admin/orders/:id
// @access  Private/Admin
const getOrderDetail = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'firstName lastName email phone address')
    .populate('items.product');

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  res.json({
    success: true,
    data: order
  });
});

// @desc    Update order status
// @route   PUT /api/admin/orders/:id/status
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

  // Status Label Map for better UX
  const STATUS_LABELS = {
    unfulfilled: 'Confirmed',
    packed: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    returned: 'Returned'
  };

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

  const changes = [];

  // Update logic
  if (paymentStatus && order.paymentStatus !== paymentStatus) {
    order.paymentStatus = paymentStatus;
    changes.push(`Payment: ${paymentStatus}`);
    order.orderEvents.push({
      status: 'PAYMENT_UPDATE',
      note: `Payment status changed to ${paymentStatus} by admin`,
      user: req.user._id
    });
  }

  if (fulfillmentStatus && order.fulfillmentStatus !== fulfillmentStatus) {
    order.fulfillmentStatus = fulfillmentStatus;
    const label = STATUS_LABELS[fulfillmentStatus] || fulfillmentStatus;
    changes.push(`Fulfillment: ${label}`);
    order.orderEvents.push({
      status: 'FULFILLMENT_UPDATE',
      note: `Fulfillment status changed to ${label} by admin`,
      user: req.user._id
    });
  }

  if (orderStatus && order.orderStatus !== orderStatus) {
    order.orderStatus = orderStatus;
    changes.push(`Lifecycle: ${orderStatus}`);
    order.orderEvents.push({
      status: 'ORDER_UPDATE',
      note: `Order status changed to ${orderStatus} by admin`,
      user: req.user._id
    });
  }

  if (trackingNumber) order.trackingNumber = trackingNumber;
  if (adminNotes) order.notes = adminNotes;

  if (changes.length > 0) {
    order.statusUpdatedAt = new Date();

    // Legacy tracking history support
    const rawFulfill = fulfillmentStatus || order.fulfillmentStatus;
    const historyStatus = STATUS_LABELS[rawFulfill] || rawFulfill;

    order.trackingHistory.push({
      status: historyStatus.toLowerCase(),
      location: location || '',
      message: message || changes.join('. '),
      timestamp: new Date()
    });

    await order.save();
    await order.populate('user', 'firstName lastName email');

    // Send Email
    if ((fulfillmentStatus && ['shipped', 'delivered', 'returned'].includes(fulfillmentStatus)) || message) {
      try {
        const settings = await Settings.getSettings();
        const logoUrl = settings?.store?.logo;

        const emailStatus = STATUS_LABELS[rawFulfill] || rawFulfill;
        const emailHtml = getOrderStatusEmail(
          order.user.firstName,
          order.orderNumber,
          emailStatus,
          order.trackingNumber,
          message || `Your order status is now ${emailStatus}.`,
          logoUrl,
          order._id.toString()
        );

        await sendEmail({
          to: order.user.email,
          subject: `Order Update: ${emailStatus} - #${order.orderNumber}`,
          html: emailHtml
        });
      } catch (err) {
        console.error('❌ Admin Status Email Error:', err.message);
      }
    }

    await logActivity(req, 'ORDER_STATUS_UPDATE', `Updated order #${order.orderNumber}: ${changes.join(', ')}`, order._id);
  }

  res.json({
    success: true,
    message: 'Order status updated successfully',
    data: order
  });
});

// @desc    Get all products - FIXED VERSION
// @route   GET /api/admin/products
// @access  Private/Admin
const getProducts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, category, search, lowStock } = req.query;
  const skip = (page - 1) * limit;

  // Start with isActive filter and build from there
  let filter = { isActive: true };

  if (category && category !== 'all') {
    if (mongoose.Types.ObjectId.isValid(category)) {
      filter.categoryId = category;
    } else {
      const cat = await Category.findOne({ slug: category });
      if (cat) {
        filter.categoryId = cat._id;
      } else {
        filter.categoryId = new mongoose.Types.ObjectId();
      }
    }
  }

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  if (lowStock === 'true') {
    filter['inventory.stock'] = { $lte: 10 };
  }

  const products = await Product.find(filter)
    .populate('categoryId')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Product.countDocuments(filter);
  const categories = await Category.find({ isDeleted: { $ne: true } });

  res.json({
    success: true,
    data: {
      products,
      categories: categories.map(c => c.slug),
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    }
  });
});

// @desc    Create product - COMPLETELY REWRITTEN WITH FORM DATA SUPPORT & NO TRANSACTIONS (Vercel Safe)
// @route   POST /api/admin/products
// @access  Private/Admin
const createProduct = asyncHandler(async (req, res) => {
  // Check if data is coming as FormData with JSON (from frontend)
  let requestBody = { ...req.body };

  if (req.body.data) {
    try {
      const jsonData = JSON.parse(req.body.data);
      requestBody = { ...requestBody, ...jsonData };
    } catch (error) {
      res.status(400);
      throw new Error('Invalid data format');
    }
  }

  const {
    name,
    description,
    sizes,
    category,
    categoryId,
    categoryAttributes,
    roastLevel,
    origin,
    flavorNotes,
    badge,
    material,
    brand,
    capacity,
    inventory,
    tags,
    isFeatured
  } = requestBody;

  // Validate required fields
  if (!name || !description || !sizes) {
    res.status(400);
    throw new Error('Please fill in all required fields: name, description, sizes');
  }

  let targetCategoryId = categoryId;
  if (!targetCategoryId && category) {
    const foundCategory = await Category.findOne({
      $or: [
        { slug: category },
        { name: new RegExp('^' + category + '$', 'i') }
      ]
    });
    if (foundCategory) {
      targetCategoryId = foundCategory._id.toString();
    }
  }

  if (!targetCategoryId) {
    res.status(400);
    throw new Error('Category ID is required');
  }

  const dbCategory = await Category.findById(targetCategoryId);
  if (!dbCategory) {
    res.status(404);
    throw new Error('Category not found');
  }

  let parsedCategoryAttributes = {};
  if (categoryAttributes) {
    try {
      if (typeof categoryAttributes === 'string') {
        parsedCategoryAttributes = JSON.parse(categoryAttributes);
      } else if (typeof categoryAttributes === 'object') {
        parsedCategoryAttributes = categoryAttributes;
      }
    } catch (e) {
      res.status(400);
      throw new Error('Invalid categoryAttributes format');
    }
  }

  // Validate required properties in category's attributeSchema
  const missingAttributes = [];
  for (const attr of dbCategory.attributeSchema) {
    const val = parsedCategoryAttributes[attr.key];
    if (attr.required && (val === undefined || val === null || val === '')) {
      missingAttributes.push(attr.label || attr.key);
    }
  }

  if (missingAttributes.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Validation failed: Missing required category attributes: ${missingAttributes.join(', ')}`,
      missingAttributes
    });
  }

  // Parse sizes - handle both string and array formats
  let parsedSizes;
  try {
    if (typeof sizes === 'string') {
      parsedSizes = JSON.parse(sizes);
    } else if (Array.isArray(sizes)) {
      parsedSizes = sizes;
    } else {
      throw new Error('Invalid sizes format');
    }
  } catch (error) {
    res.status(400);
    throw new Error('Invalid sizes format: ' + error.message);
  }

  // Validate sizes have valid prices
  const validatedSizes = parsedSizes.map((size, index) => {
    const price = parseFloat(size.price);
    if (isNaN(price) || price <= 0) {
      throw new Error(`Invalid price for size ${size.size} at position ${index + 1}`);
    }
    return {
      size: size.size,
      price: price
    };
  });

  // Handle images from uploaded files
  const images = req.files ? req.files.map(file => ({
    public_id: file.filename,
    url: file.path
  })) : [];

  // Parse and validate inventory
  let stock = 0;
  let lowStockAlert = 5;

  if (inventory) {
    try {
      if (typeof inventory === 'string') {
        const parsedInventory = JSON.parse(inventory);
        stock = parseInt(parsedInventory.stock) || 0;
        lowStockAlert = parseInt(parsedInventory.lowStockAlert) || 5;
      } else if (typeof inventory === 'object') {
        stock = parseInt(inventory.stock) || 0;
        lowStockAlert = parseInt(inventory.lowStockAlert) || 5;
      }
    } catch (e) {
      // If it's not JSON, try parsing it as a simple number (old behavior)
      stock = parseInt(inventory) || 0;
    }
  }

  if (isNaN(stock) || stock < 0) {
    res.status(400);
    throw new Error('Invalid stock quantity');
  }

  // Parse flavor notes
  let parsedFlavorNotes = [];
  if (flavorNotes) {
    try {
      if (typeof flavorNotes === 'string') {
        // Try parsing as JSON first (if sent as JSON.stringify)
        if (flavorNotes.startsWith('[') || flavorNotes.startsWith('{')) {
          parsedFlavorNotes = JSON.parse(flavorNotes);
        } else {
          // Fallback to comma-separated string
          parsedFlavorNotes = flavorNotes.split(',').map(note => note.trim()).filter(note => note);
        }
      } else if (Array.isArray(flavorNotes)) {
        parsedFlavorNotes = flavorNotes;
      }
    } catch (e) {
      // Final fallback
      parsedFlavorNotes = typeof flavorNotes === 'string' ?
        flavorNotes.split(',').map(note => note.trim()).filter(note => note) : [];
    }
  }

  // Parse tags
  let parsedTags = [];
  if (tags) {
    try {
      if (typeof tags === 'string') {
        if (tags.startsWith('[') || tags.startsWith('{')) {
          parsedTags = JSON.parse(tags);
        } else {
          parsedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        }
      } else if (Array.isArray(tags)) {
        parsedTags = tags;
      }
    } catch (e) {
      parsedTags = typeof tags === 'string' ?
        tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    }
  }

  // Parse isFeatured
  const parsedIsFeatured = isFeatured === 'true' || isFeatured === true;

  // Create product data
  const productData = {
    name: name.toString().trim(),
    description: description.toString().trim(),
    sizes: validatedSizes,
    images: images.filter(img => img.url),
    categoryId: dbCategory._id,
    categoryAttributes: parsedCategoryAttributes,
    roastLevel: roastLevel?.toString() || parsedCategoryAttributes['roastLevel']?.toString() || undefined,
    origin: origin?.toString().trim() || parsedCategoryAttributes['origin']?.toString().trim() || '',
    flavorNotes: parsedFlavorNotes,
    badge: badge?.toString().trim() || '',
    material: material?.toString().trim() || undefined,
    brand: brand?.toString().trim() || undefined,
    capacity: capacity?.toString().trim() || undefined,
    inventory: {
      physicalStock: stock,
      lowStockThreshold: lowStockAlert
    },
    tags: parsedTags,
    isFeatured: parsedIsFeatured,
    isActive: true
  };

  try {
    const product = new Product(productData);
    const createdProduct = await product.save();
    
    // Invalidate product catalog cache
    await invalidateCatalog();

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: createdProduct
    });

  } catch (error) {
    // Log detailed error for debugging
    console.error('❌ Product creation error:', error);

    // Check for Duplicate Key Error (E11000)
    if (error.code === 11000) {
      res.status(400);
      const field = Object.keys(error.keyPattern)[0];
      const value = error.keyValue[field];
      throw new Error(`A product with this ${field.split('.').pop()} ("${value}") already exists. Please use a unique name.`);
    }

    // Check if it's a validation error
    if (error.name === 'ValidationError') {
      res.status(400);
      const messages = Object.values(error.errors).map(val => val.message);
      throw new Error(messages.join(', '));
    }

    res.status(500);
    throw new Error('Failed to create product: ' + error.message);
  }
});

// @desc    Update product - UPDATED WITH FORM DATA SUPPORT
// @route   PUT /api/admin/products/:id
// @access  Private/Admin
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  // Check if data is coming as FormData with JSON
  let requestBody = { ...req.body };

  if (req.body.data) {
    try {
      const jsonData = JSON.parse(req.body.data);
      requestBody = { ...requestBody, ...jsonData };
    } catch (error) {
      res.status(400);
      throw new Error('Invalid data format');
    }
  }

  const {
    name,
    description,
    sizes,
    category,
    categoryId,
    categoryAttributes,
    roastLevel,
    origin,
    flavorNotes,
    badge,
    material,
    brand,
    capacity,
    inventory,
    tags,
    isFeatured,
    isActive
  } = requestBody;

  if (name !== undefined) product.name = name.toString().trim();
  if (description !== undefined) product.description = description.toString().trim();

  let activeCategoryId = categoryId || product.categoryId;
  if (!categoryId && category) {
    const foundCategory = await Category.findOne({
      $or: [
        { slug: category },
        { name: new RegExp('^' + category + '$', 'i') }
      ]
    });
    if (foundCategory) {
      activeCategoryId = foundCategory._id;
    }
  }

  if (activeCategoryId) {
    const dbCategory = await Category.findById(activeCategoryId);
    if (!dbCategory) {
      res.status(404);
      throw new Error('Category not found');
    }

    product.categoryId = dbCategory._id;

    let parsedCategoryAttributes = product.categoryAttributes ? Object.fromEntries(product.categoryAttributes) : {};
    if (categoryAttributes !== undefined) {
      try {
        if (typeof categoryAttributes === 'string') {
          parsedCategoryAttributes = JSON.parse(categoryAttributes);
        } else if (typeof categoryAttributes === 'object') {
          parsedCategoryAttributes = categoryAttributes;
        }
      } catch (e) {
        res.status(400);
        throw new Error('Invalid categoryAttributes format');
      }
    }

    // Validate attributes
    const missingAttributes = [];
    for (const attr of dbCategory.attributeSchema) {
      const val = parsedCategoryAttributes[attr.key];
      if (attr.required && (val === undefined || val === null || val === '')) {
        missingAttributes.push(attr.label || attr.key);
      }
    }

    if (missingAttributes.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Validation failed: Missing required category attributes: ${missingAttributes.join(', ')}`,
        missingAttributes
      });
    }

    product.categoryAttributes = parsedCategoryAttributes;
  }

  if (material !== undefined) product.material = material?.toString().trim() || undefined;
  if (brand !== undefined) product.brand = brand?.toString().trim() || undefined;
  if (capacity !== undefined) product.capacity = capacity?.toString().trim() || undefined;

  if (roastLevel !== undefined) {
    product.roastLevel = roastLevel.toString();
  } else if (product.categoryAttributes && product.categoryAttributes.get('roastLevel')) {
    product.roastLevel = product.categoryAttributes.get('roastLevel').toString();
  }

  if (origin !== undefined) {
    product.origin = origin.toString().trim();
  } else if (product.categoryAttributes && product.categoryAttributes.get('origin')) {
    product.origin = product.categoryAttributes.get('origin').toString().trim();
  }
  if (badge !== undefined) product.badge = badge.toString().trim();

  if (isFeatured !== undefined) {
    product.isFeatured = isFeatured === 'true' || isFeatured === true;
  }

  if (isActive !== undefined) {
    product.isActive = isActive === 'true' || isActive === true;
  }

  // Update sizes with validation
  if (sizes) {
    let parsedSizes;
    try {
      if (typeof sizes === 'string') {
        parsedSizes = JSON.parse(sizes);
      } else if (Array.isArray(sizes)) {
        parsedSizes = sizes;
      } else {
        throw new Error('Invalid sizes format');
      }

      // Validate sizes
      const validatedSizes = parsedSizes.map(size => {
        const price = parseFloat(size.price);
        if (isNaN(price) || price <= 0) {
          throw new Error(`Invalid price for size ${size.size}`);
        }
        return {
          size: size.size,
          price: price
        };
      });

      if (validatedSizes.length > 0) {
        product.sizes = validatedSizes;
      }
    } catch (error) {
      res.status(400);
      throw new Error('Invalid sizes format: ' + error.message);
    }
  }

  // Update inventory with validation
  if (inventory) {
    let stock = product.inventory.physicalStock;
    let lowStockAlert = product.inventory.lowStockThreshold;

    try {
       let invObj = inventory;
       if (typeof inventory === 'string') {
         invObj = JSON.parse(inventory);
       }

       if (typeof invObj === 'object') {
         if (invObj.physicalStock !== undefined) {
           stock = parseInt(invObj.physicalStock);
           if (isNaN(stock) || stock < 0) {
             res.status(400);
             throw new Error('Invalid physical stock quantity');
           }
         }
         if (invObj.lowStockThreshold !== undefined) {
           lowStockAlert = parseInt(invObj.lowStockThreshold);
           if (isNaN(lowStockAlert) || lowStockAlert < 0) {
             res.status(400);
             throw new Error('Invalid low stock threshold value');
           }
         }
       }
    } catch (e) {
       if (res.statusCode !== 400) {
         res.status(400);
         throw new Error('Invalid inventory format');
       }
       throw e;
    }

    product.inventory = {
      physicalStock: stock,
      lowStockThreshold: lowStockAlert,
      reservedStock: product.inventory.reservedStock || 0
    };
  }

  // Update arrays
  if (flavorNotes !== undefined) {
    if (typeof flavorNotes === 'string') {
      product.flavorNotes = flavorNotes.split(',').map(note => note.trim()).filter(note => note);
    } else if (Array.isArray(flavorNotes)) {
      product.flavorNotes = flavorNotes;
    }
  }

  if (tags !== undefined) {
    if (typeof tags === 'string') {
      product.tags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    } else if (Array.isArray(tags)) {
      product.tags = tags;
    }
  }

  // Add new images
  if (req.files && req.files.length > 0) {
    const newImages = req.files.map(file => ({
      public_id: file.filename,
      url: file.path
    }));
    product.images = [...product.images, ...newImages];
  }

  const updatedProduct = await product.save();

  // Invalidate product catalog cache
  await invalidateCatalog();

  res.json({
    success: true,
    message: 'Product updated successfully',
    data: updatedProduct
  });
});

const updateProductStock = asyncHandler(async (req, res) => {
  console.log('📦 [STOCK_UPDATE_HIT]', { id: req.params.id, body: req.body });
  const product = await Product.findById(req.params.id);
  if (!product) {
    console.error('❌ [STOCK_UPDATE_ERROR] Product not found:', req.params.id);
    res.status(404);
    throw new Error('Product not found');
  }

  const { physicalStock, lowStockThreshold, adjustment, mode } = req.body;

  if (mode === 'adjust' && adjustment !== undefined) {
    const delta = parseInt(adjustment);
    if (isNaN(delta)) { res.status(400); throw new Error('Invalid adjustment value'); }
    product.inventory.physicalStock = Math.max(0, (product.inventory.physicalStock || 0) + delta);
  } else if (physicalStock !== undefined) {
    const newStock = parseInt(physicalStock);
    if (isNaN(newStock) || newStock < 0) { res.status(400); throw new Error('Invalid physical stock value'); }
    product.inventory.physicalStock = newStock;
  }

  if (lowStockThreshold !== undefined) {
    const alert = parseInt(lowStockThreshold);
    if (!isNaN(alert) && alert >= 0) product.inventory.lowStockThreshold = alert;
  }

  product.inStock = product.availableStock > 0;
  const updated = await product.save();

  // Invalidate product catalog cache
  await invalidateCatalog();

  console.log(`📦 Stock updated: ${product.name} → ${product.inventory.physicalStock} units`);

  res.json({
    success: true,
    message: `Stock updated to ${updated.inventory.physicalStock} units`,
    data: { 
      physicalStock: updated.inventory.physicalStock, 
      reservedStock: updated.inventory.reservedStock, 
      availableStock: updated.availableStock, 
      lowStockThreshold: updated.inventory.lowStockThreshold, 
      inStock: updated.inStock 
    }
  });
});

// @desc    Delete product - FIXED VERSION
// @route   DELETE /api/admin/products/:id
// @access  Private/Admin
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  // Soft delete - set isActive to false
  product.isActive = false;
  await product.save();
  
  // Invalidate product catalog cache
  await invalidateCatalog();

  res.json({
    success: true,
    message: 'Product deleted successfully'
  });
});

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, role } = req.query;
  const skip = (page - 1) * limit;

  let filter = {};

  if (role && role !== 'all') {
    filter.userType = role;
  }

  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const users = await User.find(filter)
    .select('-password -verificationCode -verificationCodeExpires -resetPasswordToken -resetPasswordExpires -twoFactorCode +lockUntil +loginAttempts')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await User.countDocuments(filter);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    }
  });
});

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
// @access  Private/Admin
const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;

  // STRICT LEAST-PRIVILEGE: Only Super Admin can change user roles
  if (req.user.role !== 'super-admin') {
    // Log unauthorized role escalation attempt
    await logActivity(req, 'UPDATE_ROLE', `UNAUTHORIZED ATTEMPT to promote ${req.params.id} to ${role}`, req.user._id, {
      attemptedRole: role,
      targetUserId: req.params.id,
      ip: req.ip,
      email: req.user.email,
      severity: 'HIGH_RISK_ACTION'
    });

    console.warn(`🚨 [ROLE ESCALATION ATTEMPT] Admin ${req.user.email} attempted unauthorized role update to ${role} on user ${req.params.id}!`);
    res.status(403);
    throw new Error('Access Denied: Only Super Admin is authorized to change user roles.');
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const oldRole = user.role;
  user.role = role;

  // Also update userType based on role to ensure authentication logic works correctly
  if (role === 'admin' || role === 'super-admin') {
    user.userType = 'admin';
  } else if (role === 'customer') {
    user.userType = 'customer';
  }

  await user.save();

  // Dispatch Security Alert on Role Change
  if (oldRole !== role) {
    import('../utils/securityAlerts.js').then(({ dispatchSecurityAlert }) => {
      dispatchSecurityAlert({
        eventTitle: 'User Role Changed',
        eventDescription: `User **${user.email}** had their role updated from **${oldRole}** to **${role}** by admin **${req.user.email}**.`,
        ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAccount: user.email,
        severity: 'WARNING',
        metadata: {
          'Old Role': oldRole,
          'New Role': role,
          'Admin Actor': req.user.email
        }
      });
    }).catch(e => console.error('Alert error:', e));
  }

  // Log successful role change (this triggers HIGH_RISK_ACTIONS alerting because action is 'UPDATE_ROLE')
  await logActivity(req, 'UPDATE_ROLE', `Role updated for ${user.email} from ${oldRole} to ${role}`, user._id, {
    oldRole,
    newRole: role,
    actor: req.user.email
  });

  res.json({
    success: true,
    message: `User role updated to ${role} successfully`,
    data: user
  });
});

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Prevent deleting self
  if (user._id.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error('You cannot delete your own admin account');
  }

  await user.deleteOne();

  // Log the activity
  logActivity(req, 'DELETE_USER', user.email, user._id);

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
});

// @desc    Get all contacts
// @route   GET /api/admin/contacts
// @access  Private/Admin
const getContacts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const skip = (page - 1) * limit;

  let filter = {};
  if (status && status !== 'all') {
    filter.status = status;
  }

  const contacts = await Contact.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Contact.countDocuments(filter);

  res.json({
    success: true,
    data: {
      contacts,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    }
  });
});

// @desc    Update contact status
// @route   PUT /api/admin/contacts/:id/status
// @access  Private/Admin
const updateContactStatus = asyncHandler(async (req, res) => {
  const { status, adminResponse } = req.body;



  const contact = await Contact.findByIdAndUpdate(
    req.params.id,
    {
      status,
      ...(adminResponse && { adminResponse }),
      respondedAt: new Date()
    },
    { new: true }
  );

  if (!contact) {
    res.status(404);
    throw new Error('Contact submission not found');
  }

  // Send email response if status is 'replied' and we have a response body
  if (status === 'replied' && adminResponse) {
    try {

      await sendEmail({
        to: contact.email,
        subject: `Re: ${contact.subject} - Rerendet Coffee Support`,
        html: `
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #6F4E37;">Rerendet Coffee</h2>
            </div>
            
            <div style="background: #ffffff; padding: 25px; border-radius: 8px; border: 1px solid #e0e0e0;">
              <p>Dear ${contact.name},</p>
              
              <p>Thank you for contacting us. We have received your message regarding "<strong>${contact.subject}</strong>".</p>
              
              <div style="margin: 20px 0; padding: 15px; background: #f9f9f9; border-left: 4px solid #6F4E37; border-radius: 4px;">
                <p style="margin: 0; font-weight: bold; color: #555;">Our Response:</p>
                <p style="margin-top: 8px; white-space: pre-wrap;">${adminResponse}</p>
              </div>

              <p>If you have any further questions, please simply reply to this email.</p>
              
              <p style="margin-top: 30px; font-size: 14px; color: #777;">
                Best regards,<br>
                The Rerendet Coffee Team
              </p>
            </div>
            
            <div style="margin-top: 20px; font-size: 12px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 10px;">
              <p>Original Message selected on ${new Date(contact.createdAt).toLocaleDateString()}:</p>
              <p><em>"${contact.message}"</em></p>
            </div>
          </div>
        `
      });

    } catch (emailError) {
      console.error('❌ Failed to send admin response email:', emailError);
      // We don't fail the request, but we log the error
    }
  }

  // Log the activity
  logActivity(req, 'UPDATE_CONTACT_STATUS', contact.subject, contact._id, { status: contact.status });

  res.json({
    success: true,
    message: 'Contact status updated successfully',
    data: contact
  });
});

// @desc    Delete contact
// @route   DELETE /api/admin/contacts/:id
// @access  Private/Admin
const deleteContact = asyncHandler(async (req, res) => {
  const contact = await Contact.findById(req.params.id);

  if (!contact) {
    res.status(404);
    throw new Error('Contact not found');
  }

  await contact.deleteOne();

  // Log the activity
  logActivity(req, 'DELETE_CONTACT', contact.subject, contact._id, { email: contact.email });

  res.json({
    success: true,
    message: 'Contact deleted successfully'
  });
});

// @desc    Get settings
// @route   GET /api/admin/settings
// @access  Private/Admin
const getSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne();

  if (!settings) {
    settings = new Settings();
    await settings.save();
  }

  res.json({
    success: true,
    data: settings
  });
});

// @desc    Update settings
// @route   PUT /api/admin/settings
// @access  Private/Admin
const updateSettings = asyncHandler(async (req, res) => {
  // Fetch current settings BEFORE update to compare maintenance state
  const currentSettings = await Settings.findOne();
  const wasMaintenance = currentSettings?.maintenance?.enabled || false;
  const isMaintenanceNow = req.body.maintenance?.enabled === true || req.body.maintenance?.enabled === 'true';

  const updatedSettings = await Settings.findOneAndUpdate(
    {},
    { $set: req.body },
    {
      new: true,
      upsert: true,
      runValidators: true
    }
  );

    // Dynamic dynamic administrator downtime email alert
    const notifyAdminsDowntime = async () => {
      try {
        if (isMaintenanceNow) {
          const admins = await User.find({ role: { $in: ['admin', 'super-admin'] } }).select('email firstName');
          console.log(`🛡️ [Cybersecurity Security Alert] Dispatching automatic downtime notifications to ${admins.length} administrators...`);
          await Promise.allSettled(admins.map(admin =>
            sendEmail({
              to: admin.email,
              subject: '⚠️ Alert: Rerendet Coffee Downtime Activated',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #ef4444; border-radius: 12px; background-color: #ffffff;">
                  <h2 style="color: #ef4444; margin: 0 0 10px;">⚠️ Authoritative Downtime Event Alert</h2>
                  <p style="font-size: 15px; color: #333;">Hello ${admin.firstName},</p>
                  <p style="font-size: 14px; color: #555;">This is an automated security broadcast. Rerendet Coffee has been put into <strong>Maintenance Mode / Downtime</strong> successfully.</p>
                  <p style="font-size: 14px; color: #555; padding: 10px; background-color: #fef2f2; border-left: 4px solid #ef4444;">
                    <strong>Status:</strong> Active Downtime Blocked
                  </p>
                  <p style="font-size: 13px; color: #888; margin-top: 25px;">Logged under security compliance audit trails.</p>
                </div>
              `
            })
          ));
        }
      } catch (err) {
        console.error('❌ Failed to email admins downtime notification:', err.message);
      }
    };

    // Asynchronous email notification logic (Fire and Forget)
    const notifyCustomers = async () => {
      try {
        if (isMaintenanceNow && !wasMaintenance) {
          // Maintenance STARTED

          const customers = await User.find({ userType: 'customer' }).select('email firstName');



          // Send in parallel batches of 10 to avoid overwhelming SMTP
          const batchSize = 10;
          for (let i = 0; i < customers.length; i += batchSize) {
            const batch = customers.slice(i, i + batchSize);
            await Promise.all(batch.map(customer =>
              sendEmail({
                to: customer.email,
                subject: 'Scheduled Maintenance - Rerendet Coffee',
                html: getMaintenanceEmail(req.body.maintenance.message || currentSettings.maintenance.message, currentSettings.store?.logo)
              }).catch(err => console.error(`Failed to send to ${customer.email}`, err.message))
            ));
          }

        } else if (!isMaintenanceNow && wasMaintenance) {
          // Maintenance ENDED

          const customers = await User.find({ userType: 'customer' }).select('email firstName');



          // Send in parallel batches of 10
          const batchSize = 10;
          for (let i = 0; i < customers.length; i += batchSize) {
            const batch = customers.slice(i, i + batchSize);
            await Promise.all(batch.map(customer =>
              sendEmail({
                to: customer.email,
                subject: 'We are Back Online! - Rerendet Coffee',
                html: getMaintenanceResolvedEmail(currentSettings.store?.logo)
              }).catch(err => console.error(`Failed to send to ${customer.email}`, err.message))
            ));
          }
        }
      } catch (error) {
        console.error('❌ Error in maintenance notification job:', error);
      }
    };

    // Execute functionality strictly after response or async
    notifyCustomers();
    notifyAdminsDowntime();

  res.json({
    success: true,
    message: 'Settings updated successfully',
    data: updatedSettings
  });
});

// @desc    Get sales analytics
// @route   GET /api/admin/analytics/sales
// @access  Private/Admin
const getSalesAnalytics = asyncHandler(async (req, res) => {
  const timeframe = req.query.period || req.query.timeframe || '30d';
  const now = new Date();
  let startDate;

  switch (timeframe) {
    case '7d': startDate = moment().subtract(7, 'days').toDate(); break;
    case '90d': startDate = moment().subtract(90, 'days').toDate(); break;
    case '1y': startDate = moment().subtract(1, 'year').toDate(); break;
    case 'all': startDate = new Date('2020-01-01'); break;
    case '30d':
    default: startDate = moment().subtract(30, 'days').toDate();
  }
  startDate.setHours(0, 0, 0, 0);

  const periodMs = now - startDate;
  const prevStart = new Date(startDate.getTime() - periodMs);

  // 1. Parallel Aggregations
  const [
    mainStats,
    dailySales,
    categoryData,
    topProducts,
    customerSales,
    fulfillmentData,
    prevStats,
    newCustCount,
    prevNewCustCount
  ] = await Promise.all([
    // Core Stats
    Order.aggregate([
      { $match: { createdAt: { $gte: startDate }, paymentStatus: 'paid' } },
      { $group: { _id: null, totalRevenue: { $sum: '$total' }, totalOrders: { $sum: 1 }, productsSold: { $sum: { $size: '$items' } } } }
    ]),
    // Daily Timeline
    Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, total: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$total', 0] } }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]),
    // Category Dist
    Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $unwind: '$items' },
      { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'prod' } },
      { $unwind: '$prod' },
      { $group: { _id: '$prod.category', count: { $sum: '$items.quantity' } } }
    ]),
    // Top Products
    Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.name', sales: { $sum: '$items.quantity' }, revenue: { $sum: '$items.itemTotal' } } },
      { $sort: { sales: -1 } },
      { $limit: 8 },
      { $project: { name: '$_id', sales: 1, revenue: 1, _id: 0 } }
    ]),
    // Top Customers
    Order.aggregate([
      { $match: { createdAt: { $gte: startDate }, paymentStatus: 'paid' } },
      { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'u' } },
      { $unwind: '$u' },
      { $group: { _id: '$user', name: { $first: { $concat: ['$u.firstName', ' ', '$u.lastName'] } }, orders: { $sum: 1 }, spent: { $sum: '$total' } } },
      { $sort: { spent: -1 } },
      { $limit: 8 }
    ]),
    // Fulfillment
    Order.aggregate([
      { $group: { _id: '$fulfillmentStatus', count: { $sum: 1 } } }
    ]),
    // Prev Stats for trend
    Order.aggregate([
      { $match: { createdAt: { $gte: prevStart, $lt: startDate }, paymentStatus: 'paid' } },
      { $group: { _id: null, totalRevenue: { $sum: '$total' }, totalOrders: { $sum: 1 } } }
    ]),
    // Customer Trends
    User.countDocuments({ createdAt: { $gte: startDate }, userType: 'customer' }),
    User.countDocuments({ createdAt: { $gte: prevStart, $lt: startDate }, userType: 'customer' })
  ]);

  const stats = mainStats[0] || { totalRevenue: 0, totalOrders: 0, productsSold: 0 };
  const pStats = prevStats[0] || { totalRevenue: 0, totalOrders: 0 };

  const getTrend = (cur, prev) => {
    if (prev <= 0) return cur > 0 ? 100 : 0;
    return Number(((cur - prev) / prev * 100).toFixed(1));
  };

  const labelMap = { unfulfilled: 'Confirmed', packed: 'Processing', shipped: 'Shipped', delivered: 'Delivered', returned: 'Returned' };
  const fTotal = fulfillmentData.reduce((s, f) => s + f.count, 0) || 1;

  res.json({
    success: true,
    data: {
      salesData: dailySales,
      categoryDistribution: categoryData.map(c => ({ name: c._id, value: Math.round((c.count / (stats.productsSold || 1)) * 100) })),
      fulfillmentBreakdown: fulfillmentData.map(f => ({ name: labelMap[f._id] || 'Confirmed', value: Math.round((f.count / fTotal) * 100) })),
      topProducts,
      topCustomers: customerSales.map(c => ({ name: c.name || 'Customer', orders: c.orders, spent: c.spent })),
      totalRevenue: stats.totalRevenue,
      totalOrders: stats.totalOrders,
      productsSold: stats.productsSold,
      activeCustomers: customerSales.length,
      averageOrderValue: stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0,
      revenueTrend: getTrend(stats.totalRevenue, pStats.totalRevenue),
      ordersTrend: getTrend(stats.totalOrders, pStats.totalOrders),
      customersTrend: getTrend(newCustCount, prevNewCustCount),
      productsTrend: 0
    }
  });
});

// @desc    Get system activity logs
// @route   GET /api/admin/logs
// @access  Private/Admin (Super Admin only recommended)
const getActivityLogs = asyncHandler(async (req, res) => {
  const pageSize = 20;
  const page = Number(req.query.pageNumber) || 1;

  const count = await ActivityLog.countDocuments({});
  const logs = await ActivityLog.find({})
    .populate('admin', 'firstName lastName email role')
    .sort({ createdAt: -1 })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  res.json({
    success: true,
    data: logs,
    page,
    pages: Math.ceil(count / pageSize)
  });
});

// @desc    Test email configuration
// @route   POST /api/admin/settings/test-email
// @access  Private/Admin
const testEmailConfig = asyncHandler(async (req, res) => {
  const config = req.body;

  try {
    console.log('🧪 Testing SMTP configuration...', config.host);

    if (!config.host || !config.auth?.user || !config.auth?.pass) {
      return res.status(400).json({
        success: false,
        message: 'Missing SMTP configuration fields'
      });
    }

    // Create a temporary transporter
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port || 587,
      secure: config.secure || false,
      auth: {
        user: config.auth.user,
        pass: config.auth.pass,
      },
      connectionTimeout: 5000 // 5 seconds timeout
    });

    // Verify connection
    await transporter.verify();

    console.log('✅ SMTP Connection Successful!');
    res.json({
      success: true,
      message: 'Connection successful!'
    });

  } catch (error) {
    // console.error('❌ SMTP Connection failed:', error.message);
    res.status(400).json({
      success: false,
      message: 'Connection failed: ' + error.message,
      error: error.message
    });
  }
});

// @desc    Check for new orders
// @route   GET /api/admin/orders/status
// @access  Private/Admin
const checkNewOrders = asyncHandler(async (req, res) => {
  // console.log('📡 [Polling] Checking for new orders...'); // Uncomment to debug polling
  const latestOrder = await Order.findOne().sort({ createdAt: -1 }).select('_id orderNumber createdAt total user');
  const count = await Order.countDocuments();

  res.json({
    success: true,
    data: {
      count,
      latestOrder: latestOrder ? {
        id: latestOrder._id,
        orderNumber: latestOrder.orderNumber,
        createdAt: latestOrder.createdAt,
        total: latestOrder.total,
        user: latestOrder.user // ID only
      } : null
    }
  });
});

// @desc    Reply to a contact message (sends email + marks as replied)
// @route   POST /api/admin/contacts/:id/reply
// @access  Private/Admin
const replyContact = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    res.status(400); throw new Error('Reply message is required');
  }

  const contact = await Contact.findById(req.params.id);
  if (!contact) { res.status(404); throw new Error('Contact not found'); }

  // Send email reply
  try {
    await sendEmail({
      to: contact.email,
      subject: `Re: ${contact.subject} — Rerendet Coffee Support`,
      html: `
        <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333">
          <h2 style="color:#6F4E37;margin-bottom:4px">Rerendet Coffee</h2>
          <p style="color:#999;font-size:13px;margin-top:0">Support Team</p>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
          <p>Dear ${contact.name},</p>
          <p>Thank you for reaching out about <strong>"${contact.subject}"</strong>. Here is our response:</p>
          <div style="margin:20px 0;padding:16px 20px;background:#faf9f6;border-left:4px solid #D4AF37;border-radius:4px">
            <p style="margin:0;white-space:pre-wrap;line-height:1.6">${message}</p>
          </div>
          <p>If you have any further questions, feel free to reply to this email.</p>
          <p style="margin-top:32px;font-size:13px;color:#777">
            Best regards,<br/>
            <strong>The Rerendet Coffee Team</strong>
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
          <p style="font-size:11px;color:#aaa">
            Original message sent on ${new Date(contact.createdAt).toLocaleDateString('en-KE')}:<br/>
            <em>"${contact.message}"</em>
          </p>
        </div>
      `
    });
  } catch (emailErr) {
    console.error('❌ Failed to send reply email:', emailErr.message);
    // Don't block — still mark as replied in DB
  }

  contact.status = 'replied';
  contact.adminResponse = message;
  contact.respondedAt = new Date();
  if (!contact.firstAdminReplyAt) {
    contact.firstAdminReplyAt = new Date();
  }
  await contact.save();

  logActivity(req, 'REPLY_CONTACT', contact.subject, contact._id, { to: contact.email });

  res.json({ success: true, message: 'Reply sent successfully', data: contact });
});

// @desc    Toggle user active/inactive status
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
const toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) { res.status(404); throw new Error('User not found'); }

  // Prevent deactivating yourself
  if (user._id.toString() === req.user._id.toString()) {
    res.status(400); throw new Error('You cannot deactivate your own account');
  }

  user.isActive = !user.isActive;
  await user.save();

  logActivity(req, 'TOGGLE_USER_STATUS', user.email, user._id, { isActive: user.isActive });

  res.json({
    success: true,
    message: `User account ${user.isActive ? 'activated' : 'deactivated'} successfully`,
    data: { _id: user._id, email: user.email, isActive: user.isActive }
  });
});

// @desc    Reset user security (MFA or Phone)
// @route   PATCH /api/admin/users/:id/security-reset
// @access  Private/Admin
const resetUserSecurity = asyncHandler(async (req, res) => {
  const { type } = req.body;
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (type === 'mfa') {
    user.twoFactorEnabled = false;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    
    // If we ever add TOTP secrets, clear them here too
    // user.twoFactorSecret = undefined; 
  } else if (type === 'phone') {
    user.phone = null;
  } else {
    res.status(400);
    throw new Error('Invalid reset type');
  }

  // Save changes
  await user.save({ validateBeforeSave: false });

  // Log the activity for auditing
  await logActivity(req, 'SECURITY_RESET', user.email, user._id, { 
    type,
    affectedUser: user.email 
  });

  res.json({
    success: true,
    message: `${type === 'mfa' ? 'Two-Factor Authentication' : 'Recovery phone'} has been reset for this user.`,
    data: user
  });
});

// @desc    Get quick admin overview (for header/sidebar badges)
// @route   GET /api/admin/overview
// @access  Private/Admin
const getAdminOverview = asyncHandler(async (req, res) => {
  const [
    pendingOrders,
    lowStockCount,
    unreadContacts,
    totalUsers
  ] = await Promise.all([
    Order.countDocuments({ paymentStatus: 'pending' }),
    Product.countDocuments({ 'inventory.stock': { $lte: 10 }, isActive: true }),
    Contact.countDocuments({ status: 'new' }),
    User.countDocuments({ userType: 'customer' })
  ]);

  res.json({
    success: true,
    data: { pendingOrders, lowStockCount, unreadContacts, totalUsers }
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// EXTENDED REPORTS — Abandoned Carts, Refunds, Customers, Low Stock, Coupons
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Get abandoned cart report
// @route   GET /api/admin/reports/abandoned-carts
// @access  Private/Admin
const getAbandonedCartsReport = asyncHandler(async (req, res) => {
  const AbandonedCheckout = (await import('../models/AbandonedCheckout.js').catch(() => null))?.default;

  // If no AbandonedCheckout model exists, derive from orders with pending payment
  const pendingOrders = await Order.find({ paymentStatus: 'pending', orderStatus: 'open' })
    .populate({ path: 'user', select: 'firstName lastName email' })
    .lean();

  const totalOrders = await Order.countDocuments({});
  const totalPaid = await Order.countDocuments({ paymentStatus: 'paid' });
  const abandonedCount = pendingOrders.length;
  const abandonedRevenue = pendingOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const cartAbandonmentRate = totalOrders > 0 ? Number(((abandonedCount / totalOrders) * 100).toFixed(1)) : 0;

  // Group by day
  const dailyMap = {};
  for (const o of pendingOrders) {
    try {
      const key = new Date(o.createdAt).toISOString().split('T')[0];
      if (!dailyMap[key]) dailyMap[key] = { date: key, count: 0, value: 0 };
      dailyMap[key].count += 1;
      dailyMap[key].value += Number(o.total) || 0;
    } catch { }
  }
  const dailyAbandoned = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  // Recent 10 abandoned
  const recentAbandoned = pendingOrders.slice(0, 10).map(o => ({
    orderId: o._id,
    orderNumber: o.orderNumber,
    customerName: o.user ? `${o.user.firstName} ${o.user.lastName}` : 'Guest',
    email: o.user?.email || o.shippingAddress?.email || '—',
    total: Number(o.total) || 0,
    items: (o.items || []).length,
    createdAt: o.createdAt
  }));

  res.json({
    success: true,
    data: {
      abandonedCount,
      abandonedRevenue,
      cartAbandonmentRate,
      checkoutCompletionRate: totalOrders > 0
        ? Number(((totalPaid / totalOrders) * 100).toFixed(1))
        : 0,
      dailyAbandoned,
      recentAbandoned
    }
  });
});

// @desc    Get refunds & failed payments report
// @route   GET /api/admin/reports/payments
// @access  Private/Admin
const getPaymentsReport = asyncHandler(async (req, res) => {
  const allOrders = await Order.find()
    .populate({ path: 'user', select: 'firstName lastName email' })
    .lean();

  const paid = allOrders.filter(o => o.paymentStatus === 'paid');
  const pending = allOrders.filter(o => o.paymentStatus === 'pending');
  const failed = allOrders.filter(o => o.paymentStatus === 'failed');
  const refunded = allOrders.filter(o => o.paymentStatus === 'refunded');

  const totalRevenue = paid.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const refundedAmount = refunded.reduce((s, o) => s + (Number(o.total) || 0), 0);

  // Payment method breakdown
  const methodMap = {};
  for (const o of paid) {
    const method = o.paymentMethod || 'unknown';
    if (!methodMap[method]) methodMap[method] = { name: method, count: 0, revenue: 0 };
    methodMap[method].count += 1;
    methodMap[method].revenue += Number(o.total) || 0;
  }
  const paymentMethods = Object.values(methodMap).sort((a, b) => b.revenue - a.revenue);

  // Monthly trend
  const monthlyMap = {};
  for (const o of allOrders) {
    try {
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap[key]) monthlyMap[key] = { month: key, paid: 0, failed: 0, refunded: 0, pending: 0 };
      monthlyMap[key][o.paymentStatus] = (monthlyMap[key][o.paymentStatus] || 0) + 1;
    } catch { }
  }
  const monthlyTrend = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));

  res.json({
    success: true,
    data: {
      summary: {
        totalOrders: allOrders.length,
        paid: paid.length,
        pending: pending.length,
        failed: failed.length,
        refunded: refunded.length,
        totalRevenue,
        refundedAmount,
        failureRate: allOrders.length > 0
          ? Number(((failed.length / allOrders.length) * 100).toFixed(1))
          : 0,
        refundRate: paid.length > 0
          ? Number(((refunded.length / paid.length) * 100).toFixed(1))
          : 0
      },
      paymentMethods,
      monthlyTrend,
      recentRefunds: refunded.slice(0, 10).map(o => ({
        orderNumber: o.orderNumber,
        customer: o.user ? `${o.user.firstName} ${o.user.lastName}` : '—',
        amount: Number(o.total) || 0,
        method: o.paymentMethod,
        date: o.updatedAt
      })),
      recentFailed: failed.slice(0, 10).map(o => ({
        orderNumber: o.orderNumber,
        customer: o.user ? `${o.user.firstName} ${o.user.lastName}` : '—',
        amount: Number(o.total) || 0,
        method: o.paymentMethod,
        date: o.createdAt
      }))
    }
  });
});

// @desc    Get new vs returning customers report
// @route   GET /api/admin/reports/customers
// @access  Private/Admin
const getCustomersReport = asyncHandler(async (req, res) => {
  const allOrders = await Order.find({ paymentStatus: { $in: ['paid', 'pending'] } })
    .populate({ path: 'user', select: 'firstName lastName email createdAt' })
    .lean();

  // Group orders by customer
  const customerOrdersMap = {};
  for (const o of allOrders) {
    const id = (o.user?._id || o.user || 'guest').toString();
    if (!customerOrdersMap[id]) {
      customerOrdersMap[id] = {
        id,
        name: o.user ? `${o.user.firstName || ''} ${o.user.lastName || ''}`.trim() : 'Guest',
        email: o.user?.email || '—',
        joinedAt: o.user?.createdAt,
        orders: [],
        totalSpent: 0
      };
    }
    customerOrdersMap[id].orders.push(o);
    customerOrdersMap[id].totalSpent += Number(o.total) || 0;
  }

  const customers = Object.values(customerOrdersMap);
  const newCustomers = customers.filter(c => c.orders.length === 1);
  const returningCustomers = customers.filter(c => c.orders.length > 1);
  const totalCustomers = customers.length;

  // Average orders per customer
  const avgOrdersPerCustomer = totalCustomers > 0
    ? Number((allOrders.length / totalCustomers).toFixed(1))
    : 0;

  // CLV (Customer Lifetime Value)
  const totalRevenue = allOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const clv = totalCustomers > 0 ? Number((totalRevenue / totalCustomers).toFixed(0)) : 0;
  const returningClv = returningCustomers.length > 0
    ? Number((returningCustomers.reduce((s, c) => s + c.totalSpent, 0) / returningCustomers.length).toFixed(0))
    : 0;

  // Monthly new customers
  const allUsers = await User.find({ userType: { $ne: 'admin' } })
    .select('firstName lastName email createdAt')
    .sort({ createdAt: -1 })
    .lean();

  const monthlyNew = {};
  for (const u of allUsers) {
    try {
      const d = new Date(u.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyNew[key] = (monthlyNew[key] || 0) + 1;
    } catch { }
  }
  const newCustomerTrend = Object.entries(monthlyNew)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, count]) => ({ month, count }));

  // Top returning customers
  const topReturning = returningCustomers
    .sort((a, b) => b.orders.length - a.orders.length)
    .slice(0, 8)
    .map(c => ({ name: c.name, email: c.email, orders: c.orders.length, spent: c.totalSpent }));

  res.json({
    success: true,
    data: {
      summary: {
        total: totalCustomers,
        new: newCustomers.length,
        returning: returningCustomers.length,
        newRate: totalCustomers > 0 ? Number(((newCustomers.length / totalCustomers) * 100).toFixed(1)) : 0,
        returningRate: totalCustomers > 0 ? Number(((returningCustomers.length / totalCustomers) * 100).toFixed(1)) : 0,
        avgOrdersPerCustomer,
        clv,
        returningClv
      },
      newCustomerTrend,
      topReturning,
      totalRegistered: allUsers.length
    }
  });
});

// @desc    Get low stock & inventory report
// @route   GET /api/admin/reports/inventory
// @access  Private/Admin
const getInventoryReport = asyncHandler(async (req, res) => {
  const products = await Product.find().lean();
  const LOW_THRESHOLD = 10;

  const getStock = p => p.inventory?.stock ?? p.stock ?? 0;

  const inStock = products.filter(p => getStock(p) > LOW_THRESHOLD);
  const lowStock = products.filter(p => getStock(p) > 0 && getStock(p) <= LOW_THRESHOLD);
  const outOfStock = products.filter(p => getStock(p) === 0);

  const totalInventoryValue = products.reduce((s, p) => {
    const price = p.price || p.sizes?.[0]?.price || 0;
    return s + (Number(price) * getStock(p));
  }, 0);

  const stockList = products
    .sort((a, b) => getStock(a) - getStock(b))
    .map(p => ({
      id: p._id,
      name: p.name,
      category: p.category,
      stock: getStock(p),
      price: p.price || p.sizes?.[0]?.price || 0,
      status: getStock(p) === 0 ? 'out' : getStock(p) <= LOW_THRESHOLD ? 'low' : 'ok'
    }));

  res.json({
    success: true,
    data: {
      summary: {
        total: products.length,
        inStock: inStock.length,
        lowStock: lowStock.length,
        outOfStock: outOfStock.length,
        totalInventoryValue
      },
      stockList,
      lowStockItems: stockList.filter(p => p.status === 'low'),
      outOfStockItems: stockList.filter(p => p.status === 'out')
    }
  });
});

// @desc    Get coupon usage report
// @route   GET /api/admin/reports/coupons
// @access  Private/Admin
const getCouponsReport = asyncHandler(async (req, res) => {
  const ordersWithCoupons = await Order.find({
    couponCode: { $exists: true, $ne: null, $ne: '' }
  })
    .populate({ path: 'user', select: 'firstName lastName email' })
    .lean();

  // Group by coupon code
  const couponMap = {};
  for (const o of ordersWithCoupons) {
    const code = (o.couponCode || '').toUpperCase();
    if (!code) continue;
    if (!couponMap[code]) couponMap[code] = { code, uses: 0, totalDiscount: 0, totalRevenue: 0, orders: [] };
    couponMap[code].uses += 1;
    couponMap[code].totalDiscount += Number(o.discountAmount) || 0;
    couponMap[code].totalRevenue += Number(o.total) || 0;
    couponMap[code].orders.push({
      orderNumber: o.orderNumber,
      customer: o.user ? `${o.user.firstName} ${o.user.lastName}` : '—',
      discount: Number(o.discountAmount) || 0,
      total: Number(o.total) || 0,
      date: o.createdAt
    });
  }

  const coupons = Object.values(couponMap).sort((a, b) => b.uses - a.uses);
  const totalDiscountGiven = coupons.reduce((s, c) => s + c.totalDiscount, 0);
  const totalCouponRevenue = coupons.reduce((s, c) => s + c.totalRevenue, 0);

  res.json({
    success: true,
    data: {
      summary: {
        totalCouponsUsed: ordersWithCoupons.length,
        uniqueCodes: coupons.length,
        totalDiscountGiven,
        totalCouponRevenue
      },
      coupons: coupons.map(c => ({ ...c, orders: c.orders.slice(0, 5) }))
    }
  });
});

// @desc    Export orders as CSV
// @route   GET /api/admin/export/orders
// @access  Private/Admin
const exportOrdersCSV = asyncHandler(async (req, res) => {
  const { from, to, status } = req.query;
  const filter = {};
  if (status) filter.paymentStatus = status;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const orders = await Order.find(filter)
    .populate({ path: 'user', select: 'firstName lastName email phone' })
    .lean();

  const escCSV = (val) => {
    const str = String(val ?? '');
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };

  const headers = ['Order #', 'Date', 'Customer', 'Email', 'Phone', 'Items', 'Subtotal', 'Shipping', 'Discount', 'Total', 'Payment Method', 'Payment Status', 'Fulfillment Status', 'Coupon', 'Town', 'County'];
  const rows = orders.map(o => [
    o.orderNumber || o._id,
    o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-KE') : '',
    o.user ? `${o.user.firstName} ${o.user.lastName}` : o.shippingAddress?.firstName + ' ' + o.shippingAddress?.lastName,
    o.user?.email || o.shippingAddress?.email || '',
    o.user?.phone || o.shippingAddress?.phone || '',
    (o.items || []).length,
    o.subtotal || 0,
    o.shippingCost || 0,
    o.discountAmount || 0,
    o.total || 0,
    o.paymentMethod || '',
    o.paymentStatus || '',
    o.fulfillmentStatus || '',
    o.couponCode || '',
    o.shippingAddress?.town || '',
    o.shippingAddress?.county || ''
  ].map(escCSV));

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="rerendet-orders-${new Date().toISOString().split('T')[0]}.csv"`);
  res.send(csv);
});

// @desc    Export customers as CSV
// @route   GET /api/admin/export/customers
// @access  Private/SuperAdmin
const exportCustomersCSV = asyncHandler(async (req, res) => {
  // Security & Audit: Require Super Admin role for PII Export
  const userRole = req.user?.role || req.user?.userType;
  if (!['super-admin', 'superadmin'].includes(String(userRole).toLowerCase())) {
    res.status(403);
    throw new Error('Customer PII exports are restricted to Super Admin role only.');
  }

  const users = await User.find({ userType: { $ne: 'admin' } })
    .select('firstName lastName email phone createdAt lastLoginAt isVerified')
    .lean();

  await logActivity(req, 'EXPORT_CUSTOMER_PII', `Exported PII CSV containing ${users.length} customer records`);

  const orders = await Order.find({ paymentStatus: { $in: ['paid', 'pending'] } })
    .select('user total')
    .lean();

  const spendMap = {};
  const orderCountMap = {};
  for (const o of orders) {
    const id = (o.user || '').toString();
    spendMap[id] = (spendMap[id] || 0) + (Number(o.total) || 0);
    orderCountMap[id] = (orderCountMap[id] || 0) + 1;
  }

  const escCSV = (val) => {
    const str = String(val ?? '');
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };

  const headers = ['Name', 'Email', 'Phone', 'Registered', 'Last Login', 'Verified', 'Total Orders', 'Total Spent (KES)'];
  const rows = users.map(u => {
    const id = u._id.toString();
    return [
      `${u.firstName} ${u.lastName}`,
      u.email,
      u.phone || '',
      u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-KE') : '',
      u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('en-KE') : '',
      u.isVerified ? 'Yes' : 'No',
      orderCountMap[id] || 0,
      spendMap[id] || 0
    ].map(escCSV);
  });

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="rerendet-customers-${new Date().toISOString().split('T')[0]}.csv"`);
  res.send(csv);
});

// @desc    Get payment transactions ledger logs
// @route   GET /api/admin/payments
// @access  Private/Admin
const getPaymentTransactions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, provider, status } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  let filter = {};

  if (provider && provider !== 'all') {
    filter.provider = provider.toUpperCase();
  }

  if (status && status !== 'all') {
    filter.status = status.toUpperCase();
  }

  if (search) {
    filter.$or = [
      { transactionId: { $regex: search, $options: 'i' } },
      { 'metadata.phoneNumber': { $regex: search, $options: 'i' } },
      { 'metadata.mpesaPhoneNumber': { $regex: search, $options: 'i' } }
    ];
  }

  try {
    const [transactions, total, statsAggregation] = await Promise.all([
      PaymentTransaction.find(filter)
        .populate({
          path: 'order',
          select: 'orderNumber total paymentStatus shippingAddress.email shippingAddress.phone',
          populate: { path: 'user', select: 'firstName lastName email' }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      PaymentTransaction.countDocuments(filter),
      PaymentTransaction.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            volume: { $sum: '$amount' }
          }
        }
      ])
    ]);

    // Format stats matching the frontend requirements
    const stats = {
      total: 0,
      success: 0,
      pending: 0,
      failed: 0,
      totalVolume: 0
    };

    statsAggregation.forEach(group => {
      const statusKey = group._id?.toUpperCase();
      const count = group.count || 0;
      stats.total += count;

      if (statusKey === 'SUCCESS' || statusKey === 'PAID') {
        stats.success += count;
        stats.totalVolume += group.volume || 0;
      } else if (statusKey === 'PENDING') {
        stats.pending += count;
      } else if (statusKey === 'FAILED') {
        stats.failed += count;
      }
    });

    res.json({
      success: true,
      data: {
        transactions,
        stats,
        totalTransactions: total,
        pagination: {
          current: parseInt(page),
          page: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    res.status(500);
    throw new Error('Failed to fetch payment transaction logs: ' + error.message);
  }
});

// @desc    Manually mark order as paid
// @route   POST /api/admin/orders/:id/manual-override
// @access  Private/Admin
const manualPaymentOverride = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason, referenceId, method = 'MPESA' } = req.body;

  if (!reason) {
    res.status(400);
    throw new Error('Please provide a reason for the manual payment override');
  }

  const order = await Order.findById(id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (order.paymentStatus === 'paid') {
    res.status(400);
    throw new Error('Order is already marked as paid');
  }

  const overrideTxId = referenceId || `MANUAL-${Date.now()}`;

  // 1. Update order payment status
  order.paymentStatus = 'paid';
  order.transactionId = overrideTxId;
  order.orderEvents.push({
    status: 'PAYMENT_CONFIRMED',
    note: `Manually marked as PAID by Admin: ${req.user.email}. Reason: ${reason}. Ref: ${overrideTxId}`,
    user: req.user._id
  });
  await order.save();

  // 2. Create successful Transaction Record
  await PaymentTransaction.create({
    order: order._id,
    provider: method.toUpperCase(),
    transactionId: overrideTxId,
    amount: order.total,
    currency: 'KES',
    status: 'SUCCESS',
    rawResponse: { manualOverride: true, reason, adminId: req.user._id },
    metadata: { reason, overriddenBy: req.user.email, date: new Date() }
  });

  // 3. Log administrative action in ActivityLog
  await logActivity(req, 'MANUAL_PAYMENT_OVERRIDE', `Manually marked order #${order.orderNumber} as paid. Reason: ${reason}`, order._id);

  // Send admin notification for newly confirmed paid order
  try {
    const { sendNewOrderAdminAlert } = await import('../utils/adminNotificationService.js');
    await sendNewOrderAdminAlert(order);
  } catch (alertErr) {
    console.error('❌ Failed to send admin alert on manual override:', alertErr.message);
  }

  res.json({
    success: true,
    message: 'Order manually overridden and marked as paid successfully',
    data: order
  });
});

// @desc    Initiate dynamic/manual gateway refund
// @route   POST /api/admin/orders/:id/refund
// @access  Private/Admin
const refundOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason, forceManual = false } = req.body;

  if (!reason) {
    res.status(400);
    throw new Error('Please provide a reason for initiating this refund');
  }

  const order = await Order.findById(id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (order.paymentStatus !== 'paid') {
    res.status(400);
    throw new Error('Can only refund orders that have already been fully paid');
  }

  // Find original successful transaction
  const tx = await PaymentTransaction.findOne({ order: order._id, status: 'SUCCESS' });
  let gatewayRefundSuccess = false;
  let refundDetails = {};

  if (tx && tx.provider === 'PAYPAL' && !forceManual) {
    // Process live automated PayPal refund via REST API!
    try {
      console.log(`💸 Initiating automated PayPal refund for Order ${order.orderNumber}...`);
      const captureId = tx.rawResponse?.purchase_units?.[0]?.payments?.captures?.[0]?.id || tx.transactionId;
      
      const { getPayPalAccessToken } = await import('../services/paypalService.js');
      const paypalAccessToken = await getPayPalAccessToken();
      const paypalUrl = process.env.PAYPAL_ENVIRONMENT === 'production' 
        ? 'https://api-m.paypal.com' 
        : 'https://api-m.sandbox.paypal.com';

      const response = await axios.post(
        `${paypalUrl}/v2/payments/captures/${captureId}/refund`,
        { note_to_payer: reason },
        {
          headers: {
            Authorization: `Bearer ${paypalAccessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && ['COMPLETED', 'PENDING'].includes(response.data.status)) {
        gatewayRefundSuccess = true;
        refundDetails = response.data;
        console.log(`✅ PayPal gateway refund successful: ID=${response.data.id}`);
      }
    } catch (err) {
      console.warn(`⚠️ PayPal gateway refund failed: ${err.message}. Recording manual fallback.`);
    }
  }

  // 1. Update order payment status to refunded
  order.paymentStatus = 'refunded';
  order.orderStatus = 'cancelled';
  order.orderEvents.push({
    status: 'REFUND_PROCESSED',
    note: `Refund processed by admin: ${req.user.email}. Gateway Refunded: ${gatewayRefundSuccess ? 'Yes' : 'No (Manual override)'}. Reason: ${reason}`,
    user: req.user._id
  });
  await order.save();

  // 2. Log reversed transaction in ledger
  await PaymentTransaction.create({
    order: order._id,
    provider: tx ? tx.provider : 'MPESA',
    transactionId: `REFUND-${Date.now()}`,
    amount: order.total,
    currency: 'KES',
    status: 'FAILED',
    rawResponse: { refunded: true, reason, gatewayRefundSuccess, refundDetails },
    metadata: { reason, refundedBy: req.user.email, date: new Date() }
  });

  // 3. Roll back product stock dynamically to replenish inventory!
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { 'inventory.stock': item.quantity },
      $set: { inStock: true }
    });
  }

  // 4. Log admin activity
  await logActivity(req, 'INITIATED_REFUND', `Refunded order #${order.orderNumber}. Reason: ${reason}. Gateway: ${gatewayRefundSuccess ? 'Automated' : 'Manual'}`, order._id);

  res.json({
    success: true,
    message: gatewayRefundSuccess 
      ? 'Payment refunded successfully through gateway and inventory replenished' 
      : 'Refund recorded manually and inventory replenished successfully',
    data: order
  });
});

// @desc    Generate financial reconciliation comparison report
// @route   GET /api/admin/reports/reconciliation
// @access  Private/Admin
const getReconciliationReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const filter = {};
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  try {
    // 1. Aggregated total revenue of database orders
    const dbSummary = await Order.aggregate([
      { $match: { ...filter, paymentStatus: 'paid' } },
      {
        $group: {
          _id: '$paymentMethod',
          totalAmount: { $sum: '$total' },
          count: { $sum: 1 }
        }
      }
    ]);

    // 2. Aggregated total of PaymentTransaction ledger items
    const ledgerSummary = await PaymentTransaction.aggregate([
      { $match: { ...filter, status: 'SUCCESS' } },
      {
        $group: {
          _id: '$provider',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // 3. Scan for discrepancies
    const unmatchedOrders = await Order.find({
      ...filter,
      paymentStatus: 'paid'
    }).select('orderNumber total paymentMethod transactionId shippingAddress.email');

    const discrepancies = [];

    for (const order of unmatchedOrders) {
      const match = await PaymentTransaction.findOne({
        $or: [
          { transactionId: order.transactionId },
          { order: order._id }
        ],
        status: 'SUCCESS'
      });
      if (!match) {
        discrepancies.push({
          type: 'MISSING_TRANSACTION_LEDGER',
          message: `Order #${order.orderNumber} is marked PAID, but no matching transaction was found in the secure ledger`,
          orderId: order._id,
          orderNumber: order.orderNumber,
          amount: order.total,
          method: order.paymentMethod
        });
      }
    }

    res.json({
      success: true,
      data: {
        dbSummary,
        ledgerSummary,
        discrepancies,
        reportTimeframe: { startDate, endDate }
      }
    });
  } catch (error) {
    res.status(500);
    throw new Error('Failed to generate reconciliation audit: ' + error.message);
  }
});

// @desc    Get system health, cache status, and background queues telemetry
// @route   GET /api/admin/system-health
// @access  Private/Admin
const getSystemHealth = asyncHandler(async (req, res) => {
  let cacheStats = {
    connected: isRedisConnected,
    client: !!redisClient,
    totalKeys: 0,
    catalogKeys: 0,
    settingsCached: false
  };

  let queueStats = {
    emailQueue: { active: 0, waiting: 0, completed: 0, failed: 0 },
    subscriptionQueue: { active: 0, waiting: 0, completed: 0, failed: 0 },
    retryQueue: { active: 0, waiting: 0, completed: 0, failed: 0 }
  };

  // 1. Gather Redis details if connected
  if (isRedisConnected && redisClient) {
    try {
      const keys = await redisClient.keys('*');
      cacheStats.totalKeys = keys.length;

      const catalogKeys = await redisClient.keys('products:catalog:*');
      cacheStats.catalogKeys = catalogKeys.length;

      const settingsExist = await redisClient.exists('app:settings');
      cacheStats.settingsCached = !!settingsExist;
    } catch (err) {
      console.error('Failed to query Redis cache stats:', err.message);
    }
  }

  // 2. Gather BullMQ queue statistics
  if (emailQueue && subscriptionQueue && retryQueue) {
    try {
      queueStats.emailQueue = await emailQueue.getJobCounts('active', 'waiting', 'completed', 'failed');
      queueStats.subscriptionQueue = await subscriptionQueue.getJobCounts('active', 'waiting', 'completed', 'failed');
      queueStats.retryQueue = await retryQueue.getJobCounts('active', 'waiting', 'completed', 'failed');
    } catch (err) {
      console.error('Failed to query BullMQ stats:', err.message);
    }
  }

  // 3. Fetch security webhook block audits or signature validations
  const recentSecurityAudits = await ActivityLog.find({
    action: { $in: ['LOGIN', 'SETTINGS_UPDATE', 'MPESA_WEBHOOK_BLOCKED', 'STRIPE_SIGNATURE_ERROR'] }
  })
    .sort({ createdAt: -1 })
    .limit(10);

  // 4. Summarize system resources
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();

  // 5. Uptime aggregates from SystemHealthLog (last 24 hours)
  let uptimeStats = {
    totalChecks: 0,
    healthyChecks: 0,
    uptimePercent: 100,
    last24hAvgLatency: { mongodb: 0, redis: 0, queues: 0 },
    recentLogs: []
  };

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalChecks, healthyChecks, avgLatencyResult, recentLogs] = await Promise.all([
      SystemHealthLog.countDocuments({ timestamp: { $gte: twentyFourHoursAgo } }),
      SystemHealthLog.countDocuments({ timestamp: { $gte: twentyFourHoursAgo }, status: 'healthy' }),
      SystemHealthLog.aggregate([
        { $match: { timestamp: { $gte: twentyFourHoursAgo } } },
        {
          $group: {
            _id: null,
            avgMongoLatency: { $avg: '$services.mongodb.latencyMs' },
            avgRedisLatency: { $avg: '$services.redis.latencyMs' },
            avgQueuesLatency: { $avg: '$services.queues.latencyMs' }
          }
        }
      ]),
      SystemHealthLog.find()
        .sort({ timestamp: -1 })
        .limit(20)
        .lean()
    ]);

    const latencyAgg = avgLatencyResult[0] || {};

    uptimeStats = {
      totalChecks,
      healthyChecks,
      uptimePercent: totalChecks > 0 ? Math.round((healthyChecks / totalChecks) * 10000) / 100 : 100,
      last24hAvgLatency: {
        mongodb: Math.round(latencyAgg.avgMongoLatency || 0),
        redis: Math.round(latencyAgg.avgRedisLatency || 0),
        queues: Math.round(latencyAgg.avgQueuesLatency || 0)
      },
      recentLogs
    };
  } catch (err) {
    console.error('Failed to query SystemHealthLog aggregates:', err.message);
  }

  res.json({
    success: true,
    data: {
      cache: cacheStats,
      queues: queueStats,
      security: {
        recentAudits: recentSecurityAudits,
        stripeWebhookUrl: process.env.STRIPE_WEBHOOK_SECRET ? 'CONFIGURED' : 'MISSING',
        mpesaWebhookIpsWhitelisted: ['196.201.212.0/24', '196.201.213.0/24', '196.201.214.0/24']
      },
      resources: {
        uptimeSeconds: Math.floor(uptime),
        memoryRssMb: Math.round(memoryUsage.rss / (1024 * 1024)),
        memoryHeapUsedMb: Math.round(memoryUsage.heapUsed / (1024 * 1024)),
        nodeVersion: process.version
      },
      uptimeStats
    }
  });
});

// @desc    Manually clear/invalidate Redis caches (catalog or settings)
// @route   POST /api/admin/cache/invalidate
// @access  Private/Admin
const invalidateCache = asyncHandler(async (req, res) => {
  const { type } = req.body; // 'catalog' or 'settings' or 'all'

  if (!isRedisConnected || !redisClient) {
    res.status(400);
    throw new Error('Redis is not connected or initialized');
  }

  let clearedCount = 0;

  try {
    if (type === 'catalog' || type === 'all') {
      const keys = await redisClient.keys('products:catalog:*');
      if (keys.length > 0) {
        await redisClient.del(keys);
        clearedCount += keys.length;
      }
    }

    if (type === 'settings' || type === 'all') {
      const settingsExist = await redisClient.exists('app:settings');
      if (settingsExist) {
        await redisClient.del('app:settings');
        clearedCount += 1;
      }
    }

    // Log the cache clearance action
    await logActivity(req, 'SETTINGS_UPDATE', `Manually invalidated ${type} cache (${clearedCount} keys removed)`, req.user._id);

    res.json({
      success: true,
      message: `Successfully invalidated ${type} cache. Removed ${clearedCount} keys.`
    });
  } catch (err) {
    res.status(500);
// @desc    Perform itemized bulk action on products
// @route   POST /api/admin/products/bulk
// @access  Private/Admin
const bulkActionProducts = asyncHandler(async (req, res) => {
  const { productIds, action, value } = req.body;

  if (!Array.isArray(productIds) || productIds.length === 0) {
    res.status(400);
    throw new Error('Please provide an array of product IDs.');
  }

  if (!['publish', 'draft', 'setCategory', 'adjustStock', 'delete'].includes(action)) {
    res.status(400);
    throw new Error('Invalid bulk action specified.');
  }

  const results = [];
  let updatedCount = 0;
  let failedCount = 0;

  for (const id of productIds) {
    try {
      const product = await Product.findById(id);
      if (!product) {
        results.push({ id, success: false, reason: 'Product not found' });
        failedCount++;
        continue;
      }

      if (action === 'publish') {
        product.isActive = true;
        await product.save();
      } else if (action === 'draft') {
        product.isActive = false;
        await product.save();
      } else if (action === 'setCategory') {
        if (value && mongoose.Types.ObjectId.isValid(value)) {
          product.categoryId = value;
          await product.save();
        } else {
          results.push({ id, success: false, reason: 'Invalid Category ID' });
          failedCount++;
          continue;
        }
      } else if (action === 'adjustStock') {
        const delta = parseInt(value, 10);
        if (isNaN(delta)) {
          results.push({ id, success: false, reason: 'Invalid stock adjustment delta' });
          failedCount++;
          continue;
        }
        const currentStock = product.inventory?.stock ?? product.stock ?? 0;
        const newStock = currentStock + delta;
        if (newStock < 0) {
          results.push({ id, success: false, reason: `Stock cannot drop below 0 (current: ${currentStock}, adjustment: ${delta})` });
          failedCount++;
          continue;
        }
        if (product.inventory) {
          product.inventory.stock = newStock;
        } else {
          product.stock = newStock;
        }
        product.inStock = newStock > 0;
        await product.save();
      } else if (action === 'delete') {
        await product.deleteOne();
      }

      results.push({ id, name: product.name, success: true });
      updatedCount++;
    } catch (err) {
      results.push({ id, success: false, reason: err.message });
      failedCount++;
    }
  }

  await logActivity(req, 'BULK_PRODUCT_ACTION', `Executed bulk ${action} on ${productIds.length} products (Success: ${updatedCount}, Failed: ${failedCount})`);

  res.json({
    success: true,
    message: `Bulk action '${action}' completed`,
    data: {
      total: productIds.length,
      updatedCount,
      failedCount,
      results
    }
  });
});

export {
  getDashboardStats,
  getOrders,
  getOrderDetail,
  updateOrderStatus,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getUsers,
  getContacts,
  updateContactStatus,
  replyContact,
  deleteContact,
  getSettings,
  updateSettings,
  getSalesAnalytics,
  getActivityLogs,
  updateUserRole,
  toggleUserStatus,
  deleteUser,
  testEmailConfig,
  checkNewOrders,
  getAdminOverview,
  getAbandonedCartsReport,
  getPaymentsReport,
  getCustomersReport,
  getInventoryReport,
  getCouponsReport,
  exportOrdersCSV,
  exportCustomersCSV,
  updateProductStock,
  resetUserSecurity,
  getPaymentTransactions,
  manualPaymentOverride,
  refundOrder,
  getReconciliationReport,
  getSystemHealth,
  invalidateCache,
  bulkActionProducts
};
