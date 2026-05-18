import express from 'express';
import { handleMpesaWebhook, handleStripeWebhook } from '../controllers/webhookController.js';
import mpesaWebhookAuth from '../middleware/mpesaWebhookAuth.js';

const router = express.Router();

// MPESA STK Push Callback (protected by Safaricom IP verification and express.json parser)
router.post('/mpesa', express.json(), mpesaWebhookAuth, handleMpesaWebhook);

// Stripe Webhook (uses raw express body parser for signature validation)
router.post('/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

export default router;
