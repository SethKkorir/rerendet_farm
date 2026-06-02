import express from 'express';
import { handleMpesaWebhook, handleStripeWebhook } from '../controllers/webhookController.js';
import mpesaWebhookAuth, { mpesaCallbackRateLimiter } from '../middleware/mpesaWebhookAuth.js';

const router = express.Router();

// MPESA STK Push Callback — guarded by: rate limiter → Safaricom IP check → handler
router.post('/mpesa', express.json(), mpesaCallbackRateLimiter, mpesaWebhookAuth, handleMpesaWebhook);

// Stripe Webhook (uses raw express body parser for signature validation)
router.post('/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

export default router;
