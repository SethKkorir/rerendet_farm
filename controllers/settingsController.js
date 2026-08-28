import asyncHandler from 'express-async-handler';
import Settings from '../models/Settings.js';
import User from '../models/User.js';
import crypto from 'crypto';
import sendEmail from '../utils/sendEmail.js';
import { getMaintenanceEmail, getMaintenanceResolvedEmail } from '../utils/emailTemplates.js';
import settingsService from '../services/settingsService.js';

const maskSecret = (val) => {
  if (!val || typeof val !== 'string') return val;
  if (val.startsWith('••••')) return val;
  if (val.length <= 4) return '••••';
  return '••••••••' + val.slice(-4);
};

// @desc    Get settings
// @route   GET /api/admin/settings
// @access  Private/Admin
const getSettings = asyncHandler(async (req, res) => {
  try {
    console.log('🔧 Fetching settings...');

    const rawSettings = await settingsService.getSettings();
    const settings = rawSettings ? (rawSettings.toObject ? rawSettings.toObject() : JSON.parse(JSON.stringify(rawSettings))) : {};

    // Mask API Secrets in API responses for security
    if (settings.payment) {
      if (settings.payment.mpesaPaybillPasskey) settings.payment.mpesaPaybillPasskey = maskSecret(settings.payment.mpesaPaybillPasskey);
      if (settings.payment.mpesaConsumerSecret) settings.payment.mpesaConsumerSecret = maskSecret(settings.payment.mpesaConsumerSecret);
      if (settings.payment.paypalSecret) settings.payment.paypalSecret = maskSecret(settings.payment.paypalSecret);
      if (settings.payment.stripeSecretKey) settings.payment.stripeSecretKey = maskSecret(settings.payment.stripeSecretKey);
    }

    console.log('✅ Settings fetched successfully (Secrets Masked)');

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('❌ Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Update settings
// @route   PUT /api/admin/settings
// @access  Private/Admin
const updateSettings = asyncHandler(async (req, res) => {
  try {
    console.log('🔧 Updating settings...', req.body);

    const updatePayload = { ...req.body };
    if (updatePayload.payment) {
      const keysToClean = ['mpesaPaybillPasskey', 'mpesaConsumerSecret', 'paypalSecret', 'stripeSecretKey'];
      keysToClean.forEach(k => {
        if (updatePayload.payment[k] && typeof updatePayload.payment[k] === 'string' && updatePayload.payment[k].startsWith('••••')) {
          delete updatePayload.payment[k];
        }
      });
    }

    // Update settings with new data
    const updatedSettings = await Settings.findOneAndUpdate(
      {},
      { $set: updatePayload },
      {
        new: true,
        runValidators: true,
        upsert: true
      }
    );

    console.log('✅ Settings updated successfully');

    // Invalidate settings cache
    await settingsService.invalidateSettings();


    // Handle Maintenance Mode Notification & Audit (Enterprise Super Gate)
    if (req.body.maintenance && typeof req.body.maintenance.enabled !== 'undefined') {
      const wasMaintenance = settings.maintenance.enabled;
      const isMaintenanceNow = req.body.maintenance.enabled === true || req.body.maintenance.enabled === 'true';

      if (isMaintenanceNow !== wasMaintenance) {
        console.log(`🚧 Maintenance status changed via dashboard: ${wasMaintenance} -> ${isMaintenanceNow}`);

        // Update audit log in the updatedSettings object
        updatedSettings.maintenance.lastToggledAt = Date.now();
        updatedSettings.maintenance.history.push({
          action: isMaintenanceNow ? 'enabled' : 'disabled',
          actor: req.user?._id,
          actorName: req.user ? `${req.user.firstName} ${req.user.lastName}` : 'Admin',
          ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
          source: 'dashboard',
          timestamp: Date.now()
        });
        await updatedSettings.save();

        // Dispatch Enterprise Security Alert
        import('../utils/securityAlerts.js').then(({ dispatchSecurityAlert }) => {
          dispatchSecurityAlert({
            eventTitle: 'Maintenance Mode Toggled',
            eventDescription: `Maintenance Mode has been toggled to: **${isMaintenanceNow ? 'ENABLED' : 'DISABLED'}** via Admin Dashboard.`,
            ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
            userAccount: req.user ? req.user.email : 'Admin',
            severity: 'WARNING',
            metadata: {
              'Action': isMaintenanceNow ? 'Activated' : 'Deactivated',
              'Actor': req.user ? `${req.user.firstName} ${req.user.lastName}` : 'Admin',
              'Interface': 'Dashboard'
            }
          });
        }).catch(err => console.error('Alert trigger error:', err));

        // Dynamic dynamic administrator downtime email alert
        const notifyAdminsDowntime = async () => {
          try {
            if (isMaintenanceNow) {
              const admins = await User.find({ role: { $in: ['admin', 'super-admin'] } }).select('email firstName');
              console.log(`🛡️ [Cybersecurity Security Alert] Dispatching automatic downtime notifications to ${admins.length} administrators...`);
              await Promise.allSettled(admins.map(admin =>
                sendEmail({
                  to: admin.email,
                  subject: '⚠️ Alert: Rerendet Coffee Downtime Activated',
                  html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #ef4444; border-radius: 12px; background-color: #ffffff;">
                      <h2 style="color: #ef4444; margin: 0 0 10px;">⚠️ Authoritative Downtime Event Alert</h2>
                      <p style="font-size: 15px; color: #333;">Hello ${admin.firstName},</p>
                      <p style="font-size: 14px; color: #555;">This is an automated security broadcast. Rerendet Coffee has been put into <strong>Maintenance Mode / Downtime</strong> successfully.</p>
                      <p style="font-size: 14px; color: #555; padding: 10px; background-color: #fef2f2; border-left: 4px solid #ef4444;">
                        <strong>Status:</strong> Active Downtime Blocked
                      </p>
                      <p style="font-size: 13px; color: #888; margin-top: 25px;">Logged under security compliance audit trails.</p>
                    </div>
                  `
                })
              ));
            }
          } catch (err) {
            console.error('❌ Failed to email admins downtime notification:', err.message);
          }
        };

        // Async Background Notification
        const notifyMaintenance = async () => {
          try {
            const customers = await User.find({ userType: 'customer' }).select('email firstName');
            const batchSize = 10;
            console.log(`📧 Dispatching maintenance notification to ${customers.length} customers...`);

            for (let i = 0; i < customers.length; i += batchSize) {
              const batch = customers.slice(i, i + batchSize);
              await Promise.allSettled(batch.map(customer =>
                sendEmail({
                  to: customer.email,
                  subject: isMaintenanceNow ? 'Scheduled Maintenance - Rerendet Coffee' : 'We are Back Online! - Rerendet Coffee',
                  html: isMaintenanceNow
                    ? getMaintenanceEmail(req.body.maintenance.message || settings.maintenance.message, settings.store?.logo)
                    : getMaintenanceResolvedEmail(settings.store?.logo)
                })
              ));
            }
          } catch (error) {
            console.error('❌ Background notification failed:', error);
          }
        };

        notifyMaintenance();
        notifyAdminsDowntime();
      }
    }

    // Handle Policy Update Notification
    if (req.body.notifyCustomers) {
      console.log('📧 Sending policy update notification to customers...');
      // Run asynchronously to not block response
      const notifyUsers = async () => {
        try {
          const customers = await User.find({ userType: 'customer' }).select('email firstName');
          console.log(`📊 Found ${customers.length} customers to notify.`);

          if (customers.length > 0) {
            const emailPromises = customers.map(user => {
              const clientUrl = (!process.env.CLIENT_URL || process.env.CLIENT_URL.includes('localhost') || process.env.CLIENT_URL.includes('127.0.0.1')) && (process.env.NODE_ENV === 'production' || process.env.VERCEL)
                ? 'https://rerendet-farm.vercel.app'
                : (process.env.CLIENT_URL || 'http://localhost:3000');
              return sendEmail({
                email: user.email,
                subject: 'Important Update: Rerendet Coffee Policies',
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
                    <h1 style="color: #6b4226;">Policy Update Notice</h1>
                    <p>Hello ${user.firstName},</p>
                    <p>We wanted to let you know that we have updated our store policies to better serve you.</p>
                    <p>Please review our latest terms and policies on our website.</p>
                    <div style="margin: 30px 0;">
                      <a href="${clientUrl}/privacy-policy" style="background-color: #6b4226; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Privacy Policy</a>
                    </div>
                    <p>Thank you for being a valued customer.</p>
                    <p>Best regards,<br>Rerendet Coffee Team</p>
                  </div>
                `
              });
            });

            await Promise.allSettled(emailPromises);
            console.log('✅ Bulk emails dispatched');
          }
        } catch (emailError) {
          console.error('❌ Failed to send bulk notifications:', emailError);
        }
      };

      notifyUsers();
    }

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: updatedSettings
    });
  } catch (error) {
    console.error('❌ Update settings error:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Upload logo
// @route   POST /api/admin/upload/logo
// @access  Private/Admin
const uploadLogo = asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No logo file uploaded'
      });
    }

    console.log('📸 Logo uploaded:', req.file);

    // In a real application, you'd upload to cloud storage (AWS S3, Cloudinary, etc.)
    // For now, we'll return the file path
    const logoUrl = `/uploads/${req.file.filename}`;

    // Update settings with new logo
    const settings = await Settings.getSettings();
    settings.store.logo = logoUrl;
    await settings.save();

    // Invalidate settings cache
    await settingsService.invalidateSettings();

    res.json({
      success: true,
      message: 'Logo uploaded successfully',
      data: { url: logoUrl }
    });
  } catch (error) {
    console.error('❌ Logo upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload logo',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Get public settings
// @route   GET /api/settings/public
// @access  Public
const getPublicSettings = asyncHandler(async (req, res) => {
  try {
    const settings = await settingsService.getSettings();

    // Return only public information
    const publicSettings = {
      store: settings.store,
      businessHours: settings.businessHours,
      payment: {
        currency: settings.payment.currency,
        currencySymbol: settings.payment.currencySymbol,
        freeShippingThreshold: settings.payment.freeShippingThreshold,
        shippingPrice: settings.payment.shippingPrice,
        paymentMethods: settings.payment.paymentMethods,
        countyShipping: settings.countyShipping
      },
      seo: settings.seo,
      policies: settings.policies,
      maintenance: settings.maintenance,
      about: settings.about,
      features: settings.features
    };

    res.json({
      success: true,
      data: publicSettings
    });
  } catch (error) {
    console.error('Get public settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings'
    });
  }
});

// Helper to rotate the magic link and email it to the super-admin
const rotateAndEmailMagicLink = async (settings, customHost = null) => {
  const token = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Store active pre-generated token valid for 7 days
  settings.maintenance.magicLinkToken = hashedToken;
  settings.maintenance.magicLinkRaw = token;
  settings.maintenance.magicLinkExpires = Date.now() + 7 * 24 * 60 * 60 * 1000;
  await settings.save();

  // Invalidate settings cache
  await settingsService.invalidateSettings();

  let baseUrl = process.env.BACKEND_URL || process.env.CLIENT_URL || process.env.FRONTEND_URL;
  if (!baseUrl || baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      baseUrl = 'https://rerendet-farm.vercel.app';
    } else {
      baseUrl = baseUrl || (customHost ? `http://${customHost}` : 'http://localhost:5000');
    }
  }
  const magicLink = `${baseUrl}/api/settings/super-gate/${token}`;

  // Verify recipient has admin/super-admin privileges before sending magic link
  try {
    const recipientUser = await User.findOne({ email: 'zsethkipchumba179@gmail.com' }).select('role userType');
    if (recipientUser) {
      const isPrivileged = recipientUser.role === 'admin' || recipientUser.role === 'super-admin' || recipientUser.userType === 'admin';
      if (!isPrivileged) {
        console.warn(`🚨 [Cybersecurity Warning] Magic link email dispatch aborted: zsethkipchumba179@gmail.com is registered as a customer!`);
        return magicLink;
      }
    } else {
      console.warn(`🚨 [Cybersecurity Warning] Magic link email dispatch aborted: Recipient zsethkipchumba179@gmail.com not found in User DB!`);
      return magicLink;
    }
  } catch (err) {
    console.error('❌ Magic link recipient security check failed:', err.message);
  }

  // Silent SMTP email dispatch to super admin zsethkipchumba179@gmail.com
  await sendEmail({
    to: 'zsethkipchumba179@gmail.com',
    subject: '🔑 Emergency Super Gate Magic Link - Rerendet Coffee',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 25px;">
          <h1 style="color: #6b4226; margin: 0; font-size: 24px;">🔑 Out-of-Band Emergency Super Gate</h1>
          <p style="color: #666; font-size: 14px; margin-top: 5px;">Rerendet Coffee Enterprise Security Protocol</p>
        </div>
        <div style="padding: 20px; background-color: #fcf8f2; border-left: 4px solid #d4af37; border-radius: 4px; margin-bottom: 25px;">
          <p style="margin: 0; font-size: 15px; color: #5c3e21; font-weight: bold;">⚠️ Keep this link secure and accessible outside the system.</p>
          <p style="margin: 5px 0 0 0; font-size: 13px; color: #7c5e41;">If the database or server goes offline, this link allows you to toggle maintenance mode/downtime out-of-band directly from this email.</p>
        </div>
        <p style="font-size: 15px; color: #333;">This is your active pre-generated magic link. It is single-use and will automatically rotate in 7 days.</p>
        <div style="text-align: center; margin: 35px 0;">
          <a href="${magicLink}" style="background-color: #6b4226; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">🚨 Toggle Maintenance Mode</a>
        </div>
        <p style="font-size: 13px; color: #888; text-align: center; margin-top: 30px;">
          <strong>Expires:</strong> ${new Date(settings.maintenance.magicLinkExpires).toLocaleString()}<br>
          If you did not request this link, please review your admin logs immediately.
        </p>
      </div>
    `
  });

  return magicLink;
};

// @desc    Generate a maintenance magic link (Enterpise Super Gate)
// @route   POST /api/admin/settings/maintenance/magic-link
// @access  Private/Admin (Super Admin only)
const generateMaintenanceMagicLink = asyncHandler(async (req, res) => {
  const settings = await Settings.getSettings();

  // Only super-admin can generate
  if (req.user.role !== 'super-admin') {
    return res.status(403).json({ success: false, message: 'Unauthorized. Super Admin only.' });
  }

  const magicLink = await rotateAndEmailMagicLink(settings, req.get('host'));

  res.json({
    success: true,
    message: 'Single-use magic link pre-generated & stored. Valid for 7 days.',
    data: { link: magicLink, expires: settings.maintenance.magicLinkExpires }
  });
});

// @desc    Trigger maintenance via magic link (Out-of-band)
// @route   GET /api/settings/super-gate/:token
// @access  Public (Secure)
const triggerSuperGate = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const settings = await Settings.findOne({
    'maintenance.magicLinkToken': hashedToken,
    'maintenance.magicLinkExpires': { $gt: Date.now() }
  });

  let siteUrl = process.env.FRONTEND_URL;
  if (!siteUrl || siteUrl.includes('localhost') || siteUrl.includes('127.0.0.1')) {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      siteUrl = 'https://rerendet-farm.vercel.app';
    } else {
      siteUrl = siteUrl || '/';
    }
  }

  if (!settings) {
    return res.status(401).send(`
      <div style="font-family: sans-serif; height: 100vh; display: flex; align-items: center; justify-content: center; background: #0B0F1A; color: white;">
        <div style="text-align: center; padding: 40px; border: 1px solid #ef4444; border-radius: 12px; background: rgba(239, 68, 68, 0.05);">
          <h1 style="color: #ef4444;">Access Denied</h1>
          <p>This magic link is invalid, expired, or has already been used.</p>
          <a href="${siteUrl}" style="color: #D4AF37; display: block; margin-top: 20px;">Return to Site</a>
        </div>
      </div>
    `);
  }

  const newState = !settings.maintenance.enabled;

  // 1. Update state & Log
  settings.maintenance.enabled = newState;
  settings.maintenance.lastToggledAt = Date.now();

  settings.maintenance.history.push({
    action: newState ? 'enabled' : 'disabled',
    actorName: 'Emergency Super Gate',
    ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    source: 'magic-link',
    timestamp: Date.now()
  });

  await settings.save();

  // Dispatch Security Alert
  import('../utils/securityAlerts.js').then(({ dispatchSecurityAlert }) => {
    dispatchSecurityAlert({
      eventTitle: 'Magic Link Used - Maintenance Mode Toggled',
      eventDescription: `Emergency Out-of-band Magic Link was used to toggle Maintenance Mode to: **${newState ? 'ENABLED' : 'DISABLED'}**.`,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAccount: 'Emergency Super Gate',
      severity: 'WARNING',
      metadata: {
        'Action': newState ? 'Activated' : 'Deactivated',
        'Actor': 'Emergency Super Gate User',
        'Interface': 'Out-of-band Magic Link'
      }
    });
  }).catch(err => console.error('Alert trigger error:', err));

  // 2. Invalidate used link and pre-generate the next magic link immediately
  await rotateAndEmailMagicLink(settings, req.get('host'));

  // 3. Dispatch Async Notifications to customers & verified administrators
  const notifyUsers = async () => {
    try {
      // Automatic downtime notification to all admins
      if (newState) {
        const admins = await User.find({ role: { $in: ['admin', 'super-admin'] } }).select('email firstName');
        console.log(`🛡️ [Cybersecurity Security Alert] Dispatching magic-link downtime alerts to ${admins.length} administrators...`);
        await Promise.allSettled(admins.map(admin =>
          sendEmail({
            to: admin.email,
            subject: '⚠️ Alert: Rerendet Coffee Downtime Activated via Magic Link',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #ef4444; border-radius: 12px; background-color: #ffffff;">
                <h2 style="color: #ef4444; margin: 0 0 10px;">⚠️ Emergency Downtime Activated</h2>
                <p style="font-size: 15px; color: #333;">Hello ${admin.firstName},</p>
                <p style="font-size: 14px; color: #555;">The Emergency Out-of-band Magic Link was used to toggle Maintenance Mode / Downtime to <strong>ENABLED</strong>.</p>
                <p style="font-size: 14px; color: #555; padding: 10px; background-color: #fef2f2; border-left: 4px solid #ef4444;">
                  <strong>Actor:</strong> Emergency Super Gate User<br/>
                  <strong>Status:</strong> website offline / downtime block active
                </p>
                <p style="font-size: 13px; color: #888; margin-top: 25px;">Logged under security compliance audit trails.</p>
              </div>
            `
          })
        ));
      }

      const customers = await User.find({ userType: 'customer' }).select('email');
      for (const customer of customers) {
        await sendEmail({
          to: customer.email,
          subject: newState ? 'Scheduled Maintenance Alert' : 'We are Back Online!',
          html: newState
            ? getMaintenanceEmail(settings.maintenance.message, settings.store?.logo)
            : getMaintenanceResolvedEmail(settings.store?.logo)
        }).catch(err => console.error(`Email fail: ${customer.email}`, err.message));
      }
    } catch (e) { console.error('Magic link notify fail:', e); }
  };
  notifyUsers();

  res.send(`
    <div style="font-family: sans-serif; height: 100vh; display: flex; align-items: center; justify-content: center; background: #0B0F1A; color: white;">
      <div style="text-align: center; padding: 50px; border: 1px solid #D4AF37; border-radius: 20px; background: rgba(212, 175, 55, 0.05);">
        <h1 style="color: #D4AF37;">Super Gate: ${newState ? 'LOCKED 🔒' : 'UNLOCKED 🔓'}</h1>
        <p style="font-size: 1.2rem; margin: 25px 0;">System downtime has been toggled successfully.</p>
        <p style="color: #ADB5BD;">Source: Out-of-band Magic Link (Invalidated & Rotated)</p>
        <div style="margin-top: 40px;">
          <a href="${siteUrl}/admin" style="background: #D4AF37; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 700;">Proceed to Panel</a>
        </div>
      </div>
    </div>
  `);
});

export {
  getSettings,
  updateSettings,
  uploadLogo,
  getPublicSettings,
  generateMaintenanceMagicLink,
  triggerSuperGate,
  rotateAndEmailMagicLink
};