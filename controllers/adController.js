import Ad from '../models/Ad.js';
import AdMetric from '../models/AdMetric.js';
import crypto from 'crypto';

// @desc    Get all ads (Admin)
// @route   GET /api/ads
// @access  Private/Admin
export const getAds = async (req, res) => {
    try {
        const ads = await Ad.find({}).sort({ createdAt: -1 });
        res.json({ success: true, count: ads.length, data: ads });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error', error: err.message });
    }
};

// @desc    Get single ad
// @route   GET /api/ads/:id
// @access  Private/Admin
export const getAd = async (req, res) => {
    try {
        const ad = await Ad.findById(req.params.id);
        if (!ad) {
            return res.status(404).json({ success: false, message: 'Ad not found' });
        }
        res.json({ success: true, data: ad });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error', error: err.message });
    }
};

// @desc    Create new ad with priority conflict detection & homepage hero approval gate
// @route   POST /api/ads
// @access  Private/Admin
export const createAd = async (req, res) => {
    try {
        const { placements, startDate, endDate, noExpiry, priority } = req.body;

        if (!startDate) {
            return res.status(400).json({ success: false, message: 'Start date is required.' });
        }

        if (!noExpiry && !endDate) {
            return res.status(400).json({ success: false, message: 'End date is required unless "noExpiry" (No Expiry) is explicitly checked.' });
        }

        const isHomepageHero = Array.isArray(placements) && placements.some(p => ['homepage', 'homepage-hero'].includes(p));
        const userRole = String(req.user?.role || req.user?.userType || '').toLowerCase();
        const isSuperAdmin = ['super-admin', 'superadmin', 'owner'].includes(userRole);

        let isApproved = true;
        let status = req.body.status || 'Active';

        if (isHomepageHero && !isSuperAdmin) {
            isApproved = false;
            status = 'Pending_Approval';
        }

        // Priority conflict detection: check for overlapping active ads
        if (placements && startDate && (endDate || noExpiry) && priority !== undefined) {
            const dateFilter = noExpiry 
                ? { startDate: { $gte: new Date(startDate) } }
                : { startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) } };

            const conflicts = await Ad.find({
                status: { $in: ['Active', 'Draft'] },
                placements: { $in: placements },
                priority: priority,
                ...dateFilter
            });

            if (conflicts.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Priority conflict: ${conflicts.length} ad(s) with priority ${priority} overlap in the same placement(s).`,
                    conflicts: conflicts.map(c => ({
                        id: c._id,
                        title: c.title,
                        placements: c.placements,
                        startDate: c.startDate,
                        endDate: c.endDate,
                        status: c.status
                    }))
                });
            }
        }

        const adData = {
            ...req.body,
            isApproved,
            status
        };

        const ad = await Ad.create(adData);
        res.status(201).json({
            success: true,
            message: isHomepageHero && !isSuperAdmin 
                ? 'Ad created successfully and submitted for Super Admin approval for Homepage Hero placement.' 
                : 'Ad created successfully',
            data: ad
        });
    } catch (err) {
        res.status(400).json({ success: false, message: 'Bad Request', error: err.message });
    }
};

// @desc    Update ad
// @route   PUT /api/ads/:id
// @access  Private/Admin
export const updateAd = async (req, res) => {
    try {
        const ad = await Ad.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!ad) {
            return res.status(404).json({ success: false, message: 'Ad not found' });
        }
        res.json({ success: true, data: ad });
    } catch (err) {
        res.status(400).json({ success: false, message: 'Bad Request', error: err.message });
    }
};

// @desc    Delete ad
// @route   DELETE /api/ads/:id
// @access  Private/Admin
export const deleteAd = async (req, res) => {
    try {
        const ad = await Ad.findByIdAndDelete(req.params.id);
        if (!ad) {
            return res.status(404).json({ success: false, message: 'Ad not found' });
        }
        res.json({ success: true, data: {} });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error', error: err.message });
    }
};

// @desc    Get active ad by placement
// @route   GET /api/ads/placement/:zone
// @access  Public
export const getAdByPlacement = async (req, res) => {
    try {
        const zone = req.params.zone;
        const now = new Date();
        // Find active ads for the zone within current schedule
        let ads = await Ad.find({
            placements: zone,
            status: 'Active',
            startDate: { $lte: now },
            endDate: { $gte: now }
        }).sort({ priority: -1 });

        // Fallback to any active ad for that zone if scheduling check yields nothing
        if (!ads || ads.length === 0) {
            ads = await Ad.find({
                placements: zone,
                status: 'Active'
            }).sort({ priority: -1 });
        }

        if (!ads || ads.length === 0) {
            return res.status(200).json({ success: true, data: null });
        }

        // Pick from the highest priority tier (randomized rotation if tied)
        const highestPriority = ads[0].priority;
        const topAds = ads.filter(ad => ad.priority === highestPriority);
        const selectedAd = topAds[Math.floor(Math.random() * topAds.length)];

        res.json({ success: true, data: selectedAd });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error', error: err.message });
    }
};

// @desc    Track ad impression (writes to both Ad counter and AdMetric time-series)
// @route   POST /api/ads/:id/track/impression
// @access  Public
export const trackImpression = async (req, res) => {
    try {
        const adId = req.params.id;

        // Increment the inline counter for fast reads
        await Ad.findByIdAndUpdate(adId, { $inc: { 'metrics.impressions': 1 } });

        // Write decoupled time-series metric (fire-and-forget for performance)
        const ipRaw = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
        const ipHash = crypto.createHash('sha256').update(ipRaw).digest('hex').slice(0, 16);
        AdMetric.create({
            adId,
            eventType: 'impression',
            metadata: {
                ipHash,
                userAgent: (req.headers['user-agent'] || '').slice(0, 200),
                referrer: (req.headers['referer'] || '').slice(0, 500)
            }
        }).catch(err => console.error('[AdMetric] Impression write failed:', err.message));

        res.status(200).json({ success: true });
    } catch (err) {
        res.status(200).json({ success: false });
    }
};

// @desc    Track ad click (writes to both Ad counter and AdMetric time-series)
// @route   POST /api/ads/:id/track/click
// @access  Public
export const trackClick = async (req, res) => {
    try {
        const adId = req.params.id;

        await Ad.findByIdAndUpdate(adId, { $inc: { 'metrics.clicks': 1 } });

        const ipRaw = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
        const ipHash = crypto.createHash('sha256').update(ipRaw).digest('hex').slice(0, 16);
        AdMetric.create({
            adId,
            eventType: 'click',
            metadata: {
                ipHash,
                userAgent: (req.headers['user-agent'] || '').slice(0, 200),
                referrer: (req.headers['referer'] || '').slice(0, 500)
            }
        }).catch(err => console.error('[AdMetric] Click write failed:', err.message));

        res.status(200).json({ success: true });
    } catch (err) {
        res.status(200).json({ success: false });
    }
};

// @desc    Get ad metrics time-series analytics
// @route   GET /api/ads/metrics
// @access  Private/Admin
export const getAdMetrics = async (req, res) => {
    try {
        const { adId, timeRange = '7d' } = req.query;

        // Calculate date range
        const rangeMap = { '7d': 7, '30d': 30, '90d': 90 };
        const days = rangeMap[timeRange] || 7;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const matchStage = { timestamp: { $gte: since } };
        if (adId) {
            const mongoose = (await import('mongoose')).default;
            matchStage.adId = new mongoose.Types.ObjectId(adId);
        }

        const pipeline = [
            { $match: matchStage },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                        eventType: '$eventType'
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.date': 1 } }
        ];

        const results = await AdMetric.aggregate(pipeline);

        // Transform into { date, impressions, clicks, ctr } series
        const dateMap = {};
        for (const r of results) {
            const date = r._id.date;
            if (!dateMap[date]) {
                dateMap[date] = { date, impressions: 0, clicks: 0, ctr: 0 };
            }
            if (r._id.eventType === 'impression') {
                dateMap[date].impressions = r.count;
            } else if (r._id.eventType === 'click') {
                dateMap[date].clicks = r.count;
            }
        }

        // Compute CTR
        const timeSeries = Object.values(dateMap).map(d => ({
            ...d,
            ctr: d.impressions > 0 ? Math.round((d.clicks / d.impressions) * 10000) / 100 : 0
        }));

        // Get totals
        const totals = timeSeries.reduce(
            (acc, d) => ({
                impressions: acc.impressions + d.impressions,
                clicks: acc.clicks + d.clicks
            }),
            { impressions: 0, clicks: 0 }
        );
        totals.ctr = totals.impressions > 0
            ? Math.round((totals.clicks / totals.impressions) * 10000) / 100
            : 0;

        res.json({
            success: true,
            data: {
                timeRange,
                days,
                totals,
                timeSeries
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error', error: err.message });
    }
};
