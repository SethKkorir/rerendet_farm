// controllers/productController.js
import asyncHandler from 'express-async-handler';
import Product from '../models/Product.js';

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
    filter.category = category;
  }

  if (featured === 'true') {
    filter.isFeatured = true;
  }

  if (inStock === 'true') {
    filter.inStock = true;
  }

  // 3. Optimized parallel execution with projection
  // Only fetch fields needed for the shop grid to reduce data transfer
  const publicProjection = 'name category sizes images inStock isFeatured badge inventory.stock seo.slug ratings';

  const [products, total] = await Promise.all([
    Product.find(filter)
      .select(publicProjection)
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
    categories = await Product.distinct('category', { isActive: true });
  }

  res.json({
    success: true,
    data: {
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      categories: categories.length > 0 ? categories : undefined
    }
  });
});

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).lean();

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
  }).limit(8).lean();

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
    roastLevel,
    origin,
    flavorNotes,
    badge,
    inventory,
    tags,
    isFeatured = false
  } = req.body;

  // Validate required fields
  if (!name || !description || !category) {
    res.status(400);
    throw new Error('Name, description, and category are required');
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
    category,
    roastLevel: category === 'coffee-beans' ? roastLevel : undefined,
    origin: origin?.trim() || '',
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
  if (category) product.category = category;
  if (roastLevel && category === 'coffee-beans') product.roastLevel = roastLevel;
  if (origin !== undefined) product.origin = origin?.trim();
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
  const product = await Product.findOne({ 'seo.slug': req.params.slug }).lean();

  if (product) {
    res.json({
      success: true,
      data: product
    });
  } else {
    // Also try to find by ID if slug not found (fallback)
    const productById = await Product.findById(req.params.slug).catch(() => null);
    if (productById) {
      return res.json({ success: true, data: productById });
    }
    res.status(404);
    throw new Error('Product not found');
  }
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
  deleteProductImage
};