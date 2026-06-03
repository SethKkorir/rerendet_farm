// middleware/assertActiveAdmin.js - LIVE DB RE-QUERY MIDDLEWARE
import User from '../models/User.js';
import asyncHandler from 'express-async-handler';

export const assertActiveAdmin = asyncHandler(async (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. No user identity supplied.'
    });
  }

  // Query fresh state from DB
  const freshUser = await User.findById(req.user.id).select('+role +isActive +isSuspended');
  
  if (!freshUser) {
    return res.status(401).json({
      success: false,
      message: 'User account not found. Re-authentication required.'
    });
  }

  // Check suspension or deactivation
  if (freshUser.isSuspended === true || freshUser.isActive === false) {
    return res.status(403).json({
      success: false,
      message: 'Account suspended. Contact your system administrator.'
    });
  }

  // Verify that the role is one of the valid admin roles
  const validRoles = ['super_admin', 'super-admin', 'owner', 'fulfillment_staff'];
  if (!validRoles.includes(freshUser.role)) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required. Insufficient roles.'
    });
  }

  // Overwrite stateless JWT role with live DB value
  req.user.role = freshUser.role;
  req.user.userType = 'admin';

  next();
});

export default assertActiveAdmin;
