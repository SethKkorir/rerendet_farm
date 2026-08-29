// controllers/productController.js
import asyncHandler from 'express-async-handler';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import { redisClient, isRedisConnected, invalidateCatalog } from '../config/redis.js';

// Cache for high-traffic public endpoints
let productCache = {
  featured: { data: null, lastUpdated: 0 },
  categories: { data: null, lastUpdated: 0 },
  ttl: 10 * 60 * 1000 // 10 minutes
};

// Cache Buster helper
const clearProductCache = () => {
  productCache.featured.data = null;
  productCache.categories.data = null;
  console.log('🧹 Product Cache Cleared');
};

// Regex escape helper
const escapeRegex = (string) => {
  return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
};

// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getProducts = asyncHandler(async (req, res) => {
  const {
    category,
    search,
    featured,
    inStock,
    page = 1,
    limit = 12,
    sort = '-createdAt'
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  let filter = { isActive: true };

  // 1. Text Search Optimization
  if (search) {
    filter.$text = { $search: search };
  }

  // 2. Filter logic
  if (category && category !== 'all') {
    const mongoose = await import('mongoose');
    if (mongoose.default.Types.ObjectId.isValid(category)) {
      filter.categoryId = category;
    } else {
      const cat = await Category.findOne({ slug: category });
      if (cat) {
        filter.categoryId = cat._id;
      } else {
        filter.categoryId = new mongoose.default.Types.ObjectId();
      }
    }
  }

  if (featured === 'true') {
    filter.isFeatured = true;
  }

  if (inStock === 'true') {
    filter.inStock = true;
  }

  // Check Redis Cache only if it's a standard catalog browsing request (no active text search or custom query)
  const isStandardCatalog = !search && featured !== 'true' && inStock !== 'true' && sort === '-createdAt';
  const cacheKey = `products:catalog:${category || 'all'}:${page || '1'}`;
  const isCacheReady = redisClient && isRedisConnected;

  if (isStandardCatalog && isCacheReady) {
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return res.json({
          success: true,
          data: JSON.parse(cached),
          cached: true
        });
      }
    } catch (err) {
      console.error('❌ Product Cache get error:', err.message);
    }
  }

  // 3. Optimized parallel execution with projection
  // Fetch all necessary fields for rich shop cards, descriptions, origin & flavor profiles
  const publicProjection = 'name description origin roastLevel flavorNotes roastDate category categoryId categoryAttributes sizes price images inStock isFeatured badge inventory seo.slug ratings brand material capacity';

  const [products, total] = await Promise.all([
    Product.find(filter)
      .select(publicProjection)
      .populate('categoryId')
      .sort(search ? { score: { $meta: 'textScore' } } : sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Product.countDocuments(filter)
  ]);

  // Categories are relatively static - could be cached or fetched separately
  // For now, only fetch if page is 1 to save overhead on pagination
  let categories = [];
  if (parseInt(page) === 1) {
    const cats = await Category.find({ isDeleted: { $ne: true } }).lean();
    categories = cats.map(c => c.slug);
  }

  const responseData = {
    products,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    },
    categories: categories.length > 0 ? categories : undefined
  };

  if (isStandardCatalog && isCacheReady) {
    try {
      await redisClient.set(cacheKey, JSON.stringify(responseData), 'EX', 120);
    } catch (err) {
      console.error('❌ Product Cache set error:', err.message);
    }
  }

  res.json({
    success: true,
    data: responseData
  });
});

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('categoryId').lean();

  if (!product || !product.isActive) {
    res.status(404);
    throw new Error('Product not found');
  }

  res.json({
    success: true,
    data: product
  });
});

// @desc    Get featured products
// @route   GET /api/products/featured/products
// @access  Public
const getFeaturedProducts = asyncHandler(async (req, res) => {
  // Check cache
  if (productCache.featured.data && (Date.now() - productCache.featured.lastUpdated < productCache.ttl)) {
    return res.json({
      success: true,
      data: productCache.featured.data,
      cached: true
    });
  }

  const products = await Product.find({
    isFeatured: true,
    isActive: true,
    inStock: true
  }).populate('categoryId').limit(8).lean();

  // Update cache
  productCache.featured = {
    data: products,
    lastUpdated: Date.now()
  };

  res.json({
    success: true,
    data: products
  });
});

