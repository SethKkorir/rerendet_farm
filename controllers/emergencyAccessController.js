// controllers/emergencyAccessController.js
import asyncHandler from 'express-async-handler';
import crypto from 'crypto';
import EmergencyAccess from '../models/EmergencyAccess.js';
import Settings from '../models/Settings.js';
import User from '../models/User.js';
import sendEmail from '../utils/sendEmail.js';
import settingsService from '../services/settingsService.js';
import maintenanceMiddleware from '../middleware/maintenanceMiddleware.js';

/**
 * Helper to get clean base URL for frontend emergency access
 */
const getFrontendUrl = (req) => {
  let url = process.env.CLIENT_URL || process.env.FRONTEND_URL;
  if (!url || url.includes('localhost') || url.includes('127.0.0.1')) {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      url = 'https://rerendet-farm.vercel.app';
    } else {
      url = url || `${req.protocol}://${req.get('host')}`;
    }
  }
  return url.replace(/\/+$/, '');
};

// ==========================================
// 🛡️ SUPERADMIN AUTHENTICATED CONTROLS
// ==========================================

/**
 * @desc    Generate cryptographically secure single-use Emergency Super Gate link
 * @route   POST /api/admin/maintenance/emergency-link
 * @access  Private / SuperAdmin Only
 */
