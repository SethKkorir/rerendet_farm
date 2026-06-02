// client/src/utils/permissions.js - FRONTEND GRANULAR PERMISSIONS UTIL
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

export const can = (role, scope) => {
  if (!role) return false;
  // Format legacy hyphen role to underscore for compatibility
  const normalizedRole = role.replace('-', '_');
  const allowedScopes = ROLE_PERMISSIONS[normalizedRole] || [];
  return allowedScopes.includes(scope);
};
