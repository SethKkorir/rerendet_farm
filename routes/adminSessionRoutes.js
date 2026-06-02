// routes/adminSessionRoutes.js - BACKEND SESSION OVERRIDES (GAP 7)
import express from 'express';
import asyncHandler from 'express-async-handler';
import { protect } from '../middleware/authMiddleware.js';
import { assertActiveAdmin } from '../middleware/assertActiveAdmin.js';
import { requirePermission } from '../middleware/permissions.js';
import AdminSession from '../models/AdminSession.js';
import { logActivity } from '../utils/activityLogger.js';

const router = express.Router();

router.use(protect, assertActiveAdmin, requirePermission('settings.security'));

// GET /api/admin/sessions - Returns all active admin sessions grouped by admin
router.get('/', asyncHandler(async (req, res) => {
  const sessions = await AdminSession.find({ isRevoked: false, expiresAt: { $gt: new Date() } })
    .populate('adminId', 'firstName lastName email')
    .sort({ lastActivityAt: -1 });

  res.json({ success: true, data: sessions });
}));

// DELETE /api/admin/sessions/:jti - Remote session revocation (Remote kill switch)
router.delete('/:jti', asyncHandler(async (req, res) => {
  const sessionDoc = await AdminSession.findOne({ jti: req.params.jti });

  if (!sessionDoc) {
    res.status(404);
    throw new Error('Session not found or already terminated.');
  }

  sessionDoc.isRevoked = true;
  sessionDoc.revokedAt = new Date();
  sessionDoc.revokedBy = req.user._id;

  await sessionDoc.save();

  await logActivity(req, 'REVOKE_SESSION', `Admin session with JTI ${req.params.jti} revoked by admin ${req.user.email}`, sessionDoc._id.toString(), {
    actionCategory: 'security_event'
  });

  res.json({ success: true, message: 'Session revoked successfully.' });
}));

// DELETE /api/admin/sessions/mine/all - Terminate all other sessions except current jti
router.delete('/mine/all', asyncHandler(async (req, res) => {
  const currentJti = req.user.jti;

  const result = await AdminSession.updateMany(
    { adminId: req.user._id, jti: { $ne: currentJti }, isRevoked: false },
    {
      $set: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedBy: req.user._id
      }
    }
  );

  await logActivity(req, 'REVOKE_ALL_SESSIONS', `Admin ${req.user.email} terminated all other sessions`, req.user._id.toString(), {
    actionCategory: 'security_event'
  });

  res.json({
    success: true,
    message: `Successfully terminated ${result.modifiedCount} other sessions.`
  });
}));

export default router;
