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
  getLoyaltyPointsHistory,
  getUserAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
} from '../controllers/authController.js';
import { authenticate, authorizeRoles, protect, admin } from '../middleware/authMiddleware.js';
import { requireRecentReauth } from '../middleware/reauthMiddleware.js';
import {
  forgotPassword,
  verifyResetCode,
  resetPassword,
  resendResetCode,
  getResetStatus
} from '../controllers/passwordRecoveryController.js';
import rateLimit from 'express-rate-limit';

// ==================== RATE LIMITERS (ISOLATED DOMAINS) ====================

// 1. Customer standard login limiter (5 attempts per 15 min per IP)
const customerLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many login attempts from this network. Please try again after 15 minutes.'
    });
  }
});

// 2. Customer 2FA entry limiter (Dedicated pool, 15 attempts per 15 min per IP)
const customer2faLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many verification attempts from this network. Please wait a few minutes or request a new code.'
    });
  }
});

// 3. Isolated Admin Authentication Limiter (Never affected by customer activity)
const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // In local development or internal loopback, allow developer/admin testing without lockout
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
    const isLocalhost = ip.includes('127.0.0.1') || ip.includes('::1') || ip.includes('localhost');
    return process.env.NODE_ENV !== 'production' && isLocalhost;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many administrator authentication attempts. Please try again after 15 minutes.'
    });
  }
});

// 4. Registration limiter (5 per hour per IP)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many registration attempts from this network. Please try again after an hour.'
    });
  }
});

// 5. Password reset limiter (5 per 15 min per IP)
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many password reset requests from this network. Please try again after 15 minutes.'
    });
  }
});

const router = express.Router();

// ==================== PUBLIC ROUTES ====================

// Customer auth
router.post('/customer/register', registerLimiter, registerCustomer);
router.post('/customer/login', customerLoginLimiter, loginCustomer);
router.post('/customer/verify-2fa', customer2faLimiter, verify2FALogin);
router.post('/google', customerLoginLimiter, googleLogin);

// Admin challenge & alerts (static URLs as defined in layer specification)
router.get('/admin/challenge', getAdminChallenge);
router.post('/admin/security-alert', handleSecurityAlert);

// Admin auth mounted under dynamic segment (ISOLATED from customer limits)
const adminSegment = process.env.ADMIN_PATH_SEGMENT || 'admin';
router.post(`/${adminSegment}/login`, adminAuthLimiter, loginAdmin);
router.post(`/${adminSegment}/verify-2fa`, adminAuthLimiter, verify2FALogin);
router.post(`/${adminSegment}/magic-link`, adminAuthLimiter, requestAdminMagicLink);
router.post(`/${adminSegment}/magic-link/verify`, adminAuthLimiter, verifyAdminMagicLink);
router.post(`/${adminSegment}/magic-link/step-up`, adminAuthLimiter, stepUpVerify);

// Common auth
router.post('/verify-email', passwordResetLimiter, verifyEmail);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/verify-reset-code', passwordResetLimiter, verifyResetCode);
router.post('/reset-password', passwordResetLimiter, resetPassword);
router.post('/resend-reset-code', passwordResetLimiter, resendResetCode);
router.get('/reset-status', getResetStatus);
router.get('/check-email', checkEmail);
router.post('/check-email', checkEmail);
router.post('/resend-verification', passwordResetLimiter, resendVerification);
// Silent token refresh — reads HttpOnly refresh cookie, returns new access token
router.post('/refresh', refreshAccessToken);

// Modern 2FA Verification Routes
router.post('/2fa/verify', customer2faLimiter, verify2FATOTP);
router.post('/2fa/verify-backup', customer2faLimiter, verify2FABackup);

// ==================== PROTECTED ROUTES ====================

// History Routes
router.get('/store-credit/history', protect, getStoreCreditHistory);
router.get('/loyalty/history', protect, getLoyaltyPointsHistory);

// Protected User Routes
router.put('/profile', protect, updateProfile);
router.get('/addresses', protect, getUserAddresses);
router.post('/addresses', protect, addAddress);
router.put('/addresses/:id', protect, updateAddress);
router.delete('/addresses/:id', protect, deleteAddress);
router.put('/addresses/:id/default', protect, setDefaultAddress);
router.put('/toggle-2fa', protect, toggle2FA);
router.delete('/profile', protect, requireRecentReauth, deleteAccount);
router.put('/change-password', protect, requireRecentReauth, changePassword);
router.post('/change-password', protect, requireRecentReauth, changePassword);
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
router.get('/me', authenticate, getCurrentUser);
router.post('/logout', logout);

// Admin management (deny-by-default: admin/super-admin only)
router.post(`/${adminSegment}/create`, authenticate, authorizeRoles('super-admin', 'super_admin', 'owner'), createAdmin);
router.put(`/${adminSegment}/unlock/:userId`, authenticate, authorizeRoles('admin', 'super-admin', 'super_admin'), unlockUserAccount);

export default router;