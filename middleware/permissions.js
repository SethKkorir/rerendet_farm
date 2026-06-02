// middleware/permissions.js - GRANULAR PERMISSION SCOPE SYSTEM

export const ROLE_PERMISSIONS = {
  super_admin: [
    'orders.read',
    'orders.write',
    'payments.read',
    'payments.override',
    'inventory.read',
    'inventory.write',
    'users.read',
    'users.manage',
    'reports.read',
    'settings.manage',
    'settings.security'
  ],
  owner: [
    'orders.read',
    'orders.write',
    'payments.read',
    'payments.override',
    'inventory.read',
    'inventory.write',
    'users.read',
    'reports.read',
    'settings.manage'
  ],
  fulfillment_staff: [
    'orders.read',
    'orders.write',
    'inventory.read'
  ]
};

export const requirePermission = (scope) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    const role = req.user.role;
    const allowedScopes = ROLE_PERMISSIONS[role] || [];

    if (!allowedScopes.includes(scope)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required permission: ${scope}`
      });
    }

    next();
  };
};