// @desc    Get products by category
// @route   GET /api/products/category/:category
// @access  Public
const getProductsByCategory = asyncHandler(async (req, res) => {
  const { category } = req.params;
  const { limit = 12 } = req.query;

  const products = await Product.find({
    category,
    isActive: true,
    inStock: true
  }).limit(parseInt(limit)).lean();

  res.json({
    success: true,
    data: products
  });
});

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = asyncHandler(async (req, res) => {
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
    inventory,
    tags,
    isFeatured = false
  } = req.body;

  // Validate required fields
  if (!name || !description || !sizes) {
    res.status(400);
    throw new Error('Name, description, and sizes are required');
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

  // Validate dynamic attributes
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

  // Parse sizes
  let parsedSizes = [];
  try {
    parsedSizes = typeof sizes === 'string' ? JSON.parse(sizes) : sizes;
    if (!Array.isArray(parsedSizes) || parsedSizes.length === 0) {
      throw new Error('At least one size is required');
    }
  } catch (error) {
    res.status(400);
    throw new Error('Invalid sizes format');
  }

  // Handle images
  const images = req.files ? req.files.map(file => ({
    public_id: file.filename,
    url: file.path
  })) : [];

  const product = new Product({
    name: name.trim(),
    description: description.trim(),
    sizes: parsedSizes.map(size => ({
      size: size.size,
      price: parseFloat(size.price)
    })),
    images,
    categoryId: dbCategory._id,
    categoryAttributes: parsedCategoryAttributes,
    roastLevel: roastLevel || parsedCategoryAttributes['roastLevel'] || undefined,
    origin: origin?.trim() || parsedCategoryAttributes['origin']?.trim() || '',
    flavorNotes: flavorNotes ?
      (typeof flavorNotes === 'string' ?
        flavorNotes.split(',').map(note => note.trim()).filter(note => note) :
        flavorNotes) : [],
    badge: badge?.trim() || '',
    inventory: {
      stock: parseInt((typeof inventory === 'string' ? JSON.parse(inventory) : inventory)?.stock) || 0,
      lowStockAlert: parseInt((typeof inventory === 'string' ? JSON.parse(inventory) : inventory)?.lowStockAlert) || 5
    },
    tags: tags ?
      (typeof tags === 'string' ?
        tags.split(',').map(tag => tag.trim()).filter(tag => tag) :
        tags) : [],
    isFeatured: isFeatured === 'true' || isFeatured === true,

    // Strategic Modules
    isBundle: req.body.isBundle === 'true' || req.body.isBundle === true,
    bundleDetails: req.body.bundleDetails ? (typeof req.body.bundleDetails === 'string' ? JSON.parse(req.body.bundleDetails) : req.body.bundleDetails) : [],
    isSubscriptionAvailable: req.body.isSubscriptionAvailable === 'true' || req.body.isSubscriptionAvailable === true,
    flavorProfiles: req.body.flavorProfiles ? (typeof req.body.flavorProfiles === 'string' ? JSON.parse(req.body.flavorProfiles) : req.body.flavorProfiles) : undefined,
    roastDate: req.body.roastDate || new Date()
  });

  const createdProduct = await product.save();
  clearProductCache();
  await invalidateCatalog();

  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: createdProduct
  });
});

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
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
    inventory,
    tags,
    isFeatured
  } = req.body;

  // Update fields
  if (name) product.name = name.trim();
  if (description) product.description = description.trim();

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

    // Validate dynamic attributes
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

  if (roastLevel !== undefined) {
    product.roastLevel = roastLevel;
  } else if (product.categoryAttributes && product.categoryAttributes.get('roastLevel')) {
    product.roastLevel = product.categoryAttributes.get('roastLevel');
  }

  if (origin !== undefined) {
    product.origin = origin?.trim();
  } else if (product.categoryAttributes && product.categoryAttributes.get('origin')) {
    product.origin = product.categoryAttributes.get('origin');
  }
  if (badge !== undefined) product.badge = badge?.trim();
  if (isFeatured !== undefined) {
    product.isFeatured = isFeatured === 'true' || isFeatured === true;
  }

  // Update sizes
  if (sizes) {
    let parsedSizes;
    try {
      parsedSizes = typeof sizes === 'string' ? JSON.parse(sizes) : sizes;
      if (Array.isArray(parsedSizes) && parsedSizes.length > 0) {
        product.sizes = parsedSizes.map(size => ({
          size: size.size,
          price: parseFloat(size.price)
        }));
      }
    } catch (error) {
      res.status(400);
      throw new Error('Invalid sizes format');
    }
  }

  // Update inventory
  if (inventory) {
    const parsedInventory = typeof inventory === 'string' ? JSON.parse(inventory) : inventory;
    product.inventory = {
      stock: parseInt(parsedInventory.stock) || product.inventory.stock,
      lowStockAlert: parseInt(parsedInventory.lowStockAlert) || product.inventory.lowStockAlert
    };
  }

  // Update arrays
  if (flavorNotes !== undefined) {
    product.flavorNotes = typeof flavorNotes === 'string' ?
      flavorNotes.split(',').map(note => note.trim()).filter(note => note) :
      flavorNotes;
  }

  if (tags !== undefined) {
    product.tags = typeof tags === 'string' ?
      tags.split(',').map(tag => tag.trim()).filter(tag => tag) :
      tags;
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
  clearProductCache();
  await invalidateCatalog();

  res.json({
    success: true,
    message: 'Product updated successfully',
    data: updatedProduct
  });
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  // Soft delete
  product.isActive = false;
  await product.save();
  clearProductCache();
  await invalidateCatalog();

  res.json({
    success: true,
    message: 'Product deleted successfully'
  });
});

