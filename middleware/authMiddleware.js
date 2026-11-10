// middleware/authMiddleware.js - ZERO TRUST & ROLE-BASED ACCESS CONTROL
import asyncHandler from 'express-async-handler';
import dotenv from 'dotenv';
import {
  verifyAccessToken,
  generateFingerprintHash,
  getClientIp,
  ADMIN_ACCESS_COOKIE,
  CUSTOMER_ACCESS_COOKIE
} from '../utils/generateToken.js';

dotenv.config();

/**
 * Zero-Trust Authenticate Middleware
 * Extracts and verifies JWT strictly on the server.
 * Deny-by-default: If token is missing, invalid, expired, or tampered, returns 401.
 * Identity & role are established ONLY from the verified token.
 */
export const authenticate = asyncHandler(async (req, res, next) => {
  let token = null;

  if (!process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET is not configured in auth middleware');
    return res.status(500).json({
      success: false,
      message: 'Server configuration error - JWT_SECRET missing'
    });
  }

  const authHeader = req.headers.authorization;
  const authScope = (req.headers['x-auth-scope'] || '').toLowerCase();
  const path = (req.originalUrl || req.path || '').toLowerCase();
  const adminSegment = (process.env.ADMIN_PATH_SEGMENT || 'admin').toLowerCase();
  const isAdminPath = path.includes('/api/admin') || path.includes(`/${adminSegment}`);

  // 1. Inspect role-isolated HttpOnly cookies
  if (req.cookies) {
    if (authScope === 'admin' || isAdminPath) {
      // Prioritize admin session cookie for admin scope or admin routes
      token = req.cookies[ADMIN_ACCESS_COOKIE] || req.cookies.token;
    } else {
      // For storefront/customer routes: accept customer token, or admin token if store owner/admin is shopping
      token = req.cookies[CUSTOMER_ACCESS_COOKIE] || req.cookies[ADMIN_ACCESS_COOKIE] || req.cookies.token;
    }
  }

  // 2. Authorization Bearer header fallback (programmatic API clients)
  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHENTICATED',
      message: 'Not authorized, no valid session token provided'
    });
  }

  try {
    const decoded = verifyAccessToken(token);

    // Validate session fingerprint (anti-session-hijacking)
    if (decoded.fpt) {
      const ip = getClientIp(req);
      const userAgent = req.headers['user-agent'] || '';
      const currentFpt = generateFingerprintHash(ip, userAgent);

      if (decoded.fpt !== currentFpt) {
        console.warn(`🚨 [Session Hijacking Attempt] Fingerprint mismatch! IP: ${ip} | User-Agent: ${userAgent}`);
        return res.status(401).json({
          success: false,
          code: 'SESSION_FINGERPRINT_MISMATCH',
          message: 'Session fingerprint verification failed. Re-authentication required.'
        });
      }
    }

    const decodedRole = (decoded.role || 'customer').toLowerCase();
    const isAdminUser = ['admin', 'super-admin', 'super_admin', 'owner', 'fulfillment_staff'].includes(decodedRole);

    // Concurrent Admin Session check
    if (isAdminUser && decoded.jti) {
      const AdminSession = (await import('../models/AdminSession.js')).default;
      const sessionDoc = await AdminSession.findOne({ jti: decoded.jti });
      if (!sessionDoc || sessionDoc.isRevoked || Date.now() > sessionDoc.expiresAt.getTime()) {
        return res.status(401).json({
          success: false,
          code: 'SESSION_REVOKED',
          message: 'Admin session has expired or been revoked. Please authenticate again.'
        });
      }

      AdminSession.updateOne({ jti: decoded.jti }, { $set: { lastActivityAt: new Date() } }).catch(console.error);
    }

    // Server is the root of trust: role is set strictly from verified token
    req.user = {
      _id: decoded.userId,
      id: decoded.userId,
      email: decoded.email || '',
      firstName: decoded.firstName || '',
      lastName: decoded.lastName || '',
      role: decodedRole,
      userType: isAdminUser ? 'admin' : 'customer',
      tokenVersion: decoded.tokenVersion || 0,
      twoFactorEnabled: !!decoded.twoFactorEnabled,
      isActive: true,
      isVerified: true,
      jti: decoded.jti || null
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        code: 'ACCESS_TOKEN_EXPIRED',
        message: 'Access token has expired'
      });
    }
    return res.status(401).json({
      success: false,
      code: 'INVALID_TOKEN',
      message: 'Invalid or tampered authentication token'
    });
  }
});

/**
 * Deny-By-Default Role Authorization Middleware
 * Verifies req.user role against permitted roles.
 * Returns 401 if unauthenticated, 403 if wrong role.
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHENTICATED',
        message: 'Authentication required. No session found.'
      });
    }

    const userRole = (req.user.role || '').toLowerCase();
    const normalizedAllowed = allowedRoles.map(r => r.toLowerCase().replace('_', '-'));
    const normalizedUserRole = userRole.replace('_', '-');

    // Role hierarchy / equivalence check
    const isAllowed = normalizedAllowed.includes(normalizedUserRole) ||
      (normalizedUserRole === 'super-admin' && normalizedAllowed.includes('admin')) ||
      (normalizedUserRole === 'owner' && normalizedAllowed.includes('admin'));

    if (!isAllowed) {
      console.warn(`⛔ Unauthorized access attempt to ${req.originalUrl} by ${req.user.email} (Role: ${userRole})`);
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: `Forbidden: Access denied. Required role: [${allowedRoles.join(', ')}]`
      });
    }

    // Mandatory 2FA TOTP check for administrative routes
    const isAdminRole = ['admin', 'super-admin', 'super_admin', 'owner'].includes(userRole);
    if (isAdminRole && process.env.ENFORCE_MANDATORY_MFA === 'true' && !req.user.twoFactorEnabled) {
      console.warn(`🚨 [2FA MANDATORY LOCKOUT] Blocked administrative access attempt for: ${req.user.email}`);
      return res.status(403).json({
        success: false,
        code: 'MFA_REQUIRED',
        message: 'Security Restriction: Two-Factor Authentication (2FA) is required to access administrative routes.'
      });
    }

    next();
  };
};

/**
 * Endpoint token validation helper
 */
export const validateToken = asyncHandler(async (req, res) => {
  let token = null;
  const authScope = (req.headers['x-auth-scope'] || '').toLowerCase();

  if (req.cookies) {
    if (authScope === 'admin') {
      token = req.cookies[ADMIN_ACCESS_COOKIE] || req.cookies.token;
    } else {
      token = req.cookies[CUSTOMER_ACCESS_COOKIE] || req.cookies.token;
    }
  }

  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    });
  }

  try {
    const decoded = verifyAccessToken(token);
    const decodedRole = (decoded.role || 'customer').toLowerCase();
    const isAdminUser = ['admin', 'super-admin', 'super_admin', 'owner'].includes(decodedRole);

    res.json({
      success: true,
      message: 'Token is valid',
      user: {
        id: decoded.userId,
        _id: decoded.userId,
        email: decoded.email || '',
        userType: isAdminUser ? 'admin' : 'customer',
        role: decodedRole,
        firstName: decoded.firstName || '',
        lastName: decoded.lastName || ''
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token'
    });
  }
});

// Backward-compatible aliases
export const protect = authenticate;
export const admin = authorizeRoles('admin', 'super-admin', 'super_admin', 'owner', 'fulfillment_staff');
