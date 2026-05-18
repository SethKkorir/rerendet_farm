// middleware/adminAuth.js - COMPLETELY REWRITTEN
import User from '../models/User.js';
import asyncHandler from 'express-async-handler';

// Role-based access control
const ROLES = {
  SUPER_ADMIN: 'super-admin',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  SUPPORT: 'support'
};

const PERMISSIONS = {
  // Super Admin - Full access
  [ROLES.SUPER_ADMIN]: ['*'],

  // Admin - Almost full access except user deletion
  [ROLES.ADMIN]: [
    'dashboard:view',
    'orders:manage',
    'products:manage',
    'users:view',
    'users:edit',
    'analytics:view',
    'settings:manage',
    'contacts:manage',
    'marketing:manage',
    'logs:view'
  ],

  // Moderator - Content management only
  [ROLES.MODERATOR]: [
    'dashboard:view',
    'products:manage',
    'analytics:view'
  ],

  // Support - Customer support only
  [ROLES.SUPPORT]: [
    'dashboard:view',
    'orders:view',
    'orders:update_status',
    'users:view',
    'contacts:manage'
  ]
};

/**
 * adminAuth(requiredPermissions: string[])
 * - expects req.user to be set by protect middleware
 * - checks that user has admin role (userType === 'admin' OR role includes 'admin')
 */
export const adminAuth = (requiredPermissions = []) => {
  return asyncHandler(async (req, res, next) => {
    const user = req.user;

    if (!user) {
      res.status(401);
      throw new Error('Not authenticated');
    }

    // FIXED: Check both userType and role for admin access
    const isAdmin = user.userType === 'admin' ||
      user.role === 'admin' ||
      user.role === 'super-admin';

    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 Admin Auth Check:', {
        userId: user._id,
        email: user.email,
        userType: user.userType,
        role: user.role,
        isAdmin: isAdmin,
        requiredPermissions: requiredPermissions
      });
    }

    if (!isAdmin) {
      res.status(403);
      throw new Error('Not authorized as admin');
    }

    // Additional admin account checks
    if (user.isActive === false) {
      res.status(403);
      throw new Error('Admin account is deactivated');
    }

    if (!user.isVerified) {
      res.status(403);
      throw new Error('Admin account requires verification');
    }

    // If it's a super-admin, grant all permissions immediately
    if (user.role === 'super-admin') {
      console.log('✅ Super Admin access granted (bypass checks) for:', user.email);
      return next();
    }

    // If no fine-grained permissions required, allow access (basic admin route)
    if (!requiredPermissions || requiredPermissions.length === 0) {
      console.log('✅ Admin access granted (no specific permissions required) for:', user.email);
      return next();
    }

    // CHECK PERMISSIONS
    // 1. Get permissions needed
    // 2. Get user's role permissions
    // 3. Check if user has ALL required permissions

    // Normalize role
    const userRole = user.role || 'admin';

    // Get allowed permissions for this user's role from the PERMISSIONS constant
    const userPermissions = PERMISSIONS[userRole] || [];

    // Check if user has all required permissions
    // If userPermissions contains '*', they have access to everything
    if (userPermissions.includes('*')) {
      console.log('✅ Access granted (wildcard permission) for:', user.email);
      return next();
    }

    const hasPermission = requiredPermissions.every(permission =>
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      console.error('⛔ Access Denied: Missing permissions', {
        user: user.email,
        role: userRole,
        required: requiredPermissions,
        has: userPermissions
      });
      res.status(403);
      throw new Error(`Access denied. Required permissions: ${requiredPermissions.join(', ')}`);
    }

    console.log(`✅ Admin access granted for ${user.email} (Role: ${userRole})`);
    next();
  });
};

export default adminAuth;