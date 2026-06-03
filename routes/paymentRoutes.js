import express from 'express';
import {
    simulateMpesaWebhook,
    processCardPayment,
    processMpesaPayment,
    checkMpesaPaymentStatus,
    createPayPalOrder,
    capturePayPalOrder
} from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public webhook (called by simulated provider or sandbox callback checks)
router.post('/mpesa/callback', simulateMpesaWebhook);

// Protected payment routes (called by frontend client)
router.use(protect);

router.post('/card', processCardPayment);
router.post('/mpesa/stk', processMpesaPayment);
router.post('/mpesa/stk-push', processMpesaPayment);
router.get('/mpesa/status/:checkoutRequestId', checkMpesaPaymentStatus);

// PayPal integration
router.post('/paypal/create-order', createPayPalOrder);
router.post('/paypal/capture-order', capturePayPalOrder);

export default router;