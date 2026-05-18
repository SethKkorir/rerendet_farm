// controllers/cartController.js
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';

// Utility function to calculate cart totals dynamically from settings
const calculateCartTotals = async (items) => {
  const { default: Settings } = await import('../models/Settings.js');
  const settings = await Settings.getSettings();
  const taxRate = settings?.payment?.taxRate ?? 0;
  const standardShipping = settings?.payment?.shippingPrice ?? 500;
  const freeThreshold = settings?.payment?.freeShippingThreshold ?? 5000;

  const subtotal = items.reduce((total, item) => total + (item.price * item.quantity), 0);
  const itemsCount = items.reduce((total, item) => total + item.quantity, 0);
  
  // Free shipping check
  const shippingPrice = subtotal >= freeThreshold ? 0 : standardShipping;
  
  // Dynamic VAT
  const taxPrice = Math.round(subtotal * taxRate);
  
  const finalPrice = subtotal + shippingPrice + taxPrice;

  return {
    items,
    itemsCount,
    subtotal,
    shippingPrice,
    taxPrice,
    finalPrice,
    currency: 'KES'
  };
};

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
const getCart = asyncHandler(async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id })
      .populate('items.product', 'name images price inventory isActive slug');

    if (!cart) {
      cart = await Cart.create({
        user: req.user._id,
        ...(await calculateCartTotals([]))
      });
    }

    const cartData = {
      ...cart.toObject(),
      ...(await calculateCartTotals(cart.items))
    };

    res.json({
      success: true,
      data: cartData,
      message: cart.items.length === 0 ? 'Your cart is empty' : 'Cart retrieved successfully'
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500);
    throw new Error('Failed to get cart');
  }
});

// @desc    Add item to cart
// @route   POST /api/cart/items
// @access  Private
const addToCart = asyncHandler(async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      res.status(400);
      throw new Error('Product ID is required');
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      res.status(400);
      throw new Error('Quantity must be a positive integer');
    }

    const product = await Product.findById(productId);
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    if (!product.isActive) {
      res.status(400);
      throw new Error('Product is not available');
    }

    if (product.inventory.stock < quantity) {
      res.status(400);
      throw new Error(`Only ${product.inventory.stock} items available in stock`);
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (existingItemIndex > -1) {
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;
      
      if (newQuantity > product.inventory.stock) {
        res.status(400);
        throw new Error(`Cannot add more items. Only ${product.inventory.stock} available in stock`);
      }

      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      const productImage = product.images?.[0]?.url || '/images/coffee/placeholder.jpg';
      
      cart.items.push({
        product: productId,
        name: product.name,
        image: productImage,
        price: product.price,
        quantity: quantity,
        addedAt: new Date()
      });
    }

    const totals = await calculateCartTotals(cart.items);
    Object.assign(cart, totals);

    await cart.save();
    await cart.populate('items.product', 'name images price inventory isActive slug');

    res.status(200).json({
      success: true,
      message: 'Product added to cart successfully',
      data: cart
    });

  } catch (error) {
    console.error('Add to cart error:', error);
    throw error;
  }
});

// @desc    Update cart item quantity
// @route   PUT /api/cart/items/:itemId
// @access  Private
const updateCartItem = asyncHandler(async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!Number.isInteger(quantity) || quantity < 0) {
      res.status(400);
      throw new Error('Quantity must be a non-negative integer');
    }

    if (quantity === 0) {
      return removeFromCart(req, res);
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      res.status(404);
      throw new Error('Cart not found');
    }

    const item = cart.items.id(itemId);
    if (!item) {
      res.status(404);
      throw new Error('Item not found in cart');
    }

    if (quantity > item.quantity) {
      const product = await Product.findById(item.product);
      if (!product) {
        res.status(404);
        throw new Error('Product not found');
      }
      
      if (quantity > product.inventory.stock) {
        res.status(400);
        throw new Error(`Only ${product.inventory.stock} items available in stock`);
      }
    }

    item.quantity = quantity;

    const totals = await calculateCartTotals(cart.items);
    Object.assign(cart, totals);

    await cart.save();
    await cart.populate('items.product', 'name images price inventory isActive slug');

    res.json({
      success: true,
      message: 'Cart item updated successfully',
      data: cart
    });

  } catch (error) {
    console.error('Update cart item error:', error);
    throw error;
  }
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/items/:itemId
// @access  Private
const removeFromCart = asyncHandler(async (req, res) => {
  try {
    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      res.status(404);
      throw new Error('Cart not found');
    }

    const item = cart.items.id(itemId);
    if (!item) {
      res.status(404);
      throw new Error('Item not found in cart');
    }

    cart.items.pull(itemId);

    const totals = await calculateCartTotals(cart.items);
    Object.assign(cart, totals);

    await cart.save();
    await cart.populate('items.product', 'name images price inventory isActive slug');

    res.json({
      success: true,
      message: 'Item removed from cart',
      data: cart
    });

  } catch (error) {
    console.error('Remove from cart error:', error);
    throw error;
  }
});

