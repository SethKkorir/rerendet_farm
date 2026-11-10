// controllers/marketingController.js
import asyncHandler from 'express-async-handler';
import Campaign from '../models/Campaign.js';
import Subscriber from '../models/Subscriber.js';
import User from '../models/User.js';
import Testimonial from '../models/Testimonial.js';
import sendEmail from '../utils/sendEmail.js';
import { getNewsletterEmail } from '../utils/emailTemplates.js';

// ─── Helper: build recipient list ───────────────────────────────
const buildRecipientList = async (audience = 'all') => {
    if (audience === 'subscribers') {
        return Subscriber.find({ isSubscribed: true }).select('email');
    }
    if (audience === 'customers') {
        return User.find({ userType: 'customer', isActive: true }).select('email firstName');
    }
    if (audience === 'inactive') {
        const thirtyDays = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return User.find({ userType: 'customer', lastLogin: { $lt: thirtyDays } }).select('email firstName');
    }
    // 'all' = both subscribers + customers (deduplicated by email)
    const [subs, customers] = await Promise.all([
        Subscriber.find({ isSubscribed: true }).select('email'),
        User.find({ userType: 'customer', isActive: true }).select('email firstName')
    ]);
    const emails = new Map();
    subs.forEach(s => emails.set(s.email, s));
    customers.forEach(c => emails.set(c.email, c));
    return Array.from(emails.values());
};

// ─── Helper: send in batches ─────────────────────────────────────
const sendInBatches = async (recipients, subject, html, batchSize = 10) => {
    let sent = 0, failed = 0;
    for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        const results = await Promise.allSettled(
            batch.map(r => sendEmail({ to: r.email, subject, html }))
        );
        results.forEach(r => r.status === 'fulfilled' ? sent++ : failed++);
    }
    return { sent, failed };
};

// ─────────────────────────────────────────────────────────────────
// @desc    Get all campaigns
// @route   GET /api/marketing/campaigns
// @access  Private/Admin
export const getCampaigns = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status, type } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (type && type !== 'all') filter.type = type;

    const [campaigns, total] = await Promise.all([
        Campaign.find(filter)
            .populate('createdBy', 'firstName lastName')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit)),
        Campaign.countDocuments(filter)
    ]);

    res.json({
        success: true,
        data: {
            campaigns,
            pagination: { current: parseInt(page), pages: Math.ceil(total / limit), total }
        }
    });
});

// @desc    Get single campaign
// @route   GET /api/marketing/campaigns/:id
// @access  Private/Admin
export const getCampaign = asyncHandler(async (req, res) => {
    const campaign = await Campaign.findById(req.params.id).populate('createdBy', 'firstName lastName');
    if (!campaign) { res.status(404); throw new Error('Campaign not found'); }
    res.json({ success: true, data: campaign });
});

// @desc    Create campaign
// @route   POST /api/marketing/campaigns
// @access  Private/Admin
export const createCampaign = asyncHandler(async (req, res) => {
    const { title, subject, content, type, scheduledAt, targetAudience } = req.body;

    if (!title || !subject || !content) {
        res.status(400);
        throw new Error('Title, subject, and content are required');
    }

    const campaign = await Campaign.create({
        title, subject, content,
        type: type || 'newsletter',
        status: scheduledAt ? 'scheduled' : 'draft',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        targetAudience: targetAudience || 'all',
        createdBy: req.user._id
    });

    res.status(201).json({ success: true, message: 'Campaign created', data: campaign });
});

// @desc    Update campaign
// @route   PUT /api/marketing/campaigns/:id
// @access  Private/Admin
export const updateCampaign = asyncHandler(async (req, res) => {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) { res.status(404); throw new Error('Campaign not found'); }
    if (campaign.status === 'sent') {
        res.status(400); throw new Error('Cannot edit a sent campaign');
    }

    const allowed = ['title', 'subject', 'content', 'type', 'scheduledAt', 'targetAudience', 'status'];
    allowed.forEach(field => {
        if (req.body[field] !== undefined) campaign[field] = req.body[field];
    });

    await campaign.save();
    res.json({ success: true, message: 'Campaign updated', data: campaign });
});