// @desc    Update product stock
// @route   PATCH /api/products/:id/stock
// @access  Private/Admin
const updateProductStock = asyncHandler(async (req, res) => {
  const { stock } = req.body;

  const product = await Product.findByIdAndUpdate(
    req.params.id,
    {
      'inventory.stock': parseInt(stock),
      inStock: parseInt(stock) > 0
    },
    { new: true }
  );

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  res.json({
    success: true,
    message: 'Product stock updated successfully',
    data: product
  });
  
  // Invalidate product catalog cache
  await invalidateCatalog();
});

// @desc    Upload product images
// @route   POST /api/products/:id/images
// @access  Private/Admin
const uploadProductImages = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  if (!req.files || req.files.length === 0) {
    res.status(400);
    throw new Error('No images uploaded');
  }

  const newImages = req.files.map(file => ({
    public_id: file.filename,
    url: file.path
  }));

  product.images = [...product.images, ...newImages];
  await product.save();
  await invalidateCatalog();

  res.json({
    success: true,
    message: 'Images uploaded successfully',
    data: product.images
  });
});

// @desc    Delete product image
// @route   DELETE /api/products/:id/images
// @access  Private/Admin
const deleteProductImage = asyncHandler(async (req, res) => {
  const { imageUrl } = req.body;
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  product.images = product.images.filter(img => img.url !== imageUrl);
  await product.save();
  await invalidateCatalog();

  res.json({
    success: true,
    message: 'Image deleted successfully',
    data: product.images
  });
});

// @desc    Get product by slug
// @route   GET /api/products/slug/:slug
// @access  Public
const getProductBySlug = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ 'seo.slug': req.params.slug }).populate('categoryId').lean();

  if (product) {
    res.json({
      success: true,
      data: product
    });
  } else {
    // Also try to find by ID if slug not found (fallback)
    const productById = await Product.findById(req.params.slug).populate('categoryId').catch(() => null);
    if (productById) {
      return res.json({ success: true, data: productById });
    }
    res.status(404);
    throw new Error('Product not found');
  }
});