// @desc    Clear entire cart
// @route   DELETE /api/cart
// @access  Private
const clearCart = asyncHandler(async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    
    if (cart) {
      cart.items = [];
      const totals = await calculateCartTotals(cart.items);
      Object.assign(cart, totals);
      await cart.save();
    }

    const emptyCart = cart || await Cart.create({
      user: req.user._id,
      ...(await calculateCartTotals([]))
    });

    res.json({
      success: true,
      message: 'Cart cleared successfully',
      data: emptyCart
    });

  } catch (error) {
    console.error('Clear cart error:', error);
    throw error;
  }
});

// @desc    Get cart summary
// @route   GET /api/cart/summary
// @access  Private
const getCartSummary = asyncHandler(async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    
    const summary = cart ? {
      itemsCount: cart.itemsCount || 0,
      totalPrice: cart.finalPrice || 0,
      uniqueItemsCount: cart.items.length || 0
    } : {
      itemsCount: 0,
      totalPrice: 0,
      uniqueItemsCount: 0
    };

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Get cart summary error:', error);
    throw error;
  }
});

// @desc    Merge guest cart with user cart
// @route   POST /api/cart/merge
// @access  Private
const mergeCarts = asyncHandler(async (req, res) => {
  try {
    const { guestCart } = req.body;

    if (!guestCart || !guestCart.items) {
      res.status(400);
      throw new Error('Guest cart data is required');
    }

    let userCart = await Cart.findOne({ user: req.user._id });
    
    if (!userCart) {
      userCart = new Cart({ user: req.user._id, items: [] });
    }

    let mergedItems = false;
    const mergeResults = {
      added: 0,
      updated: 0,
      skipped: 0
    };

    for (const guestItem of guestCart.items) {
      try {
        const product = await Product.findById(guestItem.product);
        if (!product || !product.isActive) {
          mergeResults.skipped++;
          continue;
        }

        const existingItem = userCart.items.find(item => 
          item.product.toString() === guestItem.product.toString()
        );

        if (existingItem) {
          const newQuantity = existingItem.quantity + guestItem.quantity;
          if (newQuantity <= product.inventory.stock) {
            existingItem.quantity = newQuantity;
            mergeResults.updated++;
            mergedItems = true;
          } else {
            mergeResults.skipped++;
          }
        } else {
          if (guestItem.quantity <= product.inventory.stock) {
            userCart.items.push({
              product: guestItem.product,
              name: guestItem.name,
              image: guestItem.image,
              price: guestItem.price,
              quantity: guestItem.quantity,
              addedAt: new Date()
            });
            mergeResults.added++;
            mergedItems = true;
          } else {
            mergeResults.skipped++;
          }
        }
      } catch (error) {
        console.warn('Skipping invalid guest cart item:', error.message);
        mergeResults.skipped++;
      }
    }

    if (mergedItems) {
      const totals = await calculateCartTotals(userCart.items);
      Object.assign(userCart, totals);
      await userCart.save();
    }

    await userCart.populate('items.product', 'name images price inventory isActive slug');

    res.json({
      success: true,
      message: mergedItems ? 'Carts merged successfully' : 'No items to merge',
      data: userCart,
      mergeResults
    });

  } catch (error) {
    console.error('Merge carts error:', error);
    throw error;
  }
});

export {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartSummary,
  mergeCarts
};