import express from 'express';
import {
  createOrder,
  getUserOrders,
  getOrderById,
  getOrders,
  updateOrderStatus,
  calculateShippingCost,
  generateOrderInvoice,
  validateCoupon,
  logAbandonedCheckout,
  getAbandonedCheckouts,
  cancelOrder
} from '../controllers/orderController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { checkoutLimiter } from '../middleware/checkoutRateLimit.js';

const router = express.Router();

// Public routes
router.post('/shipping-cost', calculateShippingCost);

// Protected routes
router.use(protect);

// Customer routes - Apply rate limiting to checkout
router.post('/validate-coupon', validateCoupon);
router.post('/abandoned', logAbandonedCheckout);
router.post('/', checkoutLimiter, createOrder);
router.get('/my', getUserOrders);
router.post('/:id/cancel', cancelOrder);

// Admin routes — MUST be before /:id to avoid being swallowed by the wildcard
router.get('/abandoned', admin, getAbandonedCheckouts);
router.get('/', admin, getOrders);
router.put('/:id/status', admin, updateOrderStatus);

// /:id routes LAST — wildcard must not swallow named routes above
router.get('/:id', getOrderById);
router.get('/:id/invoice', generateOrderInvoice);

export default router;