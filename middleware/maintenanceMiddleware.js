import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import connectDB from '../config/db.js';

/**
 * Middleware to check if maintenance mode is enabled.
 * Blocks all non-admin routes if enabled, except for the admin portal and specific bypasses.
 */
const maintenanceMode = asyncHandler(async (req, res, next) => {
    const fullPath = (req.baseUrl + req.path).replace(/\/$/, '');

    // 1. Always allow fundamental bypasses (Health, Public Settings, Super Gate, Admin Auth, Heartbeat, Cron, and Admin panel APIs)
    const bypassPaths = [
        '/api/admin',            // Allow all administrative management APIs (e.g. settings, dashboard, products)
        '/api/auth/admin',       // Allow admin auth endpoints (login, 2fa, etc)
        '/api/auth/refresh',     // Allow silent token refresh under maintenance mode
        '/api/settings/public',  // Public settings needed to display shop status
        '/api/settings/super-gate', // CRITICAL: Allow the magic link to be triggered even if site is blocked
        '/api/health',           // Health check
        '/api/public/heartbeat',
        '/api/cron'              // Cron triggers
    ];

    if (bypassPaths.some(path => fullPath.includes(path) || fullPath.startsWith(path))) {
        return next();
    }

    // Ensure database connection is fully ready (critical for Vercel serverless environment on cold starts)
    try {
        await connectDB();
    } catch (dbErr) {
        console.error('⚠️ Critical: Database connection could not be established in maintenance middleware:', dbErr.message);
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
            console.error('⚠️ Could not fetch settings for maintenance check:', err.message || err);
            if (maintenanceMode.cache?.data) {
                settings = maintenanceMode.cache.data;
            } else {
                // Safe fallback: Allow request to proceed if settings fetch fails without cache
                return next();
            }
        }
    }

    if (!settings?.maintenance || !settings.maintenance.enabled) {
        return next();
    }

    // 3. If Maintenance is ON, check if the requester is an authorized ADMIN or SUPER ADMIN
    // Since this middleware runs before 'protect', we manually parse the token from headers or cookies
    let isAdmin = false;
    let token = null;

    if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.userId || decoded.id; // Match decoded token fields

            if (userId) {
                const user = await User.findById(userId).select('role userType');
                
                // Allow both 'super-admin' and 'admin' roles to bypass storefront locks
                if (user && (user.role === 'super-admin' || user.role === 'admin' || user.userType === 'admin')) {
                    isAdmin = true;
                    req.user = user; // Attach user so subsequent middleware knows who it is
                }
            }
        } catch (err) {
            // Token invalid or expired, proceed as guest
        }
    }

    // 4. Block everyone else (non-admins / guests) on public routes
    if (!isAdmin) {
        return res.status(503).json({
            success: false,
            maintenance: true,
            downtime: true,
            message: settings.maintenance.message || 'The system is currently undergoing critical maintenance and is temporarily offline. We apologize for the downtime.',
            storeName: settings.store?.name || 'Rerendet Coffee'
        });
    }

    next();
});

export default maintenanceMode;
