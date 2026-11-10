// utils/securityAlerts.js
import sendEmail from './sendEmail.js';
import Settings from '../models/Settings.js';
import crypto from 'crypto';
import os from 'os';

const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'kipzseth@gmail.com';

// Sliding windows state for spikes monitoring (in-memory caching for active instances)
const state = {
  paymentFailures: [],
  serverCrashes: [],
  lastAlertSentAt: {} // Rate limit alerts to avoid flooding the super-admin
};

// Dispatch a premium formatted HTML email security alert to superAdminEmail
export const dispatchSecurityAlert = async ({
  eventTitle,
  eventDescription,
  ipAddress = 'N/A',
  userAccount = 'N/A',
  severity = 'WARNING', // INFO, WARNING, CRITICAL
  includeKillswitch = false,
  metadata = {}
}) => {
  try {
    const timestamp = new Date().toLocaleString();
    const cleanIp = ipAddress.includes('::1') ? '127.0.0.1' : ipAddress;

    // Rate-limiting same alerts to once every 10 minutes to prevent inbox flooding
    const alertKey = `${eventTitle}-${userAccount}`;
    const lastSent = state.lastAlertSentAt[alertKey];
    if (lastSent && Date.now() - lastSent < 10 * 60 * 1000) {
      console.log(`[Alert Shield] Rate limiting alert: ${eventTitle} (last sent ${Math.round((Date.now() - lastSent)/1000)}s ago)`);
      return;
    }
    state.lastAlertSentAt[alertKey] = Date.now();

    console.log(`🚨 [Security Alert] Dispatching alert: ${eventTitle} (Severity: ${severity})`);

    // Fetch settings to extract active pre-generated magic link
    const settings = await Settings.getSettings();
    const token = settings.maintenance.magicLinkRaw || 'no-active-token';
    let baseUrl = process.env.BACKEND_URL || process.env.CLIENT_URL || process.env.FRONTEND_URL;
    if (!baseUrl || baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
      if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
        baseUrl = 'https://rerendet-farm.vercel.app';
      } else {
        baseUrl = baseUrl || 'http://localhost:5007';
      }
    }
    const emergencyLink = `${baseUrl}/api/settings/super-gate/${token}`;

    const severityColor = 
      severity === 'CRITICAL' ? '#EF4444' : 
      severity === 'WARNING' ? '#F59E0B' : '#3B82F6';

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 30px auto; padding: 36px 32px; border: 1px solid #EEF2F6; border-radius: 24px; background-color: #FFFFFF; box-shadow: 0 14px 42px rgba(15, 23, 42, 0.05); color: #334155;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; padding: 5px 14px; border-radius: 9999px; background-color: ${severity === 'CRITICAL' ? '#FEF2F2' : severity === 'WARNING' ? '#FFFBEB' : '#EFF6FF'}; color: ${severityColor}; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; border: 1px solid ${severityColor}40;">
            ${severity} SECURITY EVENT
          </div>
          <h1 style="color: #0F2444; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">${eventTitle}</h1>
          <p style="color: #64748B; font-size: 13px; margin: 6px 0 0 0;">Timestamp: ${timestamp}</p>
        </div>

        <!-- Body Content -->
        <div style="margin-bottom: 24px;">
          <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
            ${eventDescription}
          </p>

          <!-- Metadata Box -->
          <div style="background-color: #F8FAFC; border: 1px solid #EEF2F6; border-radius: 18px; padding: 16px 20px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #EEF2F6; font-weight: 700; color: #64748B; width: 35%;">IP Address:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #EEF2F6; color: #0F2444; font-family: monospace;">${cleanIp}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #EEF2F6; font-weight: 700; color: #64748B;">User Account:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #EEF2F6; color: #0F2444;">${userAccount}</td>
              </tr>
              ${Object.entries(metadata).map(([key, val]) => `
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #EEF2F6; font-weight: 700; color: #64748B; text-transform: capitalize;">${key}:</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #EEF2F6; color: #0F2444;">${val}</td>
                </tr>
              `).join('')}
            </table>
          </div>

          ${(severity === 'CRITICAL' && includeKillswitch) ? `
          <!-- Emergency Action Box -->
          <div style="border: 1.5px dashed ${severityColor}; background-color: #FEF2F2; padding: 20px; border-radius: 18px; text-align: center; margin-top: 24px;">
            <h3 style="color: #DC2626; margin: 0 0 8px 0; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">🚨 Emergency Threat Containment</h3>
            <p style="color: #7F1D1D; font-size: 13px; margin: 0 0 16px 0; line-height: 1.5;">
              If this activity represents an active compromise, authorized administrators may lock down the website out-of-band:
            </p>
            <a href="${emergencyLink}" style="background-color: ${severityColor}; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 9999px; display: inline-block; box-shadow: 0 8px 22px rgba(239, 68, 68, 0.28);">
              Toggle Emergency Lockout
            </a>
          </div>
          ` : ''}
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #EEF2F6; padding-top: 20px; text-align: center; font-size: 12px; color: #94A3B8;">
          <p style="margin: 0;">This notification was dispatched automatically by Rerendet Security Shield.</p>
          ${(severity === 'CRITICAL' && includeKillswitch) ? `
          <p style="margin: 4px 0 0 0;">Do not share the emergency link. It expires in 7 days and rotates automatically.</p>
          ` : ''}
        </div>
      </div>
    `;

    await sendEmail({
      to: superAdminEmail,
      subject: `🚨 Rerendet SECURITY Alert: [${severity}] ${eventTitle}`,
      html: emailHtml
    });

  } catch (error) {
    console.error('❌ Failed to dispatch security alert:', error.message);
  }
};

// --- REAL-TIME DETECTORS & MONITORS ---

// Record and alert on payment failures spike (Alert if > 3 within 15 mins)
export const recordPaymentFailure = async (ip, email, method, errorMessage) => {
  const now = Date.now();
  state.paymentFailures.push({ timestamp: now, ip, email });
  
  // Clean entries older than 15 minutes
  state.paymentFailures = state.paymentFailures.filter(f => now - f.timestamp < 15 * 60 * 1000);

  if (state.paymentFailures.length >= 3) {
    // Clear list to avoid continuous triggers
    state.paymentFailures = [];

    await dispatchSecurityAlert({
      eventTitle: 'Payment Failure Spike Detected',
      eventDescription: `More than 3 checkouts failed within a 15-minute sliding window. This could indicate a potential carding attack, checkout exploitation, or payment gateway service disruption.`,
      ipAddress: ip,
      userAccount: email,
      severity: 'WARNING',
      metadata: {
        'Payment Method': method,
        'Latest Error': errorMessage,
        'Spike Window': '15 Minutes',
        'Total Failures Count': '3+'
      }
    });
  }
};

// Record and alert on server crashes / HTTP 500 spikes (Alert if > 5 within 5 mins)
export const recordServerCrash = async (error, req) => {
  const now = Date.now();
  const path = req.originalUrl;
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  state.serverCrashes.push({ timestamp: now, path, ip, error: error.message });

  // Clean older than 5 minutes
  state.serverCrashes = state.serverCrashes.filter(c => now - c.timestamp < 5 * 60 * 1000);

  if (state.serverCrashes.length >= 5) {
    state.serverCrashes = [];

    await dispatchSecurityAlert({
      eventTitle: 'HTTP 500 Crash Spike Detected',
      eventDescription: `The application crashed internally more than 5 times within a 5-minute sliding window. The server is unstable and may be undergoing an exploitation attempt.`,
      ipAddress: ip,
      userAccount: req.user ? req.user.email : 'Anonymous/Guest',
      severity: 'CRITICAL',
      metadata: {
        'Target Route': path,
        'Triggering Error': error.message,
        'Spike Window': '5 Minutes',
        'Total Crashes Count': '5+'
      }
    });
  }
};

// Check system resources (memory usage) and alert if Node process or production host is saturated
export const checkHardwareResources = async (req = null) => {
  const isDev = process.env.NODE_ENV !== 'production';
  const isMac = os.platform() === 'darwin';

  const memUsage = process.memoryUsage();
  const rssMB = Math.round(memUsage.rss / (1024 * 1024));
  const heapUsedMB = Math.round(memUsage.heapUsed / (1024 * 1024));
  const heapTotalMB = Math.round(memUsage.heapTotal / (1024 * 1024));

  // In local development or on macOS, os.freemem() excludes OS buffer cache and is always low.
  // In dev / macOS, alert only if the Node.js process itself exceeds 1.5 GB RSS.
  if (isDev || isMac) {
    if (rssMB > 1536) { // > 1.5 GB used by Node process
      const ip = req ? (req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress) : '127.0.0.1';
      await dispatchSecurityAlert({
        eventTitle: 'Node.js Process Memory Saturation',
        eventDescription: `Node.js server process is consuming an unusually high amount of memory (${rssMB} MB RSS), indicating a potential memory leak.`,
        ipAddress: ip,
        severity: 'WARNING',
        metadata: {
          'Process RSS': `${rssMB} MB`,
          'Heap Used': `${heapUsedMB} MB / ${heapTotalMB} MB`,
          'Environment': process.env.NODE_ENV || 'development'
        }
      });
    }
    return;
  }

  // In production (Linux VPS / Docker container)
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMemPercent = ((totalMem - freeMem) / totalMem) * 100;

  if (usedMemPercent > 92 && rssMB > 500) {
    const ip = req ? (req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress) : '127.0.0.1';
    
    await dispatchSecurityAlert({
      eventTitle: 'Production Server Memory Exceeded 90%',
      eventDescription: `Hardware resource monitor reports critical memory saturation on production host.`,
      ipAddress: ip,
      severity: 'CRITICAL',
      metadata: {
        'Memory Used': `${usedMemPercent.toFixed(1)}%`,
        'Total RAM': `${(totalMem / (1024 * 1024 * 1024)).toFixed(2)} GB`,
        'Free RAM': `${(freeMem / (1024 * 1024 * 1024)).toFixed(2)} GB`,
        'Process RSS': `${rssMB} MB`
      }
    });
  }
};
