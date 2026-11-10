// routes/cronRoutes.js
import express from 'express';
import asyncHandler from 'express-async-handler';
import Settings from '../models/Settings.js';
import { rotateAndEmailMagicLink } from '../controllers/settingsController.js';
import { expireUnpaidPaybillOrders } from '../services/orderExpiryService.js';

const router = express.Router();

// @desc    Cron endpoint to expire unpaid Paybill orders and release reserved stock
// @route   POST /api/cron/expire-orders (and GET)
// @access  Protected by Bearer Token (CRON_SECRET) or internal admin
const handleExpireOrders = asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET || 'fallback_default_cron_secret_777';

  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== cronSecret) {
    // Also allow if called from authenticated internal admin session
    if (!req.user || !['admin', 'super-admin'].includes(req.user.role)) {
      console.warn(`🚨 Unauthorized Cron attempt from IP: ${req.ip}`);
      return res.status(401).json({ success: false, message: 'Unauthorized. Invalid Cron Secret.' });
    }
  }

  console.log('🔄 Cron Executing: Expiring unpaid Paybill orders...');
  const result = await expireUnpaidPaybillOrders();
  res.json({
    success: true,
    message: 'Expired orders processed successfully.',
    data: result
  });
});

router.post('/expire-orders', handleExpireOrders);
router.get('/expire-orders', handleExpireOrders);

// @desc    Cron endpoint to rotate and silent-email the maintenance magic link
// @route   GET /api/cron/magic-link-rotation
// @access  Protected by Bearer Token (CRON_SECRET)
router.get('/magic-link-rotation', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET || 'fallback_default_cron_secret_777';

  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== cronSecret) {
    console.warn(`🚨 Unauthorized Cron attempt from IP: ${req.ip}`);
    return res.status(401).json({ success: false, message: 'Unauthorized. Invalid Cron Secret.' });
  }

  console.log('🔄 Cron Executing: Rotating emergency maintenance magic link...');
  
  const settings = await Settings.getSettings();
  const magicLink = await rotateAndEmailMagicLink(settings, req.get('host'));

  console.log('✅ Cron Success: Magic link rotated and emailed silently to Super Admin.');

  res.json({
    success: true,
    message: 'Magic link rotated and emailed successfully.',
    expires: settings.maintenance.magicLinkExpires
  });
}));

export default router;
