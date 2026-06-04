import mongoose from 'mongoose';

const attributeSchemaDef = new mongoose.Schema({
  key: { type: String, required: true },
  label: { type: String, required: true },
  type: {
    type: String,
    enum: ['text', 'number', 'select', 'boolean', 'unit_weight', 'unit_volume', 'unit_length'],
    required: true
  },
  options: [String],
  unit: String,
  required: { type: Boolean, default: false },
  defaultValue: mongoose.Schema.Types.Mixed
}, { _id: false });

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true
  },
  slug: {
    type: String,
    unique: true
  },
  description: String,
  icon: String,
  attributeSchema: {
    type: [attributeSchemaDef],
    validate: {
      validator: function (attrs) {
        if (!Array.isArray(attrs)) return false;
        for (let i = 0; i < attrs.length; i++) {
          const attr = attrs[i];
          if (!attr.label || typeof attr.label !== 'string' || attr.label.trim() === '') {
            throw new Error(`Attribute validation failed: label must be a non-empty string at index ${i}`);
          }
          if (!attr.key || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(attr.key)) {
            throw new Error(`Attribute validation failed: key must be alphanumeric/underscores only and start with a letter or underscore at index ${i}`);
          }
          if (attr.type === 'select') {
            if (!Array.isArray(attr.options) || attr.options.length === 0) {
              throw new Error(`Attribute validation failed: type 'select' requires a non-empty options array at index ${i}`);
            }
          }
          if (['unit_weight', 'unit_volume', 'unit_length'].includes(attr.type)) {
            if (!attr.unit || typeof attr.unit !== 'string' || attr.unit.trim() === '') {
              throw new Error(`Attribute validation failed: type '${attr.type}' requires a non-empty unit string at index ${i}`);
            }
          }
        }
        return true;
      },
      message: 'Attribute validation failed.'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ isActive: 1, sortOrder: 1 });

categorySchema.pre('save', function (next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
  next();
});

categorySchema.statics.seedCategories = async function () {
  const initialCategories = [
    {
      name: 'Coffee',
      slug: 'coffee',
      description: 'Premium coffee beans, ground coffee, and specialty blends.',
      icon: 'coffee',
      sortOrder: 1,
      attributeSchema: [
        { key: 'roastLevel', label: 'Roast Level', type: 'select', options: ['light', 'medium-light', 'medium', 'medium-dark', 'dark', 'espresso'], required: true },
        { key: 'origin', label: 'Origin', type: 'text', required: false },
        { key: 'processMethod', label: 'Process Method', type: 'text', required: false },
        { key: 'packageWeight', label: 'Package Weight', type: 'unit_weight', required: false, unit: 'g' }
      ]
    },
    {
      name: 'Vegetables',
      slug: 'vegetables',
      description: 'Fresh farm-sourced organic vegetables.',
      icon: 'leaf',
      sortOrder: 2,
      attributeSchema: [
        { key: 'freshnessDays', label: 'Freshness Days', type: 'number', required: false },
        { key: 'packageWeight', label: 'Package Weight', type: 'unit_weight', required: false, unit: 'kg' },
        { key: 'organic', label: 'Organic', type: 'boolean', required: false, defaultValue: false }
      ]
    },
    {
      name: 'Textiles/Curtains',
      slug: 'textiles-curtains',
      description: 'Beautiful woven curtains, fabrics, and farm textiles.',
      icon: 'scissors',
      sortOrder: 3,
      attributeSchema: [
        { key: 'material', label: 'Material', type: 'text', required: false },
        { key: 'dimensions', label: 'Dimensions', type: 'text', required: false },
        { key: 'color', label: 'Color', type: 'text', required: false },
        { key: 'careInstructions', label: 'Care Instructions', type: 'text', required: false }
      ]
    },
    {
      name: 'Utensils',
      slug: 'utensils',
      description: 'Durable kitchenware, cups, plates, and utensils.',
      icon: 'cutlery',
      sortOrder: 4,
      attributeSchema: [
        { key: 'material', label: 'Material', type: 'text', required: false },
        { key: 'pieceCount', label: 'Piece Count', type: 'number', required: false },
        { key: 'dishwasherSafe', label: 'Dishwasher Safe', type: 'boolean', required: false, defaultValue: true }
      ]
    }
  ];

  for (const cat of initialCategories) {
    await this.findOneAndUpdate(
      { name: cat.name },
      cat,
      { upsert: true, new: true, runValidators: true }
    );
  }
  console.log('🌱 Initial categories seeded successfully.');
};

const Category = mongoose.model('Category', categorySchema);
export default Category;
export { Category };