// Trigger restock alerts helper
const checkAndDispatchRestockAlerts = async (productId, oldStock, newStock) => {
  if (oldStock <= 0 && newStock > 0) {
    try {
      const RestockSubscription = (await import('../models/RestockSubscription.js')).default;
      const sendEmail = (await import('../utils/sendEmail.js')).default;
      const product = await Product.findById(productId);

      if (!product) return;

      const subscriptions = await RestockSubscription.find({ product: productId, notified: false });

      if (subscriptions.length > 0) {
        console.log(`📧 Dispatching restock emails to ${subscriptions.length} subscribers for ${product.name}...`);
        
        const frontendUrl = (!process.env.FRONTEND_URL || process.env.FRONTEND_URL.includes('localhost') || process.env.FRONTEND_URL.includes('127.0.0.1')) && (process.env.NODE_ENV === 'production' || process.env.VERCEL)
          ? 'https://rerendet-farm.vercel.app'
          : (process.env.FRONTEND_URL || 'http://localhost:3000');

        for (const sub of subscriptions) {
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
              <div style="text-align: center; margin-bottom: 25px;">
                <h1 style="color: #6b4226; margin: 0; font-size: 24px;">☕ Fresh Batch Ready!</h1>
                <p style="color: #666; font-size: 14px; margin-top: 5px;">${product.name} is Back in Stock</p>
              </div>
              <p style="font-size: 15px; color: #333;">Hello,</p>
              <p style="font-size: 14px; color: #555; line-height: 1.6;">
                Great news! The coffee you were waiting for, <strong>${product.name}</strong>, has just been freshly roasted and restocked in our inventory.
              </p>
              <div style="text-align: center; margin: 25px 0;">
                <a href="${frontendUrl}/product/${product._id}" style="background-color: #6b4226; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">Order Fresh Coffee Now</a>
              </div>
            </div>
          `;

          await sendEmail({
            to: sub.email,
            subject: `☕ Back in Stock: ${product.name}`,
            html: emailHtml
          }).catch(console.error);

          sub.notified = true;
          sub.notifiedAt = new Date();
          await sub.save();
        }
      }
    } catch (err) {
      console.error('❌ Failed to dispatch restock notifications:', err.message);
    }
  }
};

// @desc    Get Best Selling Products (dynamic compute)
// @route   GET /api/products/bestsellers
// @access  Public
const getBestSellers = asyncHandler(async (req, res) => {
  const Order = (await import('../models/Order.js')).default;

  // Aggregate top sold products from completed/paid orders
  const topSales = await Order.aggregate([
    { $match: { paymentStatus: 'paid' } },
    { $unwind: '$items' },
    { $group: { _id: '$items.product', totalSold: { $sum: '$items.quantity' } } },
    { $sort: { totalSold: -1 } },
    { $limit: 8 }
  ]);

  const productIds = topSales.map(s => s._id);

  let bestSellers = [];
  if (productIds.length > 0) {
    bestSellers = await Product.find({ _id: { $in: productIds }, isActive: true }).populate('categoryId').lean();
  }

  // Fallback: If no order history yet, fetch top featured active products
  if (bestSellers.length < 4) {
    const fallbacks = await Product.find({ isActive: true }).sort({ rating: -1, createdAt: -1 }).limit(8).populate('categoryId').lean();
    bestSellers = fallbacks;
  }

  res.json({
    success: true,
    data: bestSellers
  });
});

// @desc    Subscribe to restock notification when out-of-stock product is replenished
// @route   POST /api/products/:id/restock-subscribe
// @access  Public
const subscribeRestockNotification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const productId = req.params.id;

  if (!email || !email.includes('@')) {
    res.status(400);
    throw new Error('Please provide a valid email address.');
  }

  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error('Product not found.');
  }

  const RestockSubscription = (await import('../models/RestockSubscription.js')).default;

  const existing = await RestockSubscription.findOne({ product: productId, email: email.toLowerCase() });
  if (existing) {
    return res.json({
      success: true,
      message: "You're already subscribed to restock alerts for this coffee!"
    });
  }

  await RestockSubscription.create({
    product: productId,
    email: email.toLowerCase(),
    user: req.user ? req.user._id : null
  });

  res.status(201).json({
    success: true,
    message: `Subscribed! We will notify ${email} as soon as ${product.name} is restocked.`
  });
});

export {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getFeaturedProducts,
  getProductsByCategory,
  getProductBySlug,
  updateProductStock,
  uploadProductImages,
  deleteProductImage,
  getBestSellers,
  subscribeRestockNotification
};