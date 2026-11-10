// routes/adminAuditRoutes.js - HIGH SECURITY SYSTEM AUDITS AND ANOMALIES (GAP 3)
import express from 'express';
import asyncHandler from 'express-async-handler';
import { protect } from '../middleware/authMiddleware.js';
import { assertActiveAdmin } from '../middleware/assertActiveAdmin.js';
import { requirePermission } from '../middleware/permissions.js';
import ActivityLog from '../models/ActivityLog.js';

const router = express.Router();

router.use(protect, assertActiveAdmin, requirePermission('reports.read'));

// GET /api/admin/audit-log
router.get('/', asyncHandler(async (req, res) => {
  const {
    adminId,
    actionCategory,
    orderId,
    startDate,
    endDate,
    search,
    page = 1,
    limit = 50
  } = req.query;

  const filter = {};

  if (adminId) filter.admin = adminId;
  if (actionCategory) filter['details.actionCategory'] = actionCategory;
  if (orderId) filter.entityId = orderId;

  if (search && search.trim()) {
    const s = search.trim();
    filter.$or = [
      { action: { $regex: s, $options: 'i' } },
      { entityName: { $regex: s, $options: 'i' } },
      { ipAddress: { $regex: s, $options: 'i' } }
    ];
  }

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const eDate = new Date(endDate);
      eDate.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = eDate;
    }
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [logs, total] = await Promise.all([
    ActivityLog.find(filter)
      .populate('admin', 'firstName lastName email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    ActivityLog.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: {
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

export default router;
