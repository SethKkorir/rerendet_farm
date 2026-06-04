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

// Dispatch a premium formatted HTML email security alert to zsethkipchumba179@gmail.com
export const dispatchSecurityAlert = async ({
  eventTitle,
  eventDescription,
  ipAddress = 'N/A',
  userAccount = 'N/A',
  severity = 'WARNING', // INFO, WARNING, CRITICAL
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
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #0b0f19; color: #f8fafc;">
        <!-- Header -->
        <div style="background-color: #0f172a; padding: 30px; text-align: center; border-bottom: 2px solid ${severityColor};">
          <div style="display: inline-block; padding: 6px 12px; border-radius: 9999px; background-color: rgba(${severity === 'CRITICAL' ? '239, 68, 68' : '245, 158, 11'}, 0.15); color: ${severityColor}; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 12px; border: 1px solid ${severityColor};">
            ${severity} SECURITY EVENT
          </div>
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.025em;">${eventTitle}</h1>
          <p style="color: #94a3b8; font-size: 13px; margin: 6px 0 0 0;">Timestamp: ${timestamp}</p>
        </div>

        <!-- Body Content -->
        <div style="padding: 30px; background-color: #0b0f19;">
          <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
            ${eventDescription}
          </p>

          <!-- Metadata Box -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; background-color: #1e293b; border-radius: 8px; overflow: hidden;">
            <tr>
              <td style="padding: 14px 16px; border-bottom: 1px solid #334155; font-size: 14px; font-weight: bold; color: #94a3b8; width: 35%;">IP Address:</td>
              <td style="padding: 14px 16px; border-bottom: 1px solid #334155; font-size: 14px; color: #f8fafc; font-family: monospace;">${cleanIp}</td>
            </tr>
            <tr>
              <td style="padding: 14px 16px; border-bottom: 1px solid #334155; font-size: 14px; font-weight: bold; color: #94a3b8;">User Account:</td>
              <td style="padding: 14px 16px; border-bottom: 1px solid #334155; font-size: 14px; color: #f8fafc;">${userAccount}</td>
            </tr>
            ${Object.entries(metadata).map(([key, val]) => `
              <tr>
                <td style="padding: 14px 16px; border-bottom: 1px solid #334155; font-size: 14px; font-weight: bold; color: #94a3b8; text-transform: capitalize;">${key}:</td>
                <td style="padding: 14px 16px; border-bottom: 1px solid #334155; font-size: 14px; color: #f8fafc;">${val}</td>
              </tr>
            `).join('')}
          </table>

          <!-- Emergency Action Box -->
          <div style="border: 1px dashed ${severityColor}; background-color: rgba(${severity === 'CRITICAL' ? '239, 68, 68' : '245, 158, 11'}, 0.05); padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
            <h3 style="color: #ffffff; margin: 0 0 8px 0; font-size: 15px; font-weight: bold;">🚨 Emergency Threat Containment</h3>
            <p style="color: #94a3b8; font-size: 13px; margin: 0 0 20px 0; line-height: 1.5;">
              If this activity represents an active compromise, click below to lock down the website out-of-band using your pre-generated magic link.
            </p>
            <a href="${emergencyLink}" style="background-color: ${severityColor}; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 24px; border-radius: 6px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);">
              Toggle Emergency Lockout
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #0f172a; padding: 20px; text-align: center; border-top: 1px solid #1e293b; font-size: 12px; color: #64748b;">
          <p style="margin: 0;">This email was dispatched automatically by Rerendet Coffee Security Shield.</p>
          <p style="margin: 4px 0 0 0;">Do not share this link. It expires in 7 days and rotates automatically.</p>
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

// Check system resources (memory usage) and alert if exceeding 90%
export const checkHardwareResources = async (req = null) => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMemPercent = ((totalMem - freeMem) / totalMem) * 100;

  if (usedMemPercent > 90) {
    const ip = req ? (req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress) : '127.0.0.1';
    
    await dispatchSecurityAlert({
      eventTitle: 'System Memory Exceeded 90%',
      eventDescription: `Hardware resource monitor reports critical memory saturation. The server process is consuming over 90% of available RAM, risking an Out-Of-Memory (OOM) crash.`,
      ipAddress: ip,
      severity: 'CRITICAL',
      metadata: {
        'Memory Used': `${usedMemPercent.toFixed(1)}%`,
        'Total RAM': `${(totalMem / (1024 * 1024 * 1024)).toFixed(2)} GB`,
        'Free RAM': `${(freeMem / (1024 * 1024 * 1024)).toFixed(2)} GB`
      }
    });
  }
};
