import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import StoreCreditTransaction from '../models/StoreCreditTransaction.js';
import LoyaltyTransaction from '../models/LoyaltyTransaction.js';

// @desc    Get user store credit history
// @route   GET /api/customer/store-credit/history
// @access  Private
export const getStoreCreditHistory = asyncHandler(async (req, res) => {
  const history = await StoreCreditTransaction.find({ userId: req.user._id })
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: history
  });
});

// @desc    Get user loyalty points history
// @route   GET /api/customer/loyalty/history
// @access  Private
export const getLoyaltyPointsHistory = asyncHandler(async (req, res) => {
  const history = await LoyaltyTransaction.find({ userId: req.user._id })
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: history
  });
});

// @desc    Get reorder consumption alert prompt
// @route   GET /api/customer/reorder-prompt
// @access  Private
export const getReorderPrompt = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const lastOrderDate = user.lastOrderDate;
  const averageReorderDays = user.averageReorderDays;

  if (!averageReorderDays || !lastOrderDate) {
    return res.json({
      success: true,
      shouldPrompt: false,
      daysUntilRunningLow: 0
    });
  }

  const now = new Date();
  const nextReorderDate = new Date(new Date(lastOrderDate).getTime() + averageReorderDays * 24 * 60 * 60 * 1000);
  const promptThresholdDate = new Date(new Date(lastOrderDate).getTime() + averageReorderDays * 0.8 * 24 * 60 * 60 * 1000);

  const diffDaysToPrompt = (promptThresholdDate - now) / (1000 * 60 * 60 * 24);
  const daysUntilRunningLow = Math.max(0, Math.ceil((nextReorderDate - now) / (1000 * 60 * 60 * 24)));

  // prompt if we are past the 80% mark, or within 3 days of it
  const shouldPrompt = (now >= promptThresholdDate) || (diffDaysToPrompt <= 3);

  res.json({
    success: true,
    shouldPrompt: !!shouldPrompt,
    daysUntilRunningLow
  });
});
