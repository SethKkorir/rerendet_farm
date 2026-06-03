// routes/authRoutes.js - CORRECTED VERSION
import express from 'express';
import {
  // Customer auth
  registerCustomer,
  loginCustomer,
  googleLogin,

  // Admin auth
  loginAdmin,
  createAdmin,
  requestAdminMagicLink,
  verifyAdminMagicLink,
  stepUpVerify,
  getAdminChallenge,
  handleSecurityAlert,

  // Common auth
  verifyEmail,
  verify2FALogin,
  toggle2FA,
  getCurrentUser,
  logout,
  checkEmail,
  forgotPassword,
  resetPassword,
  resendVerification,
  updateProfile,
  changePassword,
  deleteAccount,
  getCart,
  syncCart,
  getMyLogs,
  verifyPassword,
  unlockUserAccount,
  refreshAccessToken,
  setup2FA,
  confirm2FASetup,
  disable2FA,
  verify2FATOTP,
  verify2FABackup,
  getActiveCustomerSessions,
  revokeCustomerSession,
  revokeAllOtherSessions,
  getStoreCreditHistory,
  getLoyaltyPointsHistory
} from '../controllers/authController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { requireRecentReauth } from '../middleware/reauthMiddleware.js';
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit to 5 attempts per IP in 15 minutes
  handler: (req, res, next, options) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    import('../utils/securityAlerts.js').then(({ dispatchSecurityAlert }) => {
      dispatchSecurityAlert({
        eventTitle: 'Login Rate Limit Blocked IP',
        eventDescription: `An IP address has exceeded authentication attempt thresholds. Potential credential brute force attack.`,
        ipAddress: ip,
        severity: 'WARNING',
        metadata: { 'Target Path': req.originalUrl }
      });
    }).catch(e => console.error(e));

    res.status(429).json({
      success: false,
      message: 'Too many login attempts from this IP. Please try again after 15 minutes.'
    });
  }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit to 5 registrations per IP in an hour
  handler: (req, res, next, options) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    import('../utils/securityAlerts.js').then(({ dispatchSecurityAlert }) => {
      dispatchSecurityAlert({
        eventTitle: 'Registration Rate Limit Blocked IP',
        eventDescription: `An IP address has exceeded registration thresholds. Potential bot/spam account creation attempt.`,
        ipAddress: ip,
        severity: 'WARNING',
        metadata: { 'Target Path': req.originalUrl }
      });
    }).catch(e => console.error(e));

    res.status(429).json({
      success: false,
      message: 'Too many registration attempts from this IP. Please try again after an hour.'
    });
  }
});

const router = express.Router();

// ==================== PUBLIC ROUTES ====================

// Customer auth
router.post('/customer/register', registerLimiter, registerCustomer);
router.post('/customer/login', loginLimiter, loginCustomer);
router.post('/customer/verify-2fa', loginLimiter, verify2FALogin);
router.post('/google', loginLimiter, googleLogin);

// Admin challenge & alerts (static URLs as defined in layer specification)
router.get('/admin/challenge', getAdminChallenge);
router.post('/admin/security-alert', handleSecurityAlert);

// Admin auth mounted under dynamic segment
const adminSegment = process.env.ADMIN_PATH_SEGMENT || 'admin';
router.post(`/${adminSegment}/login`, loginLimiter, loginAdmin);
router.post(`/${adminSegment}/verify-2fa`, loginLimiter, verify2FALogin);
router.post(`/${adminSegment}/magic-link`, loginLimiter, requestAdminMagicLink);
router.post(`/${adminSegment}/magic-link/verify`, loginLimiter, verifyAdminMagicLink);
router.post(`/${adminSegment}/magic-link/step-up`, loginLimiter, stepUpVerify);

// Common auth
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/check-email', checkEmail);
router.post('/resend-verification', resendVerification);
// Silent token refresh — reads HttpOnly refresh cookie, returns new access token
router.post('/refresh', refreshAccessToken);

// Modern 2FA Verification Routes
router.post('/2fa/verify', loginLimiter, verify2FATOTP);
router.post('/2fa/verify-backup', loginLimiter, verify2FABackup);

// ==================== PROTECTED ROUTES ====================

// History Routes
router.get('/store-credit/history', protect, getStoreCreditHistory);
router.get('/loyalty/history', protect, getLoyaltyPointsHistory);

// Protected User Routes
router.put('/profile', protect, updateProfile);
router.put('/toggle-2fa', protect, toggle2FA);
router.delete('/profile', protect, requireRecentReauth, deleteAccount);
router.put('/change-password', protect, requireRecentReauth, changePassword);
router.post('/verify-password', protect, verifyPassword);
router.get('/activity', protect, getMyLogs);
router.get('/sessions', protect, getActiveCustomerSessions);
router.delete('/sessions/mine/all', protect, revokeAllOtherSessions);
router.delete('/sessions/:jti', protect, revokeCustomerSession);

// Modern 2FA Setup/Manage Routes (Protected)
router.post('/2fa/setup', protect, setup2FA);
router.post('/2fa/confirm', protect, confirm2FASetup);
router.post('/2fa/disable', protect, requireRecentReauth, disable2FA);

// Cart Routes
router.get('/cart', protect, getCart);
router.post('/cart', protect, syncCart);

// Common protected
router.get('/me', protect, getCurrentUser);
router.post('/logout', protect, logout);

// Admin management (admin only - using existing admin middleware)
router.post(`/${adminSegment}/create`, protect, admin, createAdmin);
router.put(`/${adminSegment}/unlock/:userId`, protect, admin, unlockUserAccount);

export default router;