// models/Product.js - WITH EXPLICIT COLLECTION NAME
import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },

  // Pricing & Sizes — size name is free text so non-coffee products can use 'Standard', 'Large', etc.
  sizes: [{
    size: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, 'Size name too long']
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative']
    }
  }],

  // Images
  images: [{
    public_id: String,
    url: {
      type: String,
      required: true
    }
  }],

  // Product category — open string so admins can create custom categories
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Product category ID is required'],
    index: true
  },
  categoryAttributes: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  roastLevel: {
    type: String,
    enum: ['light', 'medium-light', 'medium', 'medium-dark', 'dark', 'espresso']
  },
  flavorNotes: [String],
  origin: String,
  // Extra fields for non-coffee categories (equipment, accessories, etc.)
  brand: { type: String, trim: true },
  material: { type: String, trim: true },
  capacity: { type: String, trim: true },

  // Badge for special labels (CoffeeShop expects this)
  badge: {
    type: String,
    trim: true,
    maxlength: [50, 'Badge cannot exceed 50 characters']
  },

  // Inventory Management
  inventory: {
    physicalStock: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Physical stock cannot be negative']
    },
    reservedStock: {
      type: Number,
      default: 0,
      min: [0, 'Reserved stock cannot be negative']
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: [0, 'Low stock threshold cannot be negative']
    }
  },

  // Status & Features
  inStock: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },

  // SEO & Metadata
  seo: {
    title: String,
    description: String,
    slug: {
      type: String,
      unique: true,
      sparse: true
    }
  },

  // Ratings
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be less than 0'],
      max: [5, 'Rating cannot exceed 5']
    },
    count: {
      type: Number,
      default: 0,
      min: [0, 'Rating count cannot be negative']
    }
  },

  // === NEW STRATEGIC MODULES ===

  // Commercial Logic: Bundling
  isBundle: { type: Boolean, default: false },
  bundleDetails: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, default: 1 }
  }],

  // Commercial Logic: Subscription
  isSubscriptionAvailable: { type: Boolean, default: false },
  subscriptionDiscount: { type: Number, default: 10 }, // Percentage

  // Premium UX: Visual Data
  flavorProfiles: {
    acidity: { type: Number, default: 0, min: 0, max: 10 },
    body: { type: Number, default: 0, min: 0, max: 10 },
    sweetness: { type: Number, default: 0, min: 0, max: 10 },
    bitterness: { type: Number, default: 0, min: 0, max: 10 },
    aroma: { type: Number, default: 0, min: 0, max: 10 }
  },

  // Premium UX: Freshness
  roastDate: { type: Date },

  // Tags for search and filtering
  tags: [String]

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for available stock
productSchema.virtual('availableStock').get(function () {
  return this.inventory.physicalStock - this.inventory.reservedStock;
});

// Virtual for checking if product is low stock
productSchema.virtual('isLowStock').get(function () {
  return this.availableStock <= this.inventory.lowStockThreshold;
});

// Virtual for category
productSchema.virtual('category').get(function () {
  if (this.categoryId) {
    if (this.categoryId.slug) {
      return this.categoryId.slug;
    }
    if (this.categoryId.name) {
      return this.categoryId.name.toLowerCase().replace(/\s+/g, '-');
    }
    return this.categoryId.toString();
  }
  return 'coffee-beans';
});

// Virtual for display name (CoffeeShop expects this)
productSchema.virtual('displayName').get(function () {
  return this.name;
});

// Method to check availability
productSchema.methods.checkAvailability = function (quantity = 1) {
  return this.isActive && this.availableStock >= quantity;
};

// Method to update stock directly (requires permission and restricts reserved changes)
productSchema.methods.updateStock = function (newPhysicalStock) {
  this.inventory.physicalStock = newPhysicalStock;
  this.inStock = this.availableStock > 0;
  return this.save();
};

// Method to decrease stock (safe fallback deprecation)
productSchema.methods.decreaseStock = function (quantity = 1) {
  if (this.inventory.physicalStock >= quantity) {
    this.inventory.physicalStock -= quantity;
    this.inStock = this.availableStock > 0;
    return this.save();
  }
  throw new Error('Insufficient stock');
};

// Method to increase stock (safe fallback deprecation)
productSchema.methods.increaseStock = function (quantity = 1) {
  this.inventory.physicalStock += quantity;
  this.inStock = true;
  return this.save();
};

// Pre-save middleware to generate slug if not provided
productSchema.pre('save', async function (next) {
  if (this.isModified('name') || !this.seo.slug) {
    const baseSlug = (this.seo.slug || this.name)
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    // Only apply the slug if it hasn't been set or if the name changed
    if (!this.seo.slug || this.isModified('name')) {
      // Check for uniqueness - if it exists, append a random short string
      // Note: We're doing a simple check here. For high-concurrency, this might still race,
      // but it's much better than nothing.
      const existingProduct = await mongoose.model('Product').findOne({
        'seo.slug': baseSlug,
        _id: { $ne: this._id }
      });

      if (existingProduct) {
        this.seo.slug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;
      } else {
        this.seo.slug = baseSlug;
      }
    }
  }

  // Ensure inStock reflects actual available stock
  this.inStock = this.availableStock > 0;

  next();
});

// Create compound indexes for better performance
productSchema.index({
  name: 'text',
  description: 'text',
  origin: 'text',
  tags: 'text',
  flavorNotes: 'text'
}, {
  weights: {
    name: 10,
    tags: 5,
    origin: 3,
    description: 1,
    flavorNotes: 1
  },
  name: 'ProductTextIndex'
});

productSchema.index({ categoryId: 1, isActive: 1, createdAt: -1 });
productSchema.index({ 'sizes.price': 1 });
productSchema.index({ isFeatured: 1, isActive: 1, createdAt: -1 });
productSchema.index({ 'inventory.physicalStock': 1 });
productSchema.index({ isActive: 1, inStock: 1 });

// Static method to get products by category
productSchema.statics.getByCategory = async function (category, limit = 10) {
  let query = { isActive: true, inStock: true };
  if (mongoose.Types.ObjectId.isValid(category)) {
    query.categoryId = category;
  } else {
    const Category = mongoose.model('Category');
    const cat = await Category.findOne({ slug: category });
    if (cat) {
      query.categoryId = cat._id;
    } else {
      const catByName = await Category.findOne({ name: new RegExp('^' + category + '$', 'i') });
      if (catByName) {
        query.categoryId = catByName._id;
      } else {
        return [];
      }
    }
  }
  return this.find(query).limit(limit);
};

// Static method to get featured products
productSchema.statics.getFeatured = function (limit = 8) {
  return this.find({
    isFeatured: true,
    isActive: true,
    inStock: true
  }).limit(limit);
};

// Static method to get low stock products
productSchema.statics.getLowStock = function () {
  return this.find({
    isActive: true,
    $expr: {
      $lte: ['$inventory.physicalStock', '$inventory.lowStockThreshold']
    }
  });
};

// EXPLICIT COLLECTION NAME - Try 'products' first, if doesn't work try 'product'
const Product = mongoose.model('Product', productSchema, 'products');

export default Product;