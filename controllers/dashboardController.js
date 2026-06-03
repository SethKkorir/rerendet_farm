import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import Address from '../models/Address.js';
import PaymentMethod from '../models/PaymentMethod.js';
import Order from '../models/Order.js';
import Contact from '../models/Contact.js';

// @desc    Get dashboard data
// @route   GET /api/dashboard/data
// @access  Private
const getDashboardData = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [
    user,
    addresses,
    paymentMethods,
    recentOrders,
    ordersCount
  ] = await Promise.all([
    User.findById(userId),
    Address.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 }),
    PaymentMethod.find({ user: userId, isActive: true }).sort({ isDefault: -1, createdAt: -1 }),
    Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('items.product', 'name images'),
    Order.countDocuments({ user: userId })
  ]);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        profilePicture: user.profilePicture
      },
      addresses: addresses || [],
      paymentMethods: paymentMethods || [],
      recentOrders: recentOrders || [],
      stats: {
        totalOrders: ordersCount,
        loyaltyPoints: user.loyalty?.points || 0,
        loyaltyTier: user.loyalty?.tier || 'Bronze'
      }
    }
  });
});

// @desc    Update user profile
// @route   PUT /api/dashboard/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, dateOfBirth, gender } = req.body;
  const userId = req.user._id;

  if (!firstName || !lastName) {
    res.status(400);
    throw new Error('First name and last name are required');
  }

  const user = await User.findByIdAndUpdate(
    userId,
    {
      firstName,
      lastName,
      phone,
      dateOfBirth,
      gender
    },
    {
      new: true,
      runValidators: true
    }
  );

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth
      }
    }
  });
});

// @desc    Update user preferences
// @route   PUT /api/dashboard/preferences
// @access  Private
const updatePreferences = asyncHandler(async (req, res) => {
  const { favoriteRoast, brewMethod } = req.body;
  const userId = req.user._id;

  const user = await User.findByIdAndUpdate(
    userId,
    {
      preferences: {
        favoriteRoast,
        brewMethod
      }
    },
    {
      new: true,
      runValidators: true
    }
  );

  res.json({
    success: true,
    message: 'Preferences updated successfully',
    data: {
      preferences: user.preferences
    }
  });
});

// @desc    Get user addresses
// @route   GET /api/dashboard/addresses
// @access  Private
const getAddresses = asyncHandler(async (req, res) => {
  const addresses = await Address.find({ user: req.user._id })
    .sort({ isDefault: -1, createdAt: -1 });

  res.json({
    success: true,
    data: addresses
  });
});

// @desc    Add new address
// @route   POST /api/dashboard/addresses
// @access  Private
const addAddress = asyncHandler(async (req, res) => {
  const { type, name, street, city, postalCode, country, isDefault, instructions } = req.body;

  if (!name || !street || !city || !postalCode) {
    res.status(400);
    throw new Error('Please fill in all required address fields');
  }

  const address = await Address.create({
    user: req.user._id,
    type,
    name,
    street,
    city,
    postalCode,
    country: country || 'Kenya',
    isDefault: isDefault || false,
    instructions
  });

  res.status(201).json({
    success: true,
    message: 'Address added successfully',
    data: address
  });
});

// @desc    Update address
// @route   PUT /api/dashboard/addresses/:id
// @access  Private
const updateAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!address) {
    res.status(404);
    throw new Error('Address not found');
  }

  const updatedAddress = await Address.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    message: 'Address updated successfully',
    data: updatedAddress
  });
});

// @desc    Delete address
// @route   DELETE /api/dashboard/addresses/:id
// @access  Private
const deleteAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!address) {
    res.status(404);
    throw new Error('Address not found');
  }

  if (address.isDefault) {
    res.status(400);
    throw new Error('Cannot delete default address');
  }

  await Address.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Address deleted successfully'
  });
});

// @desc    Get payment methods
// @route   GET /api/dashboard/payment-methods
// @access  Private
const getPaymentMethods = asyncHandler(async (req, res) => {
  const paymentMethods = await PaymentMethod.find({ 
    user: req.user._id,
    isActive: true 
  }).sort({ isDefault: -1, createdAt: -1 });

  res.json({
    success: true,
    data: paymentMethods
  });
});

