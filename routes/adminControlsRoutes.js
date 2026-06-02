// routes/adminControlsRoutes.js - MODULAR CONTROLS (GAP 6)
import express from 'express';
import asyncHandler from 'express-async-handler';
import { protect } from '../middleware/authMiddleware.js';
import { assertActiveAdmin } from '../middleware/assertActiveAdmin.js';
import { requirePermission } from '../middleware/permissions.js';
import OperationalControls from '../models/OperationalControls.js';
import { logActivity } from '../utils/activityLogger.js';
import { createAlert } from '../models/AdminAlert.js';
import User from '../models/User.js';
import sendEmail from '../utils/sendEmail.js';

const router = express.Router();

router.use(protect, assertActiveAdmin, requirePermission('settings.manage'));

// GET /api/admin/controls
router.get('/', asyncHandler(async (req, res) => {
  const controls = await OperationalControls.getControls();
  res.json({ success: true, data: controls });
}));

// PATCH /api/admin/controls
router.patch('/', asyncHandler(async (req, res) => {
  const {
    ordersEnabled,
    mpesaEnabled,
    cashOnDeliveryEnabled,
    categoryOverrides,
    hourlyOrderCap,
    activationReason
  } = req.body;

  const controls = await OperationalControls.getControls();

  // Validate activationReason if toggling anything off
  const isShuttingDown = 
    (typeof ordersEnabled !== 'undefined' && ordersEnabled === false && controls.ordersEnabled !== false) ||
    (typeof mpesaEnabled !== 'undefined' && mpesaEnabled === false && controls.mpesaEnabled !== false) ||
    (typeof cashOnDeliveryEnabled !== 'undefined' && cashOnDeliveryEnabled === false && controls.cashOnDeliveryEnabled !== false);

  if (isShuttingDown && (!activationReason || activationReason.trim().length < 10)) {
    res.status(400);
    throw new Error('Activation reason is required and must be at least 10 characters long whenever shutting down a control.');
  }

  // Update fields
  if (typeof ordersEnabled !== 'undefined') controls.ordersEnabled = ordersEnabled;
  if (typeof mpesaEnabled !== 'undefined') controls.mpesaEnabled = mpesaEnabled;
  if (typeof cashOnDeliveryEnabled !== 'undefined') controls.cashOnDeliveryEnabled = cashOnDeliveryEnabled;
  if (typeof categoryOverrides !== 'undefined') controls.categoryOverrides = categoryOverrides;
  if (typeof hourlyOrderCap !== 'undefined') controls.hourlyOrderCap = hourlyOrderCap;

  controls.lastModifiedBy = req.user._id;
  controls.lastModifiedAt = new Date();
  if (activationReason) controls.activationReason = activationReason;

  await controls.save();

  // Audit log write
  await logActivity(req, 'SYSTEM_OVERRIDE', `Operational controls updated: orders=${controls.ordersEnabled}, mpesa=${controls.mpesaEnabled}, cod=${controls.cashOnDeliveryEnabled}`, null, {
    actionCategory: 'system_event',
    activationReason
  });

  // Create AdminAlert
  if (isShuttingDown) {
    await createAlert(
      'critical',
      'killswitch_event',
      `Operational control shutdown event triggered. Reason: ${activationReason}`,
      { lastModifiedBy: req.user._id }
    );
  }

  res.json({ success: true, data: controls });
}));

export default router;