export const generateEmergencyLink = asyncHandler(async (req, res) => {
  const user = req.user;

  // 1. Strict SuperAdmin authorization check
  const isSuperAdmin = user && (user.role === 'super-admin' || user.role === 'super_admin' || user.role === 'owner');
  if (!isSuperAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Only designated SuperAdmins may generate Emergency Super Gate links.'
    });
  }

  const recipientEmail = (user.email || '').trim().toLowerCase();
  if (!recipientEmail) {
    return res.status(400).json({
      success: false,
      message: 'Authenticated SuperAdmin does not have a verified email address.'
    });
  }

  // 2. Generate 32-byte cryptographically secure token & SHA-256 hash
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  // 3. Set expiration (10 minutes)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // 4. Revoke any previous ACTIVE emergency tokens for this user
  await EmergencyAccess.updateMany(
    { generatedBy: user._id, status: 'ACTIVE' },
    { $set: { status: 'REVOKED', revokedAt: new Date() } }
  );

  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const userAgent = req.get('user-agent') || '';

  // 5. Create new EmergencyAccess record
  const emergencyDoc = new EmergencyAccess({
    generatedBy: user._id,
    adminName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'SuperAdmin',
    recipientEmail,
    tokenHash,
    status: 'ACTIVE',
    expiresAt,
    requestMetadata: {
      generationIp: ip,
      generationUserAgent: userAgent
    }
  });

  const frontendBase = getFrontendUrl(req);
  const emergencyUrl = `${frontendBase}/emergency/super-gate?token=${rawToken}`;

  // 6. Also sync to Settings.maintenance for backwards compatibility
  try {
    const settings = await Settings.getSettings();
    settings.maintenance.magicLinkToken = tokenHash;
    settings.maintenance.magicLinkRaw = null; // NEVER store raw token in database
    settings.maintenance.magicLinkExpires = expiresAt;
    await settings.save();
    await settingsService.invalidateSettings();
  } catch (syncErr) {
    console.error('Settings maintenance sync warning:', syncErr.message);
  }

  // 7. Dispatch Out-of-band Email to SuperAdmin verified email
  let emailDeliveryStatus = 'PENDING';
  let emailError = null;

  try {
    await sendEmail({
      to: recipientEmail,
      subject: '🚨 Emergency Store Maintenance Access Link — Rerendet Coffee',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 14px; background-color: #0B0F1A; color: #f1f5f9;">
          <div style="text-align: center; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.08);">
            <h1 style="color: #D4AF37; margin: 0; font-size: 24px; letter-spacing: 0.5px;">🔐 Emergency Super Gate</h1>
            <p style="color: #94a3b8; font-size: 13px; margin-top: 6px;">Out-of-Band Storefront Maintenance Control</p>
          </div>

          <div style="padding: 16px 20px; background-color: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; border-radius: 6px; margin-bottom: 22px;">
            <p style="margin: 0; font-size: 14px; color: #fef3c7; font-weight: 600;">⚠️ Highly Privileged Emergency Access Link</p>
            <p style="margin: 5px 0 0 0; font-size: 13px; color: #fde68a; line-height: 1.4;">
              An emergency maintenance access link was generated for your e-commerce platform. This allows you to toggle storefront maintenance mode if the administrator dashboard or normal authentication is unavailable.
            </p>
          </div>

          <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
            Hello <strong>${user.firstName || 'SuperAdmin'}</strong>, you can use the button below to reach the independent Emergency Super Gate:
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${emergencyUrl}" style="background: linear-gradient(135deg, #D4AF37 0%, #B89628 100%); color: #0B0F1A; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);">
              🚨 Open Emergency Super Gate
            </a>
          </div>

          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 14px 18px; margin-bottom: 25px; font-size: 12px; color: #94a3b8; line-height: 1.6;">
            <strong style="color: #fff;">Strict Security Rules:</strong><br>
            • <strong>Single-use link:</strong> It will be permanently consumed after 1 action.<br>
            • <strong>Short expiration:</strong> Valid for exactly 10 minutes (expires at <em>${expiresAt.toLocaleTimeString('en-KE', { timeZone: 'Africa/Nairobi' })} EAT</em>).<br>
            • <strong>Narrow scope:</strong> Can ONLY toggle storefront maintenance mode. Cannot view orders, customer records, or financial information.<br>
            • If you did not generate this link, revoke it immediately from the dashboard.
          </div>

          <p style="font-size: 11px; color: #64748b; text-align: center; margin: 0;">
            Rerendet Coffee Farm · highland specialty roasters · Automated Security Dispatch
          </p>
        </div>
      `
    });
    emailDeliveryStatus = 'SENT';
  } catch (mailErr) {
    console.error('❌ Failed to email emergency super gate link:', mailErr.message);
    emailDeliveryStatus = 'FAILED';
    emailError = mailErr.message;
  }

  emergencyDoc.emailDeliveryStatus = emailDeliveryStatus;
  emergencyDoc.emailError = emailError;
  await emergencyDoc.save();

  // 8. Return response once with complete emergency URL for dashboard display
  res.status(201).json({
    success: true,
    message: emailDeliveryStatus === 'SENT'
      ? 'Emergency Super Gate link generated and dispatched to your verified email.'
      : 'Emergency link generated successfully (email dispatch failed; please copy link below).',
    data: {
      emergencyUrl,
      expiresAt,
      expiresInMinutes: 10,
      recipientEmail,
      emailDeliveryStatus,
      emailError
    }
  });
});

/**
 * @desc    Get safe metadata of recent emergency access links
 * @route   GET /api/admin/maintenance/emergency-links
 * @access  Private / SuperAdmin Only
 */
export const getEmergencyLinks = asyncHandler(async (req, res) => {
  const user = req.user;
  const isSuperAdmin = user && (user.role === 'super-admin' || user.role === 'super_admin' || user.role === 'owner');
  if (!isSuperAdmin) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  // Update expired records automatically in DB
  await EmergencyAccess.updateMany(
    { status: 'ACTIVE', expiresAt: { $lt: new Date() } },
    { $set: { status: 'EXPIRED' } }
  );

  const links = await EmergencyAccess.find()
    .sort({ createdAt: -1 })
    .limit(15)
    .select('-tokenHash')
    .lean();

  const activeLink = links.find(l => l.status === 'ACTIVE' && new Date(l.expiresAt) > new Date());

  res.json({
    success: true,
    data: {
      hasActiveLink: Boolean(activeLink),
      activeLinkExpiresAt: activeLink ? activeLink.expiresAt : null,
      activeRecipient: activeLink ? activeLink.recipientEmail : null,
      history: links
    }
  });
});

/**
 * @desc    Revoke all active emergency access links
 * @route   POST /api/admin/maintenance/emergency-link/revoke
 * @access  Private / SuperAdmin Only
 */
export const revokeEmergencyLink = asyncHandler(async (req, res) => {
  const user = req.user;
  const isSuperAdmin = user && (user.role === 'super-admin' || user.role === 'super_admin' || user.role === 'owner');
  if (!isSuperAdmin) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const result = await EmergencyAccess.updateMany(
    { status: 'ACTIVE' },
    { $set: { status: 'REVOKED', revokedAt: new Date() } }
  );

  try {
    const settings = await Settings.getSettings();
    settings.maintenance.magicLinkToken = null;
    settings.maintenance.magicLinkExpires = null;
    await settings.save();
    await settingsService.invalidateSettings();
  } catch (err) {
    // ignore
  }

  res.json({
    success: true,
    message: `Revoked ${result.modifiedCount} active emergency access link(s).`
  });
});

// ==========================================
// 🚨 INDEPENDENT EMERGENCY ENDPOINTS (UNAUTHENTICATED)
// ==========================================

/**
 * @desc    Verify emergency token validity without consuming it
 * @route   POST /api/emergency/verify
 * @access  Public (Protected by Cryptographic Token)
 */
export const verifyEmergencyToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== 'string' || token.length < 32) {
    return res.status(400).json({
      success: false,
      valid: false,
      message: 'Invalid emergency token format.'
    });
  }

  const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

  const emergencyRecord = await EmergencyAccess.findOne({ tokenHash });
  if (!emergencyRecord) {
    return res.status(401).json({
      success: false,
      valid: false,
      message: 'Emergency access token not found or invalid.'
    });
  }

  // Check state
  const now = new Date();
  if (emergencyRecord.status === 'USED') {
    return res.status(410).json({
      success: false,
      valid: false,
      message: 'This single-use emergency token has already been consumed.'
    });
  }

  if (emergencyRecord.status === 'REVOKED') {
    return res.status(403).json({
      success: false,
      valid: false,
      message: 'This emergency access link was revoked by a SuperAdmin.'
    });
  }

  if (emergencyRecord.expiresAt < now || emergencyRecord.status === 'EXPIRED') {
    if (emergencyRecord.status === 'ACTIVE') {
      emergencyRecord.status = 'EXPIRED';
      await emergencyRecord.save();
    }
    return res.status(410).json({
      success: false,
      valid: false,
      message: 'This emergency access link has expired (10-minute validity exceeded).'
    });
  }

  // Token is valid! Fetch current maintenance mode status
  const settings = await Settings.getSettings();

  res.json({
    success: true,
    valid: true,
    data: {
      recipientEmail: emergencyRecord.recipientEmail,
      adminName: emergencyRecord.adminName,
      expiresAt: emergencyRecord.expiresAt,
      maintenanceEnabled: Boolean(settings.maintenance?.enabled),
      maintenanceMessage: settings.maintenance?.message || 'Storefront maintenance active',
      storeName: settings.store?.name || 'Rerendet Coffee'
    }
  });
});

/**
 * @desc    Atomically consume emergency token and toggle storefront maintenance mode
 * @route   POST /api/emergency/execute
 * @access  Public (Protected by Single-Use Cryptographic Token)
 */
export const executeEmergencyAction = asyncHandler(async (req, res) => {
  const { token, action, reason } = req.body;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ success: false, message: 'Missing emergency token.' });
  }

  if (action !== 'enable' && action !== 'disable') {
    return res.status(400).json({ success: false, message: "Action must be 'enable' or 'disable'." });
  }

  const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
  const now = new Date();

  // ATOMIC CONSUMPTION: Token can only be consumed once, preventing race conditions or replay attacks
  const consumedRecord = await EmergencyAccess.findOneAndUpdate(
    {
      tokenHash,
      status: 'ACTIVE',
      expiresAt: { $gt: now }
    },
    {
      $set: {
        status: 'USED',
        usedAt: now,
        actionPerformed: action,
        'requestMetadata.executionIp': req.ip || req.headers['x-forwarded-for'] || '',
        'requestMetadata.executionUserAgent': req.get('user-agent') || ''
      }
    },
    { new: true }
  );

  if (!consumedRecord) {
    return res.status(401).json({
      success: false,
      message: 'Action rejected: Emergency token is invalid, expired, revoked, or already consumed.'
    });
  }

  // Apply maintenance change to persistent Settings
  const settings = await Settings.getSettings();
  const newEnabledState = action === 'enable';

  settings.maintenance.enabled = newEnabledState;
  settings.maintenance.lastToggledAt = now;
  settings.maintenance.magicLinkToken = null; // Clear active token
  settings.maintenance.magicLinkExpires = null;

  // Append to maintenance audit history
  settings.maintenance.history.push({
    action: newEnabledState ? 'enabled' : 'disabled',
    actorName: `SuperAdmin Emergency Gate (${consumedRecord.recipientEmail})`,
    ip: req.ip || req.headers['x-forwarded-for'] || 'emergency-out-of-band',
    source: 'magic-link',
    timestamp: now
  });

  await settings.save();

  // Invalidate settings cache and memory cache in maintenance middleware
  await settingsService.invalidateSettings();
  if (maintenanceMiddleware && maintenanceMiddleware.cache) {
    maintenanceMiddleware.cache = null;
  }

  // Security alert dispatch
  import('../utils/securityAlerts.js').then(({ dispatchSecurityAlert }) => {
    dispatchSecurityAlert({
      eventTitle: `Emergency Super Gate: Maintenance ${newEnabledState ? 'ENABLED' : 'DISABLED'}`,
      eventDescription: `An emergency single-use token was used to toggle storefront maintenance mode to: **${newEnabledState ? 'OFFLINE (MAINTENANCE ON)' : 'LIVE (MAINTENANCE OFF)'}**. Reason: ${reason || 'Out-of-band emergency action'}`,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
      severity: 'HIGH',
      metadata: {
        'Action': newEnabledState ? 'Maintenance Activated' : 'Store Restored',
        'Executor': consumedRecord.recipientEmail,
        'Source': 'Emergency Super Gate',
        'Timestamp': now.toISOString()
      }
    });
  }).catch(() => {});

  // Async email notification to all other admins
  try {
    const admins = await User.find({ role: { $in: ['admin', 'super-admin'] } }).select('email firstName');
    admins.forEach(admin => {
      sendEmail({
        to: admin.email,
        subject: `⚠️ Emergency Super Gate Action: Storefront ${newEnabledState ? 'Offline' : 'Online'}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; background: #0B0F1A; color: #fff; border-radius: 10px;">
            <h2 style="color: ${newEnabledState ? '#ef4444' : '#10b981'};">🚨 Emergency Super Gate Notification</h2>
            <p>Storefront maintenance mode was <strong>${newEnabledState ? 'ACTIVATED (Store Offline)' : 'DEACTIVATED (Store Live)'}</strong> via Emergency Super Gate.</p>
            <p><strong>Triggered By:</strong> ${consumedRecord.recipientEmail}</p>
            <p><strong>Time:</strong> ${now.toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })} EAT</p>
            <p><strong>Note:</strong> The single-use token has been permanently consumed.</p>
          </div>
        `
      }).catch(e => console.error('Admin notification failed:', e.message));
    });
  } catch (e) {
    // ignore
  }

  res.json({
    success: true,
    message: newEnabledState
      ? 'Emergency activation successful: Storefront is now in maintenance mode.'
      : 'Emergency deactivation successful: Storefront is now live.',
    data: {
      maintenanceEnabled: newEnabledState,
      executedAt: now,
      actionPerformed: action,
      recipientEmail: consumedRecord.recipientEmail
    }
  });
});

/**
 * @desc    Get current storefront maintenance status
 * @route   GET /api/emergency/status
 * @access  Public
 */
export const getEmergencyStatus = asyncHandler(async (req, res) => {
  const settings = await Settings.getSettings();
  res.json({
    success: true,
    data: {
      maintenanceEnabled: Boolean(settings.maintenance?.enabled),
      message: settings.maintenance?.message || 'Maintenance active',
      storeName: settings.store?.name || 'Rerendet Coffee'
    }
  });
});

