import express from 'express';
import Stripe from 'stripe';
import { handleMpesaWebhook, handleStripeWebhook } from '../controllers/webhookController.js';
import mpesaWebhookAuth, { mpesaCallbackRateLimiter } from '../middleware/mpesaWebhookAuth.js';

const router = express.Router();

// MPESA STK Push Callback — guarded by: rate limiter → Safaricom IP check → handler
router.post('/mpesa', express.json(), mpesaCallbackRateLimiter, mpesaWebhookAuth, handleMpesaWebhook);

// Stripe Webhook (uses raw express body parser for signature validation)
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  (req, res, next) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const rawBody = req.rawBody || req.body;
      stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
      next();
    } catch (err) {
      return res.status(400).send('Webhook signature verification failed');
    }
  },
  handleStripeWebhook
);

export default router;
