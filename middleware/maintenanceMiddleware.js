import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Settings from '../models/Settings.js';

/**
 * Middleware to check if maintenance mode is enabled.
 * Blocks all non-admin routes if enabled, except for the admin portal and specific bypasses.
 */
const maintenanceMode = asyncHandler(async (req, res, next) => {
    const fullPath = (req.baseUrl + req.path).replace(/\/$/, '');

    // 1. Always allow fundamental bypasses (Health, Public Settings, Super Gate, Admin Auth)
    const bypassPaths = [
        '/api/admin/login',
        '/api/auth/admin',
        '/api/settings/public',
        '/api/settings/super-gate', // CRITICAL: Allow the magic link to be triggered even if site is blocked
        '/api/health'
    ];

    if (bypassPaths.some(path => fullPath.includes(path))) {
        return next();
    }

    // 2. Fetch settings to check if maintenance is ON
    // CACHE SETTINGS: Avoid DB roundtrip on every request
    let settings = maintenanceMode.cache?.data;
    const cacheAge = Date.now() - (maintenanceMode.cache?.timestamp || 0);

    if (!settings || cacheAge > 60000) { // 60 second cache
        try {
            settings = await Settings.getSettings();
            maintenanceMode.cache = { data: settings, timestamp: Date.now() };
        } catch (err) {
            // FAIL-CLOSED: If we can't fetch settings (DB down?), act as if maintenance is ON for security
            console.error('⚠️ Critical: Could not fetch settings for maintenance check. Failing closed.');
            return res.status(503).json({
                success: false,
                maintenance: true,
                downtime: true,
                message: 'System is currently stabilizing. Please try again in a few moments.'
            });
        }
    }

    if (!settings?.maintenance || !settings.maintenance.enabled) {
        return next();
    }

    // 3. If Maintenance is ON, we must check if the user is a SUPER ADMIN
    // Since this middleware runs before 'protect', we manually check for Token
    let isSuperAdmin = false;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            const token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select('role userType');

            // STRICT: Only 'super-admin' can bypass maintenance/downtime
            if (user && user.role === 'super-admin') {
                isSuperAdmin = true;
                req.user = user; // Attach user so subsequent middleware knows who it is
            }
        } catch (err) {
            // Token invalid or expired, proceed as guest
        }
    }

    // 4. Block everyone if NOT super-admin
    if (!isSuperAdmin) {
        return res.status(503).json({
            success: false,
            maintenance: true,
            downtime: true,
            message: settings.maintenance.message || 'The system is currently undergoing critical maintenance and is temporary offline. We apologize for the downtime.',
            storeName: settings.store.name
        });
    }

    next();
});

export default maintenanceMode;
