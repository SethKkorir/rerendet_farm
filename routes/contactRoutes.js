// routes/contactRoutes.js
import express from 'express';
import rateLimit from 'express-rate-limit';
import { submitContactInquiry } from '../controllers/contactController.js';

const router = express.Router();

// Rate limiter for contact submissions (max 5 per 15 minutes per IP)
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many messages sent from this IP. Please try again in 15 minutes.'
  }
});

router.post('/', contactLimiter, submitContactInquiry);

export default router;