// @desc    Delete campaign
// @route   DELETE /api/marketing/campaigns/:id
// @access  Private/Admin
export const deleteCampaign = asyncHandler(async (req, res) => {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) { res.status(404); throw new Error('Campaign not found'); }
    await campaign.deleteOne();
    res.json({ success: true, message: 'Campaign deleted' });
});

// @desc    Send campaign immediately
// @route   POST /api/marketing/campaigns/:id/send
// @access  Private/Admin
export const sendCampaign = asyncHandler(async (req, res) => {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) { res.status(404); throw new Error('Campaign not found'); }
    if (campaign.status === 'sent') { res.status(400); throw new Error('Campaign already sent'); }
    if (campaign.status === 'sending') { res.status(400); throw new Error('Campaign is already being sent'); }

    // Mark as sending first
    campaign.status = 'sending';
    await campaign.save();

    // Get recipients
    const recipients = await buildRecipientList(campaign.targetAudience);

    if (recipients.length === 0) {
        campaign.status = 'failed';
        await campaign.save();
        res.status(400); throw new Error('No recipients found for the selected audience');
    }

    // Fire and forget — respond immediately then send
    res.json({
        success: true,
        message: `Campaign is being sent to ${recipients.length} recipient(s)`,
        data: { recipientCount: recipients.length }
    });

    // Send async after response
    try {
        const finalHtml = campaign.content.includes('<html') 
            ? campaign.content 
            : getNewsletterEmail(campaign.subject || campaign.title, campaign.content);
        const { sent, failed } = await sendInBatches(recipients, campaign.subject, finalHtml);
        campaign.status = 'sent';
        campaign.sentAt = new Date();
        campaign.stats.totalSent = sent;
        campaign.stats.delivered = sent;
        campaign.stats.bounces = failed;
        await campaign.save();
        console.log(`✅ Campaign "${campaign.title}" sent: ${sent} delivered, ${failed} failed`);
    } catch (err) {
        campaign.status = 'failed';
        await campaign.save();
        console.error(`❌ Campaign send error: ${err.message}`);
    }
});

// @desc    Get marketing stats (overview)
// @route   GET /api/marketing/stats
// @access  Private/Admin
export const getMarketingStats = asyncHandler(async (req, res) => {
    const [
        totalCampaigns,
        sentCampaigns,
        draftCampaigns,
        scheduledCampaigns,
        totalSubscribers,
        activeSubscribers,
        totalSentEmails,
        aggStats
    ] = await Promise.all([
        Campaign.countDocuments(),
        Campaign.countDocuments({ status: 'sent' }),
        Campaign.countDocuments({ status: 'draft' }),
        Campaign.countDocuments({ status: 'scheduled' }),
        Subscriber.countDocuments(),
        Subscriber.countDocuments({ isSubscribed: true }),
        Campaign.aggregate([{ $group: { _id: null, total: { $sum: '$stats.totalSent' } } }]),
        Campaign.aggregate([{
            $group: {
                _id: null,
                totalOpens: { $sum: '$stats.opens' },
                totalClicks: { $sum: '$stats.clicks' },
                totalSent: { $sum: '$stats.totalSent' }
            }
        }])
    ]);

    const agg = aggStats[0] || { totalOpens: 0, totalClicks: 0, totalSent: 0 };
    const openRate = agg.totalSent > 0 ? ((agg.totalOpens / agg.totalSent) * 100).toFixed(1) : '0.0';
    const clickRate = agg.totalSent > 0 ? ((agg.totalClicks / agg.totalSent) * 100).toFixed(1) : '0.0';

    res.json({
        success: true,
        data: {
            campaigns: { total: totalCampaigns, sent: sentCampaigns, draft: draftCampaigns, scheduled: scheduledCampaigns },
            subscribers: { total: totalSubscribers, active: activeSubscribers, unsubscribed: totalSubscribers - activeSubscribers },
            email: {
                totalSent: totalSentEmails[0]?.total || 0,
                openRate: parseFloat(openRate),
                clickRate: parseFloat(clickRate)
            }
        }
    });
});