// @desc    Add payment method
// @route   POST /api/dashboard/payment-methods
// @access  Private
const addPaymentMethod = asyncHandler(async (req, res) => {
  const { type, name, phone, card, isDefault } = req.body;

  if (!name || !type) {
    res.status(400);
    throw new Error('Payment method name and type are required');
  }

  if (type === 'mpesa' && !phone) {
    res.status(400);
    throw new Error('Phone number is required for M-Pesa');
  }

  const paymentMethod = await PaymentMethod.create({
    user: req.user._id,
    type,
    name,
    phone,
    card,
    isDefault: isDefault || false
  });

  res.status(201).json({
    success: true,
    message: 'Payment method added successfully',
    data: paymentMethod
  });
});

// @desc    Update payment method
// @route   PUT /api/dashboard/payment-methods/:id
// @access  Private
const updatePaymentMethod = asyncHandler(async (req, res) => {
  const paymentMethod = await PaymentMethod.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!paymentMethod) {
    res.status(404);
    throw new Error('Payment method not found');
  }

  const updatedPaymentMethod = await PaymentMethod.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    message: 'Payment method updated successfully',
    data: updatedPaymentMethod
  });
});

// @desc    Delete payment method
// @route   DELETE /api/dashboard/payment-methods/:id
// @access  Private
const deletePaymentMethod = asyncHandler(async (req, res) => {
  const paymentMethod = await PaymentMethod.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!paymentMethod) {
    res.status(404);
    throw new Error('Payment method not found');
  }

  if (paymentMethod.isDefault) {
    res.status(400);
    throw new Error('Cannot delete default payment method');
  }

  await PaymentMethod.findByIdAndUpdate(
    req.params.id,
    { isActive: false }
  );

  res.json({
    success: true,
    message: 'Payment method deleted successfully'
  });
});

// @desc    Update password
// @route   PUT /api/dashboard/security/password
// @access  Private
const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user._id;

  if (!currentPassword || !newPassword) {
    res.status(400);
    throw new Error('Please provide current and new password');
  }

  if (newPassword.length < 8) {
    res.status(400);
    throw new Error('Password must be at least 8 characters long');
  }

  const user = await User.findById(userId).select('+password');

  if (!(await user.comparePassword(currentPassword))) {
    res.status(401);
    throw new Error('Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();

  res.json({
    success: true,
    message: 'Password updated successfully'
  });
});

// @desc    Get user orders
// @route   GET /api/dashboard/orders
// @access  Private
const getOrders = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [orders, totalOrders] = await Promise.all([
    Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('items.product', 'name images'),
    Order.countDocuments({ user: userId })
  ]);

  res.json({
    success: true,
    data: {
      orders,
      pagination: {
        page,
        limit,
        total: totalOrders,
        pages: Math.ceil(totalOrders / limit)
      }
    }
  });
});

// @desc    Get security settings
// @route   GET /api/dashboard/security/settings
// @access  Private
const getSecuritySettings = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('twoFactorAuth lastLoginAt loginHistory');

  res.json({
    success: true,
    data: {
      twoFactorEnabled: user.twoFactorAuth?.enabled || false,
      lastLogin: user.lastLoginAt,
      loginHistory: user.loginHistory || []
    }
  });
});

// @desc    Enable 2FA
// @route   POST /api/dashboard/security/2fa/enable
// @access  Private
const enable2FA = asyncHandler(async (req, res) => {
  // For now, return a placeholder since 2FA implementation requires additional setup
  res.json({
    success: true,
    message: '2FA setup initiated',
    data: {
      qrCode: 'placeholder-qr-code-url',
      secret: 'placeholder-secret'
    }
  });
});

// @desc    Verify 2FA
// @route   POST /api/dashboard/security/2fa/verify
// @access  Private
const verify2FA = asyncHandler(async (req, res) => {
  const { token } = req.body;
  
  // Placeholder verification
  if (!token) {
    res.status(400);
    throw new Error('Verification token is required');
  }

  // For now, just mark 2FA as enabled
  await User.findByIdAndUpdate(req.user._id, {
    'twoFactorAuth.enabled': true,
    'twoFactorAuth.enabledAt': new Date()
  });

  res.json({
    success: true,
    message: '2FA enabled successfully'
  });
});

