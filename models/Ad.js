import mongoose from 'mongoose';

const adSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['banner', 'featured_product', 'sponsored_listing', 'flash_deal'],
        required: true
    },
    placements: [{
        type: String,
        enum: ['homepage', 'cart', 'dashboard', 'search_sidebar', 'products_list']
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
        type: Date,
        required: true
    },
    priority: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['Draft', 'Active', 'Paused', 'Completed'],
        default: 'Draft'
    },
    metrics: {
        impressions: { type: Number, default: 0 },
        clicks: { type: Number, default: 0 }
    }
}, {
    timestamps: true
});

const Ad = mongoose.model('Ad', adSchema);
export default Ad;