// @desc    Get all subscribers (with pagination + filter)
// @route   GET /api/marketing/subscribers
// @access  Private/Admin
export const getSubscribers = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status, search } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (status === 'active') filter.isSubscribed = true;
    if (status === 'unsubscribed') filter.isSubscribed = false;
    if (search) filter.email = { $regex: search, $options: 'i' };

    const [subscribers, total] = await Promise.all([
        Subscriber.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
        Subscriber.countDocuments(filter)
    ]);

    res.json({
        success: true,
        data: {
            subscribers,
            pagination: { current: parseInt(page), pages: Math.ceil(total / limit), total }
        }
    });
});

// @desc    Delete subscriber
// @route   DELETE /api/marketing/subscribers/:id
// @access  Private/Admin
export const deleteSubscriber = asyncHandler(async (req, res) => {
    const subscriber = await Subscriber.findById(req.params.id);
    if (!subscriber) { res.status(404); throw new Error('Subscriber not found'); }
    await subscriber.deleteOne();
    res.json({ success: true, message: 'Subscriber removed' });
});

// @desc    Bulk delete subscribers
// @route   DELETE /api/marketing/subscribers/bulk
// @access  Private/Admin
export const bulkDeleteSubscribers = asyncHandler(async (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        res.status(400); throw new Error('No subscriber IDs provided');
    }
    const result = await Subscriber.deleteMany({ _id: { $in: ids } });
    res.json({ success: true, message: `${result.deletedCount} subscriber(s) removed` });
});

