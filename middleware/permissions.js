// middleware/permissions.js - GRANULAR PERMISSION SCOPE SYSTEM
2: 
3: export const ROLE_PERMISSIONS = {
4:   super_admin: [
5:     'orders.read',
6:     'orders.write',
7:     'payments.read',
8:     'payments.override',
9:     'inventory.read',
10:     'inventory.write',
11:     'users.read',
12:     'users.manage',
13:     'reports.read',
14:     'settings.manage',
15:     'settings.security'
16:   ],
17:   owner: [
18:     'orders.read',
19:     'orders.write',
20:     'payments.read',
21:     'payments.override',
22:     'inventory.read',
23:     'inventory.write',
24:     'users.read',
25:     'reports.read',
26:     'settings.manage'
27:   ],
28:   fulfillment_staff: [
29:     'orders.read',
30:     'orders.write',
31:     'inventory.read'
32:   ]
33: };
34: 
35: export const requirePermission = (scope) => {
36:   return (req, res, next) => {
37:     if (!req.user) {
38:       return res.status(401).json({
39:         success: false,
40:         message: 'Authentication required.'
41:       });
42:     }
43: 
44:     const role = req.user.role;
45:     const allowedScopes = ROLE_PERMISSIONS[role] || [];
46: 
47:     if (!allowedScopes.includes(scope)) {
48:       return res.status(403).json({
49:         success: false,
50:         message: `Access denied. Required permission: ${scope}`
51:       });
52:     }
53: 
54:     next();
55:   };
56: };
