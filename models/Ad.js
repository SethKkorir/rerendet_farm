import mongoose from 'mongoose';
import { sanitizeString } from '../utils/inputSanitizer.js';

const adSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['banner', 'featured_product', 'sponsored_listing', 'flash_deal', 'popup'],
        required: true
    },
    placements: [{
        type: String,
        enum: ['homepage', 'homepage-hero', 'cart', 'dashboard', 'search_sidebar', 'products_list', 'category-page', 'checkout-banner', 'popup-modal']
    }],
    mediaUrl: {
        type: String
    },
    targetUrl: {
        type: String
    },
    content: {
        headline: { type: String, trim: true },
        subText: { type: String, trim: true },
        ctaText: { type: String, default: 'Shop Now' }
    },
    linkedProductId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    },
    discountPercent: {
        type: Number,
        min: 0,
        max: 100
    },
    originalPrice: {
        type: Number
    },
    budgetCents: {
        type: Number,
        default: 0
    },
    spentCents: {
        type: Number,
        default: 0
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date
    },
    noExpiry: {
        type: Boolean,
        default: false
    },
    isApproved: {
        type: Boolean,
        default: false
    },
    priority: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['Draft', 'Active', 'Paused', 'Completed', 'Pending_Approval'],
        default: 'Draft'
    },
    metrics: {
        impressions: { type: Number, default: 0 },
        clicks: { type: Number, default: 0 }
    }
}, {
    timestamps: true
});

// Pre-save hook: Sanitize promotional ad fields against XSS
adSchema.pre('save', function (next) {
    if (this.title) this.title = sanitizeString(this.title);
    if (this.content) {
        if (this.content.headline) this.content.headline = sanitizeString(this.content.headline);
        if (this.content.subText) this.content.subText = sanitizeString(this.content.subText);
        if (this.content.ctaText) this.content.ctaText = sanitizeString(this.content.ctaText);
    }
    if (this.targetUrl) this.targetUrl = sanitizeString(this.targetUrl);
    if (this.mediaUrl) this.mediaUrl = sanitizeString(this.mediaUrl);
    next();
});

const Ad = mongoose.model('Ad', adSchema);
export default Ad;