// @desc    Export subscribers as CSV
// @route   GET /api/marketing/subscribers/export
// @access  Private/Admin
export const exportSubscribers = asyncHandler(async (req, res) => {
    const subscribers = await Subscriber.find({ isSubscribed: true }).select('email createdAt');

    const csvLines = ['Email,Subscribed Date'];
    subscribers.forEach(s => {
        csvLines.push(`${s.email},${new Date(s.createdAt).toLocaleDateString('en-KE')}`);
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="subscribers-${Date.now()}.csv"`);
    res.send(csvLines.join('\n'));
});

// ═══════════════════════════════════════════════════════════════
// ── TESTIMONIALS / STOREFRONT SOCIAL PROOF ────────────────────
// ═══════════════════════════════════════════════════════════════

const SEED_TESTIMONIALS = [
    {
        author: 'Josephine Chebet',
        role: 'Verified Buyer',
        rating: 5,
        text: 'The floral aroma when opening the bag is remarkable. Brewing this via V60 brings out crisp citrus notes and a lingering honey sweetness.',
        isActive: true,
        displayOrder: 1
    },
    {
        author: 'David Mwangi',
        role: 'Highland Espresso Lover',
        rating: 5,
        text: 'The medium roast from the Nandi Highlands has completely elevated my morning ritual. Fresh, aromatic, and delightfully balanced.',
        isActive: true,
        displayOrder: 2
    },
    {
        author: 'Sarah Jenkins',
        role: 'Specialty Coffee Club',
        rating: 5,
        text: 'Exceptional bean density and rich golden crema. Hands down the purest single-origin Arabica available in Kenya.',
        isActive: true,
        displayOrder: 3
    },
    {
        author: 'Brian Kipkorir',
        role: 'Home Barista',
        rating: 5,
        text: 'Direct trade from local highlands makes all the difference. Smooth sweet finish without bitterness. I order a fresh batch every fortnight.',
        isActive: true,
        displayOrder: 4
    }
];

export const ensureTestimonialsSeeded = async () => {
    try {
        const count = await Testimonial.countDocuments();
        if (count === 0) {
            await Testimonial.insertMany(SEED_TESTIMONIALS);
            console.log('✅ Default marketing testimonials seeded');
        }
    } catch (err) {
        console.error('Failed to seed default testimonials:', err.message);
    }
};

// @desc    Get all testimonials (Admin)
// @route   GET /api/marketing/testimonials
// @access  Private/Admin
export const getAdminTestimonials = asyncHandler(async (req, res) => {
    await ensureTestimonialsSeeded();
    const { search, status } = req.query;
    const filter = {};
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;
    if (search) {
        filter.$or = [
            { author: { $regex: search, $options: 'i' } },
            { role: { $regex: search, $options: 'i' } },
            { text: { $regex: search, $options: 'i' } }
        ];
    }
    const testimonials = await Testimonial.find(filter).sort({ displayOrder: 1, createdAt: -1 });
    res.json({ success: true, count: testimonials.length, data: testimonials });
});

// @desc    Get public active testimonials for storefront
// @route   GET /api/marketing/testimonials/public
// @access  Public
export const getPublicTestimonials = asyncHandler(async (req, res) => {
    await ensureTestimonialsSeeded();
    let testimonials = await Testimonial.find({ isActive: true }).sort({ displayOrder: 1, createdAt: -1 });
    if (!testimonials || testimonials.length === 0) {
        await Testimonial.updateMany({}, { isActive: true });
        testimonials = await Testimonial.find({ isActive: true }).sort({ displayOrder: 1, createdAt: -1 });
    }
    res.json({ success: true, count: testimonials.length, data: testimonials });
});

// @desc    Create a testimonial (Admin)
// @route   POST /api/marketing/testimonials
// @access  Private/Admin
export const createTestimonial = asyncHandler(async (req, res) => {
    const { author, role, rating = 5, text, avatar, isActive = true, displayOrder = 0 } = req.body;
    if (!author || !text) {
        res.status(400);
        throw new Error('Author name and testimonial text are required');
    }
    const testimonial = await Testimonial.create({
        author: author.trim(),
        role: (role || 'Verified Buyer').trim(),
        rating: Math.min(5, Math.max(1, Number(rating) || 5)),
        text: text.trim(),
        avatar: avatar ? avatar.trim() : '',
        isActive: Boolean(isActive),
        displayOrder: Number(displayOrder) || 0
    });
    res.status(201).json({ success: true, message: 'Testimonial created successfully', data: testimonial });
});

// @desc    Update a testimonial (Admin)
// @route   PUT /api/marketing/testimonials/:id
// @access  Private/Admin
export const updateTestimonial = asyncHandler(async (req, res) => {
    const testimonial = await Testimonial.findById(req.params.id);
    if (!testimonial) {
        res.status(404);
        throw new Error('Testimonial not found');
    }
    const { author, role, rating, text, avatar, isActive, displayOrder } = req.body;
    if (author !== undefined) testimonial.author = author.trim();
    if (role !== undefined) testimonial.role = role.trim();
    if (rating !== undefined) testimonial.rating = Math.min(5, Math.max(1, Number(rating) || 5));
    if (text !== undefined) testimonial.text = text.trim();
    if (avatar !== undefined) testimonial.avatar = avatar ? avatar.trim() : '';
    if (isActive !== undefined) testimonial.isActive = Boolean(isActive);
    if (displayOrder !== undefined) testimonial.displayOrder = Number(displayOrder) || 0;

    await testimonial.save();
    res.json({ success: true, message: 'Testimonial updated successfully', data: testimonial });
});

// @desc    Toggle testimonial active status (Admin)
// @route   PATCH /api/marketing/testimonials/:id/toggle
// @access  Private/Admin
export const toggleTestimonial = asyncHandler(async (req, res) => {
    const testimonial = await Testimonial.findById(req.params.id);
    if (!testimonial) {
        res.status(404);
        throw new Error('Testimonial not found');
    }
    testimonial.isActive = !testimonial.isActive;
    await testimonial.save();
    res.json({
        success: true,
        message: `Testimonial is now ${testimonial.isActive ? 'visible' : 'hidden'} on storefront`,
        data: testimonial
    });
});

// @desc    Delete a testimonial (Admin)
// @route   DELETE /api/marketing/testimonials/:id
// @access  Private/Admin
export const deleteTestimonial = asyncHandler(async (req, res) => {
    const testimonial = await Testimonial.findById(req.params.id);
    if (!testimonial) {
        res.status(404);
        throw new Error('Testimonial not found');
    }
    await testimonial.deleteOne();
    res.json({ success: true, message: 'Testimonial deleted successfully' });
});
