import asyncHandler from 'express-async-handler';
import Review from '../models/Review.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Testimonial from '../models/Testimonial.js';
import { ensureTestimonialsSeeded } from './marketingController.js';

// @desc    Add a product review
// @route   POST /api/reviews/:productId
// @access  Private
const createProductReview = asyncHandler(async (req, res) => {
    const { rating, comment } = req.body;
    const productId = req.params.productId;

    const product = await Product.findById(productId);

    if (!product) {
        res.status(404);
        throw new Error('Product not found');
    }

    const alreadyReviewed = await Review.findOne({
        user: req.user._id,
        product: productId
    });

    if (alreadyReviewed) {
        res.status(400);
        throw new Error('Product already reviewed');
    }

    // Check if it's a verified purchase
    const hasOrdered = await Order.findOne({
        user: req.user._id,
        'items.product': productId,
        status: 'delivered'
    });

    const review = await Review.create({
        name: req.user.firstName + ' ' + req.user.lastName,
        rating: Number(rating),
        comment,
        user: req.user._id,
        product: productId,
        isVerifiedPurchase: !!hasOrdered
    });

    // Update product ratings
    const reviews = await Review.find({ product: productId });
    product.ratings.count = reviews.length;
    product.ratings.average = reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length;

    await product.save();

    res.status(201).json({
        success: true,
        message: 'Review added successfully',
        data: review
    });
});

// @desc    Get all reviews for a product
// @route   GET /api/reviews/:productId
// @access  Public
const getProductReviews = asyncHandler(async (req, res) => {
    const reviews = await Review.find({ product: req.params.productId })
        .sort({ createdAt: -1 })
        .populate('user', 'firstName lastName profilePicture');

    res.json({
        success: true,
        data: reviews
    });
});

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private/Admin
const deleteReview = asyncHandler(async (req, res) => {
    const review = await Review.findById(req.params.id);

    if (!review) {
        res.status(404);
        throw new Error('Review not found');
    }

    // Only the author or an admin can delete
    if (review.user.toString() !== req.user._id.toString() && req.user.userType !== 'admin') {
        res.status(401);
        throw new Error('Not authorized to delete this review');
    }



    const productId = review.product;
    await review.deleteOne();

    // Recalculate product rating
    const reviews = await Review.find({ product: productId });
    const product = await Product.findById(productId);

    if (product) {
        product.ratings.count = reviews.length;
        product.ratings.average = reviews.length > 0
            ? reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length
            : 0;
        await product.save();
    }

    res.json({
        success: true,
        message: 'Review removed'
    });
});



// @desc    Create a general site review
// @route   POST /api/reviews
// @access  Private
const createSiteReview = asyncHandler(async (req, res) => {
    const { rating, comment } = req.body;
    const authorName = (req.user.firstName + ' ' + (req.user.lastName || '')).trim() || req.user.name || 'Valued Customer';

    const review = await Review.create({
        name: authorName,
        rating: Number(rating) || 5,
        comment,
        user: req.user._id,
        isVerifiedPurchase: true
    });

    // Also persist into Testimonial collection so it immediately appears in Admin Testimonials
    try {
        await Testimonial.create({
            author: authorName,
            role: 'Verified Buyer',
            rating: Number(rating) || 5,
            text: comment,
            avatar: req.user.profilePicture || '',
            isActive: true,
            isVerified: true
        });
    } catch (tErr) {
        console.error('Failed to sync to Testimonial collection:', tErr.message);
    }

    res.status(201).json({
        success: true,
        message: 'Review submitted successfully',
        data: review
    });
});

// @desc    Get top reviews / testimonials for storefront
// @route   GET /api/reviews/top
// @access  Public
const getTopReviews = asyncHandler(async (req, res) => {
    await ensureTestimonialsSeeded();

    // Query active storefront testimonials directly from Testimonial collection
    let activeTestimonials = await Testimonial.find({ isActive: true }).sort({ displayOrder: 1, createdAt: -1 });

    // Fallback: If all are inactive, activate them to prevent mismatched or missing storefront reviews
    if (!activeTestimonials || activeTestimonials.length === 0) {
        await Testimonial.updateMany({}, { isActive: true });
        activeTestimonials = await Testimonial.find({ isActive: true }).sort({ displayOrder: 1, createdAt: -1 });
    }

    return res.json({
        success: true,
        count: activeTestimonials.length,
        data: activeTestimonials.map(t => ({
            _id: t._id,
            name: t.author,
            author: t.author,
            role: t.role || 'Verified Buyer',
            rating: t.rating || 5,
            comment: t.text,
            text: t.text,
            avatar: t.avatar || '',
            isVerifiedPurchase: t.isVerified ?? true
        }))
    });
});

export {
    createProductReview,
    getProductReviews,
    deleteReview,
    createSiteReview,
    getTopReviews
};
