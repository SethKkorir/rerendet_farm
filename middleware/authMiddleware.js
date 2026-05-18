// middleware/authMiddleware.js - COMPLETELY REWRITTEN WITH TOKEN VALIDATION
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import asyncHandler from 'express-async-handler';
import dotenv from 'dotenv';
import { verifyAccessToken } from '../utils/generateToken.js';

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

      req.user = await User.findById(decoded.id)
        .select('-password -verificationCode -verificationCodeExpires -resetPasswordToken -resetPasswordExpires -loginAttempts -lockUntil');

      if (!req.user) {
        res.status(401);
        throw new Error('Not authorized, user not found');
      }

      // Check if user has changed their password since token generation or if token version is invalid
      if (req.user.tokenVersion !== undefined && decoded.tokenVersion !== undefined && req.user.tokenVersion !== decoded.tokenVersion) {
        res.status(401);
        throw new Error('Session invalidated. Please log in again.');
      }

      // Check if user is active
      if (req.user.isActive === false) {
        res.status(401);
        throw new Error('This account has been deactivated. Please contact support.');
      }

      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        res.status(401);
        throw new Error('Session expired. Please log in again.');
      } else if (error.name === 'JsonWebTokenError') {
        res.status(401);
        throw new Error('Invalid authentication token.');
      } else {
        res.status(401);
        throw new Error(error.message || 'Not authorized, token validation failed');
      }
    }
  } else {
    console.log('❌ No token found in cookies or authorization headers');
    res.status(401);
    throw new Error('Not authorized, no token');
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
    // Additional admin checks
    if (req.user.isActive === false) {
      console.warn(`⛔ Admin Access Denied: Account Deactivated (${req.user.email})`);
      res.status(403);
      throw new Error('Admin account is deactivated');
    }

    if (!req.user.isVerified) {
      console.warn(`⛔ Admin Access Denied: Not Verified (${req.user.email})`);
      res.status(403);
      throw new Error('Admin account requires verification');
    }

    console.log(`✅ Admin access granted for: ${req.user.email} (Type: ${req.user.userType}, Role: ${req.user.role})`);
    next();
  } else {
    console.error(`⛔ Unauthorized Admin Attempt: ${req.user.email} (Type: ${req.user.userType}, Role: ${req.user.role})`);
    res.status(403);
    throw new Error('Not authorized as admin');
  }
});

// ✅ ADDED: Token validation endpoint middleware
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
      const user = await User.findById(decoded.id)
        .select('-password -verificationCode -verificationCodeExpires -resetPasswordToken -resetPasswordExpires -loginAttempts -lockUntil');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      if (user.isActive === false) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated'
        });
      }

      res.json({
        success: true,
        message: 'Token is valid',
        user: {
          id: user._id,
          email: user.email,
          userType: user.userType,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName
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