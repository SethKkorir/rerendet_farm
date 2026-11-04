// routes/emergencyRoutes.js
import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  verifyEmergencyToken,
  executeEmergencyAction,
  getEmergencyStatus
} from '../controllers/emergencyAccessController.js';

const router = express.Router();

// Strict rate limiter for emergency access endpoints (protection against brute force)
const emergencyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 requests per 15 mins per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many emergency requests from this IP address. Please wait 15 minutes.'
  }
});

router.use(emergencyLimiter);

router.post('/verify', verifyEmergencyToken);
router.post('/execute', executeEmergencyAction);
router.get('/status', getEmergencyStatus);

export default router;
