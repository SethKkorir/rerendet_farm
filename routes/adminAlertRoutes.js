// routes/adminAlertRoutes.js - BACKEND ROUTING FOR INTENTIONAL TIERED NOTIFICATIONS (GAP 1)
import express from 'express';
import asyncHandler from 'express-async-handler';
import { protect } from '../middleware/authMiddleware.js';
import { assertActiveAdmin } from '../middleware/assertActiveAdmin.js';
import { requirePermission } from '../middleware/permissions.js';
import AdminAlert from '../models/AdminAlert.js';
import { logActivity } from '../utils/activityLogger.js';

const router = express.Router();

router.use(protect, assertActiveAdmin, requirePermission('orders.read'));

// GET /api/admin/alerts - Returns all unresolved alerts grouped by type
router.get('/', asyncHandler(async (req, res) => {
  const alerts = await AdminAlert.find({ isResolved: false })
    .populate('orderId', 'orderNumber total')
    .populate('productId', 'name')
    .sort({ createdAt: -1 });

  const critical = [];
  const warning = [];
  const info = [];

  alerts.forEach(alert => {
    if (alert.type === 'critical') critical.push(alert);
    else if (alert.type === 'warning') warning.push(alert);
    else info.push(alert);
  });

  res.json({
    success: true,
    data: {
      critical,
      warning,
      info,
      counts: {
        critical: critical.length,
        warning: warning.length,
        info: info.length
      }
    }
  });
}));

// PATCH /api/admin/alerts/resolve-all - Bulk resolves all active alerts
router.patch('/resolve-all', asyncHandler(async (req, res) => {
  const { type } = req.body || {};
  const filter = { isResolved: false };
  if (type && ['critical', 'warning', 'info'].includes(type)) {
    filter.type = type;
  }

  const result = await AdminAlert.updateMany(filter, {
    $set: {
      isResolved: true,
      resolvedBy: req.user._id,
      resolvedAt: new Date()
    }
  });

  await logActivity(
    req,
    'RESOLVE_ALERT',
    `Bulk resolved ${result.modifiedCount} alerts (${type || 'all types'})`,
    'BULK',
    { actionCategory: 'system_event' }
  );

  res.json({
    success: true,
    message: `Resolved ${result.modifiedCount} alerts`,
    modifiedCount: result.modifiedCount
  });
}));

// PATCH /api/admin/alerts/:id/resolve - Resolves an alert
router.patch('/:id/resolve', asyncHandler(async (req, res) => {
  const alert = await AdminAlert.findById(req.params.id);

  if (!alert) {
    res.status(404);
    throw new Error('Alert not found');
  }

  alert.isResolved = true;
  alert.resolvedBy = req.user._id;
  alert.resolvedAt = new Date();

  await alert.save();

  await logActivity(req, 'RESOLVE_ALERT', `Alert resolved: ${alert.message}`, alert._id.toString(), {
    actionCategory: 'system_event'
  });

  res.json({ success: true, message: 'Alert resolved successfully', data: alert });
}));

export default router;
