import asyncHandler from 'express-async-handler';
import Coupon from '../models/Coupon.js';
import { logActivity } from '../utils/activityLogger.js';

// @desc    Get all coupons
// @route   GET /api/admin/coupons
// @access  Private/Admin
const getCoupons = asyncHandler(async (req, res) => {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json({
        success: true,
        data: coupons
    });
});

// @desc    Create a coupon
// @route   POST /api/admin/coupons
// @access  Private/Admin
const createCoupon = asyncHandler(async (req, res) => {
    const { code, discountType, discountAmount, expiryDate, usageLimit, minOrderAmount } = req.body;

    if (!code || !discountType || !discountAmount || !expiryDate) {
        res.status(400);
        throw new Error('Please provide all required fields including expiry date.');
    }

    const expDate = new Date(expiryDate);
    if (isNaN(expDate.getTime()) || expDate <= new Date()) {
        res.status(400);
        throw new Error('Expiry date must be a valid future date.');
    }

    const cap = parseInt(usageLimit || 100);
    if (isNaN(cap) || cap <= 0) {
        res.status(400);
        throw new Error('Redemption cap (usage limit) must be greater than 0.');
    }

    const couponExists = await Coupon.findOne({ code: code.toUpperCase() });
    if (couponExists) {
        res.status(400);
        throw new Error('Coupon code already exists');
    }

    // High-value discount approval check (>30% or >KES 2000)
    const isHighValue = (discountType === 'percentage' && Number(discountAmount) > 30) ||
                        (discountType === 'fixed' && Number(discountAmount) > 2000);

    const userRole = String(req.user?.role || req.user?.userType || '').toLowerCase();
    const isSuperAdmin = ['super-admin', 'superadmin'].includes(userRole);

    if (isHighValue && !isSuperAdmin) {
        res.status(403);
        throw new Error('Coupons with >30% discount or >KES 2,000 value require Super Admin approval to create.');
    }

    const coupon = await Coupon.create({
        code: code.toUpperCase(),
        discountType,
        discountAmount,
        expiryDate: expDate,
        usageLimit: cap,
        minOrderAmount: minOrderAmount || 0,
        isActive: true
    });

    logActivity(req.user._id, 'COUPON_CREATE', `Created coupon: ${coupon.code}`);

    res.status(201).json({
        success: true,
        message: 'Coupon created successfully',
        data: coupon
    });
});

// @desc    Update a coupon
// @route   PUT /api/admin/coupons/:id
// @access  Private/Admin
const updateCoupon = asyncHandler(async (req, res) => {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
        res.status(404);
        throw new Error('Coupon not found');
    }

    const { code, discountType, discountAmount, expiryDate, usageLimit, minOrderAmount, isActive } = req.body;

    if (code) coupon.code = code.toUpperCase();
    if (discountType) coupon.discountType = discountType;
    if (discountAmount !== undefined) coupon.discountAmount = discountAmount;
    if (expiryDate) coupon.expiryDate = expiryDate;
    if (usageLimit !== undefined) coupon.usageLimit = usageLimit;
    if (minOrderAmount !== undefined) coupon.minOrderAmount = minOrderAmount;
    if (isActive !== undefined) coupon.isActive = isActive;

    const updatedCoupon = await coupon.save();

    logActivity(req.user._id, 'COUPON_UPDATE', `Updated coupon: ${updatedCoupon.code}`);

    res.json({
        success: true,
        message: 'Coupon updated successfully',
        data: updatedCoupon
    });
});

// @desc    Toggle coupon status
// @route   PATCH /api/admin/coupons/:id/toggle
// @access  Private/Admin
const toggleCouponStatus = asyncHandler(async (req, res) => {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
        res.status(404);
        throw new Error('Coupon not found');
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    logActivity(req.user._id, 'COUPON_TOGGLE', `${coupon.isActive ? 'Activated' : 'Deactivated'} coupon: ${coupon.code}`);

    res.json({
        success: true,
        message: `Coupon ${coupon.isActive ? 'activated' : 'deactivated'} successfully`,
        data: coupon
    });
});

// @desc    Delete a coupon
// @route   DELETE /api/admin/coupons/:id
// @access  Private/Admin
const deleteCoupon = asyncHandler(async (req, res) => {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
        res.status(404);
        throw new Error('Coupon not found');
    }

    const code = coupon.code;
    await coupon.deleteOne();

    logActivity(req.user._id, 'COUPON_DELETE', `Deleted coupon: ${code}`);

    res.json({
        success: true,
        message: 'Coupon deleted successfully'
    });
});

export {
    getCoupons,
    createCoupon,
    updateCoupon,
    toggleCouponStatus,
    deleteCoupon
};
