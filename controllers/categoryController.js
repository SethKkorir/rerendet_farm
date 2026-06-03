import Category from '../models/Category.js';
import Product from '../models/Product.js';
import asyncHandler from 'express-async-handler';

// @desc    Get all categories
// @route   GET /api/admin/categories
// @access  Private/Admin
export const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({}).sort({ sortOrder: 1, name: 1 });
  res.json({
    success: true,
    data: categories
  });
});

// @desc    Create a category
// @route   POST /api/admin/categories
// @access  Private/Admin
export const createCategory = asyncHandler(async (req, res) => {
  const { name, description, icon, attributeSchema, sortOrder } = req.body;

  if (!name) {
    res.status(400);
    throw new Error('Category name is required');
  }

  const categoryExists = await Category.findOne({ name });
  if (categoryExists) {
    res.status(400);
    throw new Error('Category with this name already exists');
  }

  const category = await Category.create({
    name,
    description,
    icon,
    attributeSchema: attributeSchema || [],
    sortOrder: sortOrder || 0
  });

  res.status(201).json({
    success: true,
    data: category
  });
});

// @desc    Update a category
// @route   PUT /api/admin/categories/:id
// @access  Private/Admin
export const updateCategory = asyncHandler(async (req, res) => {
  const { name, description, icon, attributeSchema, sortOrder, isActive } = req.body;
  const category = await Category.findById(req.params.id);

  if (!category) {
    res.status(404);
    throw new Error('Category not found');
  }

  if (name) category.name = name;
  if (description !== undefined) category.description = description;
  if (icon !== undefined) category.icon = icon;
  if (attributeSchema !== undefined) category.attributeSchema = attributeSchema;
  if (sortOrder !== undefined) category.sortOrder = sortOrder;
  if (isActive !== undefined) category.isActive = isActive;

  const updatedCategory = await category.save();
  res.json({
    success: true,
    data: updatedCategory
  });
});

// @desc    Delete a category (soft-deactivate if no active products reference it)
// @route   DELETE /api/admin/categories/:id
// @access  Private/Admin
export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    res.status(404);
    throw new Error('Category not found');
  }

  // Refuse delete if referenced by active products
  const activeProductsCount = await Product.countDocuments({
    categoryId: category._id,
    isActive: true
  });

  if (activeProductsCount > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete category. It is referenced by ${activeProductsCount} active product(s).`
    });
  }

  category.isActive = false;
  await category.save();

  res.json({
    success: true,
    message: 'Category deactivated successfully',
    data: category
  });
});
