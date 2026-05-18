import ActivityLog from '../models/ActivityLog.js';
import User from '../models/User.js';
import sendEmail from './sendEmail.js';
import { getAdminMisuseAlert } from './emailTemplates.js';
import Settings from '../models/Settings.js';

// ── High-risk actions that immediately alert the Super Admin ──────────────────
const HIGH_RISK_ACTIONS = new Set([
    'DELETE',
    'DELETE_USER',
    'DELETE_PRODUCT',
    'BULK_DELETE',
    'UPDATE_ROLE',           // Privilege escalation
    'MANUAL_ACCOUNT_UNLOCK', // Could be used to unlock a compromised account
    'SETTINGS_UPDATE',       // Changing store settings
    'CREATE_ADMIN',          // New admin account created
]);

// Actions that are high-risk ONLY when done in rapid succession (anomaly detection)
const RAPID_ACTION_THRESHOLD = 15; // actions
const RAPID_ACTION_WINDOW_MS = 5 * 60 * 1000; // within 5 minutes

/**
 * Logs an administrative action to the database.
 * For high-risk actions, immediately emails the Super Admin.
 *
 * @param {Object} req - Express request object
 * @param {String} action - Action type (e.g. 'DELETE_PRODUCT')
 * @param {String} entityName - Name of the affected entity
 * @param {String|null} entityId - ID of the entity
 * @param {Object} details - Extra metadata
 */
export const logActivity = async (req, action, entityName, entityId = null, details = {}) => {
    try {
        // Fallback for LOGIN actions where req.user isn't set yet (because it's public)
        const actorId = req.user?._id || (action === 'LOGIN' ? entityId : null);
        const actor = req.user || { _id: actorId, firstName: entityName, email: details?.email || 'Unknown' };

        // Safety check
        if (!actorId) {
            console.warn(`[WARN] [ActivityLog] Attempted to log ${action} action without authenticated user`);
            return;
        }

        const log = new ActivityLog({
            admin: actorId,
            action,
            entityName,
            entityId: entityId ? entityId.toString() : null,
            details,
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.headers['user-agent']
        });

        await log.save();
        console.log(`[ActivityLog] Logged: ${action} by ${actor.firstName}`);

        // ── High-Risk Action Alert ────────────────────────────────────────────
        if (HIGH_RISK_ACTIONS.has(action)) {
            // Background task: don't await the alert (email sending is slow)
            alertSuperAdmin({
                adminUser: actor,
                action,
                entityName,
                ip: req.ip || req.connection?.remoteAddress,
                details
            }).catch(err => console.error('[ERROR] [ActivityLog] Background alert failed:', err.message));
        }

        // ── Rapid-Action Anomaly Detection ────────────────────────────────────
        if (actor._id) {
            // Background task: don't await
            checkRapidActions(actor).catch(err => console.error('[ActivityLog] Rapid check failed:', err.message));
        }

    } catch (error) {
        // Log failures should NEVER crash the main request
        console.error('[ActivityLog] Failed to save log:', error.message);
    }
};

// ─── Alert Super Admin of a high-risk action ─────────────────────────────────
const alertSuperAdmin = async ({ adminUser, action, entityName, ip, details }) => {
    try {
        const superAdmins = await User.find({ role: 'super-admin' }).select('email firstName');

        // ALWAYS include your designated developer/owner email for security alerts
        const primaryAlertEmail = process.env.SUPER_ADMIN_EMAIL || 'zsethkipchumba179@gmail.com';
        if (!superAdmins.some(admin => admin.email === primaryAlertEmail)) {
            superAdmins.push({ email: primaryAlertEmail, firstName: 'System Owner' });
        }

        let logoUrl;
        try {
            const settings = await Settings.getSettings();
            logoUrl = settings?.store?.logo;
        } catch (_) { }

        const timestamp = new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });

        for (const superAdmin of superAdmins) {
            // Don't alert the admin about their own login (too noisy for super-admin to their own account)
            const actorEmail = adminUser.email === 'Unknown' ? details?.email : adminUser.email;
            if (superAdmin.email === actorEmail && action === 'LOGIN') continue;

            try {
                await sendEmail({
                    to: superAdmin.email,
                    subject: `[Security Alert] Admin Alert: ${action} by ${adminUser.firstName} — Rerendet`,
                    html: getAdminMisuseAlert({
                        adminName: `${adminUser.firstName} ${adminUser.lastName || ''}`,
                        adminEmail: adminUser.email,
                        action,
                        entityName,
                        ipAddress: ip,
                        timestamp,
                        details,
                        logoUrl
                    })
                });
                console.log(`[SecurityAlert] High-risk action "${action}" alerted to ${superAdmin.email}`);
            } catch (emailErr) {
                console.error(`[SecurityAlert] Failed to send alert to ${superAdmin.email}:`, emailErr.message);
            }
        }
    } catch (err) {
        console.error('[SecurityAlert] Error in alertSuperAdmin:', err.message);
    }
};

// ─── Rapid-Action Anomaly Detection ──────────────────────────────────────────
const rapidActionCache = new Map(); // In-memory: adminId → count + windowStart

const checkRapidActions = async (adminUser) => {
    try {
        const now = Date.now();
        const adminId = adminUser._id.toString();
        const entry = rapidActionCache.get(adminId);

        if (!entry || (now - entry.windowStart) > RAPID_ACTION_WINDOW_MS) {
            // Start a fresh window
            rapidActionCache.set(adminId, { count: 1, windowStart: now });
            return;
        }

        entry.count += 1;

        if (entry.count === RAPID_ACTION_THRESHOLD) {
            // Threshold hit — fire the alert once per window
            console.warn(`⚠️ [RapidAction] Admin ${adminUser.email} fired ${entry.count} actions in 5 min!`);

            await alertSuperAdmin({
                adminUser,
                action: `RAPID_ACTIVITY_BURST (${entry.count} actions in 5 min)`,
                entityName: 'Multiple entities',
                ip: null,
                details: {
                    count: entry.count,
                    windowMs: RAPID_ACTION_WINDOW_MS,
                    note: 'This could indicate a compromised admin account or a script being run.'
                }
            });
        }
    } catch (err) {
        // Non-critical
        console.error('❌ [RapidAction] Error in checkRapidActions:', err.message);
    }
};
