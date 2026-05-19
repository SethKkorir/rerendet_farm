import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Middleware to enforce recent re-authentication (valid for 5 minutes).
 * This protects sensitive endpoints (e.g., changing email, disabling MFA, editing roles).
 */
export const requireRecentReauth = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Authentication required');
  }

  let reauthToken;

  // Read from custom header or cookies
  if (req.headers['x-reauth-token']) {
    reauthToken = req.headers['x-reauth-token'];
  } else if (req.cookies && req.cookies.reauthToken) {
    reauthToken = req.cookies.reauthToken;
  } else if (req.body && req.body.reauthToken) {
    reauthToken = req.body.reauthToken;
  }

  if (!reauthToken) {
    return res.status(403).json({
      success: false,
      code: 'REAUTH_REQUIRED',
      message: 'Sensitive Operation: Re-authentication is required to complete this action.'
    });
  }

  try {
    const secret = (process.env.JWT_SECRET || 'rerendet_access_secret_fallback') + '_reauth';
    const decoded = jwt.verify(reauthToken, secret);

    if (decoded.userId !== req.user._id.toString() || decoded.type !== 'reauth') {
      res.status(403);
      throw new Error('Invalid re-authentication token');
    }

    // Verify token version has not changed
    const user = await User.findById(req.user._id).select('tokenVersion');
    if (!user || (decoded.tokenVersion !== undefined && user.tokenVersion !== decoded.tokenVersion)) {
      res.status(403);
      throw new Error('Re-authentication token has been revoked');
    }

    // Reauth successful! Move forward
    next();
  } catch (error) {
    console.error('❌ Re-authentication failed:', error.message);
    return res.status(403).json({
      success: false,
      code: 'REAUTH_REQUIRED',
      message: 'Re-authentication token has expired or is invalid.'
    });
  }
});
