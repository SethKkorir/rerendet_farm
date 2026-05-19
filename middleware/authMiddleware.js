// middleware/authMiddleware.js - COMPLETELY REWRITTEN WITH STATELESS VALIDATION & FINGERPRINTING
import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import dotenv from 'dotenv';
import { verifyAccessToken, generateFingerprintHash } from '../utils/generateToken.js';

// Load environment variables
dotenv.config();

const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check if JWT_SECRET is set
  if (!process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET is not configured in auth middleware');
    res.status(500);
    throw new Error('Server configuration error - JWT_SECRET missing');
  }

  // Look for token in HttpOnly cookies first, then in the Auth header
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = verifyAccessToken(token);

      // Validate session fingerprint (IP and User-Agent) if present in token
      if (decoded.fpt) {
        const ip = req.ip || req.socket?.remoteAddress || '';
        const userAgent = req.headers['user-agent'] || '';
        const currentFpt = generateFingerprintHash(ip, userAgent);

        if (decoded.fpt !== currentFpt) {
          console.warn(`🚨 [Session Hijacking Attempt] Fingerprint mismatch! Token: ${decoded.fpt} | Current: ${currentFpt} | IP: ${ip} | User-Agent: ${userAgent}`);
          return res.status(401).json({
            success: false,
            code: 'SESSION_FINGERPRINT_MISMATCH',
            message: 'Session fingerprint verification failed. Absolute re-authentication required.'
          });
        }
      }

      // Build stateless req.user completely from the access token
      req.user = {
        _id: decoded.userId,
        id: decoded.userId,
        email: decoded.email || '',
        firstName: decoded.firstName || '',
        lastName: decoded.lastName || '',
        role: decoded.role || 'customer',
        userType: decoded.role === 'admin' || decoded.role === 'super-admin' ? 'admin' : 'customer',
        tokenVersion: decoded.tokenVersion || 0,
        twoFactorEnabled: !!decoded.twoFactorEnabled,
        isActive: true,
        isVerified: true
      };

      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          code: 'ACCESS_TOKEN_EXPIRED',
          message: 'Access token has expired'
        });
      } else {
        return res.status(401).json({
          success: false,
          message: error.message || 'Invalid authentication token.'
        });
      }
    }
  } else {
    console.log('❌ No token found in cookies or authorization headers');
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided'
    });
  }
});

const admin = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Authentication required');
  }

  // Check both userType and role for admin access
  const isAdmin = req.user.userType === 'admin' ||
    req.user.role === 'admin' ||
    req.user.role === 'super-admin';

  if (isAdmin) {
    // Mandate 2FA TOTP for administrative actions
    if (!req.user.twoFactorEnabled) {
      console.warn(`🚨 [2FA MANDATORY LOCKOUT] Blocked administrative access attempt for: ${req.user.email} because Two-Factor Authentication is disabled.`);
      return res.status(403).json({
        success: false,
        code: 'MFA_REQUIRED',
        message: 'Security Restriction: Mandatory Two-Factor Authentication (2FA) is not enabled on your account. You must configure 2FA to access administrative routes.'
      });
    }
    next();
  } else {
    console.error(`⛔ Unauthorized Admin Attempt: ${req.user.email} (Type: ${req.user.userType}, Role: ${req.user.role})`);
    res.status(403);
    throw new Error('Not authorized as admin');
  }
});

// ✅ Token validation endpoint middleware (Stateless & Fingerprinted)
const validateToken = asyncHandler(async (req, res) => {
  let token;

  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = verifyAccessToken(token);

      // Validate session fingerprint (IP and User-Agent) if present in token
      if (decoded.fpt) {
        const ip = req.ip || req.socket?.remoteAddress || '';
        const userAgent = req.headers['user-agent'] || '';
        const currentFpt = generateFingerprintHash(ip, userAgent);

        if (decoded.fpt !== currentFpt) {
          console.warn(`🚨 [Session Hijacking Attempt] Validation Fingerprint mismatch!`);
          return res.status(401).json({
            success: false,
            code: 'SESSION_FINGERPRINT_MISMATCH',
            message: 'Session fingerprint verification failed.'
          });
        }
      }

      res.json({
        success: true,
        message: 'Token is valid',
        user: {
          id: decoded.userId,
          _id: decoded.userId,
          email: decoded.email || '',
          userType: decoded.role === 'admin' || decoded.role === 'super-admin' ? 'admin' : 'customer',
          role: decoded.role || 'customer',
          firstName: decoded.firstName || '',
          lastName: decoded.lastName || ''
        }
      });
    } catch (error) {
      console.error('Token validation failed:', error.message);
      res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
  } else {
    res.status(401).json({
      success: false,
      message: 'No token provided'
    });
  }
});

export { protect, admin, validateToken };