// @desc    Disable 2FA
// @route   POST /api/dashboard/security/2fa/disable
// @access  Private
const disable2FA = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    'twoFactorAuth.enabled': false,
    'twoFactorAuth.disabledAt': new Date()
  });

  res.json({
    success: true,
    message: '2FA disabled successfully'
  });
});

// @desc    Get login history
// @route   GET /api/dashboard/security/login-history
// @access  Private
const getLoginHistory = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('loginHistory');
  
  res.json({
    success: true,
    data: user.loginHistory || []
  });
});

// @desc    Delete user account
// @route   DELETE /api/dashboard/account
// @access  Private
const deleteAccount = asyncHandler(async (req, res) => {
  const { confirmation } = req.body;

  if (!confirmation || confirmation !== 'DELETE MY ACCOUNT') {
    res.status(400);
    throw new Error('Please type "DELETE MY ACCOUNT" to confirm account deletion');
  }

  const user = await User.findById(req.user._id);

  // Soft delete - mark as inactive
  user.isActive = false;
  user.email = `deleted_${Date.now()}@deleted.com`;
  await user.save();

  res.json({
    success: true,
    message: 'Account deleted successfully'
  });
});

// @desc    Get support tickets for current user
// @route   GET /api/dashboard/tickets
// @access  Private
const getTickets = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const tickets = await Contact.find({ user: userId })
    .sort({ createdAt: -1 })
    .populate('order', 'orderNumber total status');

  res.json({
    success: true,
    data: tickets
  });
});

// @desc    Create a support ticket attached to user and optionally an order ID
// @route   POST /api/dashboard/tickets
// @access  Private
const createTicket = asyncHandler(async (req, res) => {
  const { subject, message, orderId } = req.body;
  const userId = req.user._id;

  if (!subject || !message) {
    res.status(400);
    throw new Error('Please provide subject and message');
  }

  let resolvedOrderId = orderId || null;
  let resolvedOrderNumber = null;

  // Let's parse order number from subject or message if orderId is not provided
  if (!resolvedOrderId) {
    const orderNumRegex = /(?:RND-|RF-|#)?([0-9]{4,10})/i;
    const match = subject.match(orderNumRegex) || message.match(orderNumRegex);
    if (match) {
      resolvedOrderNumber = match[1];
    }
  }

  // Look up order in database
  let orderDoc = null;
  const Order = (await import('../models/Order.js')).default;
  if (resolvedOrderId) {
    orderDoc = await Order.findById(resolvedOrderId);
  } else if (resolvedOrderNumber) {
    orderDoc = await Order.findOne({
      $or: [
        { orderNumber: resolvedOrderNumber },
        { orderNumber: `RND-${resolvedOrderNumber}` },
        { orderNumber: `RF-${resolvedOrderNumber}` }
      ]
    });
  }

  let linkedOrderId = null;
  let linkedOrderSnapshot = null;
  if (orderDoc) {
    linkedOrderId = orderDoc._id;
    linkedOrderSnapshot = {
      orderNumber: orderDoc.orderNumber,
      total: orderDoc.total,
      fulfillmentStatus: orderDoc.fulfillmentStatus,
      paymentStatus: orderDoc.paymentStatus,
      orderStatus: orderDoc.orderStatus,
      createdAt: orderDoc.createdAt
    };
  }

  const slaDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Create ticket
  const ticket = await Contact.create({
    user: userId,
    name: `${req.user.firstName} ${req.user.lastName}`,
    email: req.user.email,
    subject,
    message,
    order: linkedOrderId || undefined,
    linkedOrderId,
    linkedOrderSnapshot,
    slaDeadline,
    status: 'new'
  });

  res.status(201).json({
    success: true,
    message: 'Support ticket opened successfully. Our team will review it.',
    data: ticket
  });
});

export {
  getDashboardData,
  updateProfile,
  updatePreferences,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  getPaymentMethods,
  addPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  updatePassword,
  getOrders,
  getSecuritySettings,
  enable2FA,
  verify2FA,
  disable2FA,
  getLoginHistory,
  deleteAccount,
  getTickets,
  createTicket
};