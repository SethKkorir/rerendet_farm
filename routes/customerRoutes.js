import express from 'express';
import {
  getStoreCreditHistory,
  getLoyaltyPointsHistory,
  getReorderPrompt
} from '../controllers/customerController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/store-credit/history', protect, getStoreCreditHistory);
router.get('/loyalty/history', protect, getLoyaltyPointsHistory);
router.get('/reorder-prompt', protect, getReorderPrompt);

export default router;
