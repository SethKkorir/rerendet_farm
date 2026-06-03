import express from 'express';
import {
    getAds,
    getAd,
    createAd,
    updateAd,
    deleteAd,
    getAdByPlacement,
    trackImpression,
    trackClick,
    getAdMetrics
} from '../controllers/adController.js';

const router = express.Router();

import { protect, admin } from '../middleware/authMiddleware.js';

// Public tracking and placement fetching
router.get('/placement/:zone', getAdByPlacement);
router.post('/:id/track/impression', trackImpression);
router.post('/:id/track/click', trackClick);

// Admin only routes
router.get('/metrics', protect, admin, getAdMetrics);

router.route('/')
    .get(protect, admin, getAds)
    .post(protect, admin, createAd);

router.route('/:id')
    .get(protect, admin, getAd)
    .put(protect, admin, updateAd)
    .delete(protect, admin, deleteAd);

export default router;
