import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { createOrder, getUserOrders } from '../controllers/checkoutController.js';

const router = express.Router();

router.route('/')
  .post(protect, createOrder)
  .get(protect, getUserOrders);

export default router;