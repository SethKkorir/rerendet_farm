import asyncHandler from 'express-async-handler';
import Settings from '../models/Settings.js';
import User from '../models/User.js';
import crypto from 'crypto';
import sendEmail from '../utils/sendEmail.js';
import { getMaintenanceEmail, getMaintenanceResolvedEmail } from '../utils/emailTemplates.js';
import settingsService from '../services/settingsService.js';

// @desc    Get settings
// @route   GET /api/admin/settings
// @access  Private/Admin
const getSettings = asyncHandler(async (req, res) => {
  try {
    console.log('🔧 Fetching settings...');

    const settings = await settingsService.getSettings();

    console.log('✅ Settings fetched successfully');

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

    const settings = await Settings.getSettings();

    // Update settings with new data
    const updatedSettings = await Settings.findOneAndUpdate(
      {},
      { $set: req.body },
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
                      <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/privacy-policy" style="background-color: #6b4226; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Privacy Policy</a>
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
        paymentMethods: settings.payment.paymentMethods
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

// @desc    Generate a maintenance magic link (Enterpise Super Gate)
// @route   POST /api/admin/settings/maintenance/magic-link
// @access  Private/Admin (Super Admin only)
const generateMaintenanceMagicLink = asyncHandler(async (req, res) => {
  const settings = await Settings.getSettings();

  // Only super-admin can generate
  if (req.user.role !== 'super-admin') {
    return res.status(403).json({ success: false, message: 'Unauthorized. Super Admin only.' });
  }

  // Generate a cryptographically secure token
  const token = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Store expiration and hashed token
  settings.maintenance.magicLinkToken = hashedToken;
  settings.maintenance.magicLinkExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  await settings.save();

  // Invalidate settings cache
  await settingsService.invalidateSettings();

  const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
  const magicLink = `${backendUrl}/api/settings/super-gate/${token}`;

  res.json({
    success: true,
    message: 'Single-use magic link generated. Valid for 1 hour.',
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

  const siteUrl = process.env.FRONTEND_URL || '/';

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

  // 1. Invalidate link (Single-use)
  settings.maintenance.magicLinkToken = null;
  settings.maintenance.magicLinkExpires = null;

  // 2. Update state & Log
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

  // Invalidate settings cache
  await settingsService.invalidateSettings();

  // 3. Dispatch Async Notifications
  const notifyUsers = async () => {
    try {
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
        <p style="color: #ADB5BD;">Source: Out-of-band Magic Link (Invalidated)</p>
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
  triggerSuperGate
};