// routes/subscriptionRoutes.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getMySubscriptions,
  createSubscription,
  pauseSubscription,
  resumeSubscription,
  skipNextDelivery,
  updateSubscriptionFrequency,
  cancelSubscription
} from '../controllers/subscriptionController.js';

const router = express.Router();

// All subscription routes are protected (customer only)
router.use(protect);

router.route('/')
  .get(getMySubscriptions)
  .post(createSubscription);

router.get('/mine', getMySubscriptions);
router.put('/:id/pause', pauseSubscription);
router.put('/:id/resume', resumeSubscription);
router.put('/:id/skip', skipNextDelivery);
router.put('/:id/frequency', updateSubscriptionFrequency);
router.put('/:id/cancel', cancelSubscription);

export default router;
