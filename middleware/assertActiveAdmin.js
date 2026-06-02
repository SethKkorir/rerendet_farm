// middleware/assertActiveAdmin.js - LIVE DB RE-QUERY MIDDLEWARE
2: import User from '../models/User.js';
3: import asyncHandler from 'express-async-handler';
4: 
5: export const assertActiveAdmin = asyncHandler(async (req, res, next) => {
6:   if (!req.user || !req.user.id) {
7:     return res.status(401).json({
8:       success: false,
9:       message: 'Authentication required. No user identity supplied.'
10:     });
11:   }
12: 
13:   // Query fresh state from DB
14:   const freshUser = await User.findById(req.user.id).select('+role +isActive +isSuspended');
15:   
16:   if (!freshUser) {
17:     return res.status(401).json({
18:       success: false,
19:       message: 'User account not found. Re-authentication required.'
20:     });
21:   }
22: 
23:   // Check suspension or deactivation
24:   if (freshUser.isSuspended === true || freshUser.isActive === false) {
25:     return res.status(403).json({
26:       success: false,
27:       message: 'Account suspended. Contact your system administrator.'
28:     });
29:   }
30: 
31:   // Verify that the role is one of the valid admin roles
32:   const validRoles = ['super_admin', 'owner', 'fulfillment_staff'];
33:   if (!validRoles.includes(freshUser.role)) {
34:     return res.status(403).json({
35:       success: false,
36:       message: 'Admin access required. Insufficient roles.'
37:     });
38:   }
39: 
40:   // Overwrite stateless JWT role with live DB value
41:   req.user.role = freshUser.role;
42:   req.user.userType = 'admin';
43: 
44:   next();
45: });
46: 
47: export default assertActiveAdmin;
