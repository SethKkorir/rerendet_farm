// controllers/userController.js
import User from '../models/User.js';
import asyncHandler from 'express-async-handler';
import Settings from '../models/Settings.js';
import realSendEmail from '../utils/sendEmail.js';
import { getSecurityAlertEmail } from '../utils/emailTemplates.js';

// Dynamic cybersecurity wrapper to strictly prevent administrative/security alerts from being sent to customer accounts.
const sendEmail = async (options) => {
  const isSecurityAlert = options.subject && (
    /security alert/i.test(options.subject) || 
    /account locked/i.test(options.subject) || 
    /password change/i.test(options.subject) || 
    /email changed/i.test(options.subject)
  );

  if (isSecurityAlert) {
    try {
      const user = await User.findOne({ email: options.to }).select('role userType');
      if (user) {
        const isClientAdmin = user.role === 'admin' || user.role === 'super-admin' || user.userType === 'admin';
        if (!isClientAdmin) {
          console.log(`🛡️ [Cybersecurity Boundary] Blocked security alert email dispatch to customer account: ${options.to}`);
          return { success: false, message: 'Security alert muted for customer accounts' };
        }
      }
    } catch (err) {
      console.error('❌ Dynamic email role-check failed:', err.message);
    }
  }

  return realSendEmail(options);
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select('-password +lockUntil +loginAttempts');
  res.json({
    success: true,
    count: users.length,
    data: users
  });
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      res.status(400);
      throw new Error('You cannot delete your own account');
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({
      success: true,
      message: 'User removed successfully'
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');

  if (user) {
    res.json({
      success: true,
      data: user
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    // Track if email is changing for security alert
    const oldEmail = user.email;
    const isEmailChanging = req.body.email && req.body.email !== oldEmail;

    user.firstName = req.body.firstName || user.firstName;
    user.lastName = req.body.lastName || user.lastName;
    user.email = req.body.email || user.email;
    user.phone = req.body.phone || user.phone;
    user.gender = req.body.gender || user.gender;
    user.dateOfBirth = req.body.dateOfBirth || user.dateOfBirth;

    // Only allow role/admin updates if the requester is an admin
    if (req.user.role === 'admin' || req.user.role === 'super-admin') {
      if (req.body.role) {
        // Prevent recursive escalation
        if (req.body.role === 'super-admin' && req.user.role !== 'super-admin') {
          // Ignore or throw error
        } else {
          user.role = req.body.role;
        }
      }
      if (req.body.isActive !== undefined) user.isActive = req.body.isActive;
      if (req.body.isVerified !== undefined) user.isVerified = req.body.isVerified;
      if (req.body.unlock === true) {
        user.loginAttempts = 0;
        user.lockUntil = undefined;
      }
    }

    const updatedUser = await user.save();

    // Send security alert if email was changed (sent to OLD email as warning)
    if (isEmailChanging) {
      try {
        let logoUrl;
        try {
          const settings = await Settings.getSettings();
          logoUrl = settings?.store?.logo;
        } catch (e) { }

        await sendEmail({
          to: oldEmail,
          subject: 'Security Alert: Account Email Changed',
          html: getSecurityAlertEmail(user.firstName, `Your account email address was changed to: ${req.body.email}`, logoUrl)
        });
      } catch (err) {
        console.error('Failed to send email change alert:', err);
      }
    }

    res.json({
      success: true,
      data: {
        id: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        isAdmin: updatedUser.isAdmin,
        isVerified: updatedUser.isVerified,
        gender: updatedUser.gender,
        dateOfBirth: updatedUser.dateOfBirth
      }
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Get top spenders (CRM)
// @route   GET /api/users/crm/top-spenders
// @access  Private/Admin
const getTopSpenders = asyncHandler(async (req, res) => {
  const topSpenders = await User.aggregate([
    {
      $lookup: {
        from: 'orders',
        localField: '_id',
        foreignField: 'user',
        as: 'orders'
      }
    },
    {
      $project: {
        firstName: 1,
        lastName: 1,
        email: 1,
        totalSpent: { $sum: '$orders.totalAmount' },
        orderCount: { $size: '$orders' },
        loyaltyPoints: 1
      }
    },
    { $sort: { totalSpent: -1 } },
    { $limit: 10 }
  ]);

  res.json({ success: true, data: topSpenders });
});

// @desc    Get customer insights (AOV, etc.)
// @route   GET /api/users/crm/insights
// @access  Private/Admin
const getCustomerInsights = asyncHandler(async (req, res) => {
  const insights = await User.aggregate([
    {
      $lookup: {
        from: 'orders',
        localField: '_id',
        foreignField: 'user',
        as: 'orders'
      }
    },
    { $match: { 'orders.0': { $exists: true } } }, // Only customers with at least one order
    {
      $project: {
        avgOrderValue: { $avg: '$orders.totalAmount' },
        totalSpent: { $sum: '$orders.totalAmount' },
        orderCount: { $size: '$orders' }
      }
    },
    {
      $group: {
        _id: null,
        averageAOV: { $avg: '$avgOrderValue' },
        totalRevenue: { $sum: '$totalSpent' },
        totalOrders: { $sum: '$orderCount' }
      }
    }
  ]);

  res.json({ success: true, data: insights[0] || {} });
});

export { getUsers, deleteUser, getUserById, updateUser, getTopSpenders, getCustomerInsights };
