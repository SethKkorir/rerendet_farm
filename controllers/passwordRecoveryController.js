// controllers/passwordRecoveryController.js — Enterprise Password Recovery Service
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import PasswordRecovery from '../models/PasswordRecovery.js';
import CustomerSession from '../models/CustomerSession.js';
import Settings from '../models/Settings.js';
import sendEmail from '../utils/sendEmail.js';
import { getResetPasswordEmail, getSecurityAlertEmail } from '../utils/emailTemplates.js';
import { validatePasswordSecurely, checkPasswordHistory } from '../utils/passwordValidator.js';
import { checkForgotPasswordLimits, checkResendLimits } from '../services/recoveryRateLimiter.js';
import { 
  getClientIp, 
  setRecoveryChallengeCookie, 
  clearRecoveryChallengeCookie, 
  setRecoveryAuthCookie, 
  clearRecoveryAuthCookie 
} from '../utils/generateToken.js';
import { logActivity } from '../utils/activityLogger.js';

const resolveFrontendUrl = () => {
  const url = process.env.FRONTEND_URL;
  if (url && !url.includes('localhost') && !url.includes('127.0.0.1')) {
    return url;
  }
  return (process.env.NODE_ENV === 'production' || process.env.VERCEL) ? 'https://rerendet-farm.vercel.app' : 'http://localhost:5173';
};

const maskEmail = (email) => {
  if (!email || !email.includes('@')) return email;
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0]}*@${domain}`;
  return `${user.slice(0, 2)}${'•'.repeat(Math.max(3, user.length - 3))}${user.slice(-1)}@${domain}`;
};

/**
 * @desc    Initiate Password Recovery (Forgot Password)
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const ip = getClientIp(req);

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, message: 'Valid email address is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Rate Limiting Check
    const rateLimitCheck = await checkForgotPasswordLimits(normalizedEmail, ip);
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({ success: false, message: rateLimitCheck.message });
    }

    // 2. Query User
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    // 3. Anti-Enumeration Protection: Return generic success if account does not exist
    if (!user) {
      console.log(`🔒 [Anti-Enumeration] Password recovery requested for non-existent email: ${normalizedEmail}`);
      return res.json({
        success: true,
        message: 'If an account exists with that email, a password reset message has been sent.',
        data: {
          resendCooldownSeconds: 60
        }
      });
    }

    // 4. Invalidate any existing PENDING or VERIFIED challenges for this user
    await PasswordRecovery.updateMany(
      { userId: user._id, status: { $in: ['PENDING', 'VERIFIED'] } },
      { $set: { status: 'REVOKED' } }
    );

    // 5. Generate 6-digit numeric OTP and cryptographically secure single-use link token
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const rawLinkToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = PasswordRecovery.hashToken(rawLinkToken);

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    const resendCooldownUntil = new Date(Date.now() + 60 * 1000); // 60 seconds

    // 6. Create persistent challenge record
    const challenge = new PasswordRecovery({
      userId: user._id,
      email: user.email,
      method: 'OTP',
      resetTokenHash,
      status: 'PENDING',
      attempts: 0,
      maxAttempts: 5,
      expiresAt,
      resendCooldownUntil,
      requestedFromIP: ip,
      initiatedBy: 'CUSTOMER'
    });

    // HMAC hash the OTP bound to (userId + challengeId)
    challenge.otpHash = PasswordRecovery.computeOtpHmac(rawOtp, user._id, challenge._id);
    await challenge.save();

    // 7. Set recovery challenge tracking cookie (HttpOnly, Secure, 15m) to survive browser refresh
    setRecoveryChallengeCookie(res, challenge._id);

    // 8. Prepare email with reset code and 1-click link
    const frontendUrl = resolveFrontendUrl();
    const resetUrl = `${frontendUrl}/reset-password?token=${rawLinkToken}&id=${challenge._id}&email=${encodeURIComponent(user.email)}`;

    let logoUrl;
    try {
      const settings = await Settings.getSettings();
      logoUrl = settings?.store?.logo;
    } catch (e) {}

    const emailHtml = getResetPasswordEmail(user.firstName || 'Valued Customer', rawOtp, logoUrl, resetUrl);
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request - Rerendet Coffee',
      html: emailHtml
    });

    console.log(`📧 [Recovery] Password recovery OTP dispatched for ${user.email} (Challenge ID: ${challenge._id})`);

    return res.json({
      success: true,
      message: 'If an account exists with that email, a password reset message has been sent.',
      data: {
        recoveryId: challenge._id,
        expiresAt: challenge.expiresAt,
        resendCooldownSeconds: 60,
        maskedEmail: maskEmail(user.email)
      }
    });

  } catch (err) {
    console.error('❌ Forgot password error:', err);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred while processing recovery.' });
  }
};

/**
 * @desc    Resend Password Recovery Code (OTP)
 * @route   POST /api/auth/resend-reset-code
 * @access  Public
 */
export const resendResetCode = async (req, res) => {
  try {
    const { email } = req.body;
    const ip = getClientIp(req);

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Resend Quota Limits
    const limitCheck = await checkResendLimits(normalizedEmail);
    if (!limitCheck.allowed) {
      return res.status(429).json({ success: false, message: limitCheck.message });
    }

    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists with that email, a fresh recovery code has been sent.',
        data: { resendCooldownSeconds: 60 }
      });
    }

    // 2. Cooldown check on recent pending challenge
    const recentChallenge = await PasswordRecovery.findOne({
      userId: user._id,
      status: 'PENDING',
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    if (recentChallenge && recentChallenge.resendCooldownUntil && recentChallenge.resendCooldownUntil > new Date()) {
      const waitSeconds = Math.max(1, Math.ceil((recentChallenge.resendCooldownUntil.getTime() - Date.now()) / 1000));
      return res.status(429).json({
        success: false,
        message: `Please wait ${waitSeconds}s before requesting a new recovery code.`,
        data: { resendCooldownSeconds: waitSeconds }
      });
    }

    // 3. Invalidate previous challenges
    await PasswordRecovery.updateMany(
      { userId: user._id, status: { $in: ['PENDING', 'VERIFIED'] } },
      { $set: { status: 'EXPIRED' } }
    );

    // 4. Generate fresh 6-digit OTP and recovery token
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const rawLinkToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = PasswordRecovery.hashToken(rawLinkToken);

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const resendCooldownUntil = new Date(Date.now() + 60 * 1000);

    const challenge = new PasswordRecovery({
      userId: user._id,
      email: user.email,
      method: 'OTP',
      resetTokenHash,
      status: 'PENDING',
      attempts: 0,
      maxAttempts: 5,
      expiresAt,
      resendCooldownUntil,
      requestedFromIP: ip,
      initiatedBy: 'CUSTOMER'
    });

    challenge.otpHash = PasswordRecovery.computeOtpHmac(rawOtp, user._id, challenge._id);
    await challenge.save();

    setRecoveryChallengeCookie(res, challenge._id);

    const frontendUrl = resolveFrontendUrl();
    const resetUrl = `${frontendUrl}/reset-password?token=${rawLinkToken}&id=${challenge._id}&email=${encodeURIComponent(user.email)}`;

    let logoUrl;
    try {
      const settings = await Settings.getSettings();
      logoUrl = settings?.store?.logo;
    } catch (e) {}

    const emailHtml = getResetPasswordEmail(user.firstName || 'Valued Customer', rawOtp, logoUrl, resetUrl);
    await sendEmail({
      to: user.email,
      subject: 'New Password Reset Code - Rerendet Coffee',
      html: emailHtml
    });

    return res.json({
      success: true,
      message: 'A fresh verification code has been sent to your email.',
      data: {
        recoveryId: challenge._id,
        expiresAt: challenge.expiresAt,
        resendCooldownSeconds: 60,
        maskedEmail: maskEmail(user.email)
      }
    });

  } catch (err) {
    console.error('❌ Resend reset code error:', err);
    return res.status(500).json({ success: false, message: 'Failed to resend recovery code.' });
  }
};

/**
 * @desc    Verify Recovery Code (OTP) or Link Token
 * @route   POST /api/auth/verify-reset-code
 * @access  Public
 */
export const verifyResetCode = async (req, res) => {
  try {
    const { email, code, token, recoveryId } = req.body;
    const challengeCookieId = req.cookies?.recovery_challenge;

    // ── Case A: Link Token Verification ──
    if (token) {
      const tokenHash = PasswordRecovery.hashToken(token);
      const challenge = await PasswordRecovery.findOne({
        resetTokenHash: tokenHash,
        status: { $in: ['PENDING', 'VERIFIED'] }
      }).populate('userId');

      if (!challenge || challenge.expiresAt < new Date()) {
        if (challenge) {
          challenge.status = 'EXPIRED';
          await challenge.save();
        }
        return res.status(400).json({ success: false, message: 'This password reset link has expired or is invalid.' });
      }

      // Mark challenge verified and issue short-lived recovery auth cookie
      const rawAuthToken = crypto.randomBytes(32).toString('hex');
      challenge.recoveryAuthTokenHash = PasswordRecovery.hashToken(rawAuthToken);
      challenge.status = 'VERIFIED';
      challenge.verifiedAt = new Date();
      challenge.recoveryAuthExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await challenge.save();

      setRecoveryAuthCookie(res, challenge._id, rawAuthToken);

      return res.json({
        success: true,
        message: 'Recovery link verified successfully. You can now set a new password.',
        data: {
          recoveryStatus: 'OTP_VERIFIED',
          recoveryId: challenge._id,
          email: challenge.email
        }
      });
    }

    // ── Case B: 6-Digit OTP Verification ──
    if (!code) {
      return res.status(400).json({ success: false, message: 'Verification code is required.' });
    }

    const cleanCode = String(code).trim();
    const targetRecoveryId = recoveryId || challengeCookieId;

    let challenge = null;

    if (targetRecoveryId) {
      challenge = await PasswordRecovery.findById(targetRecoveryId).select('+otpHash');
    }

    if (!challenge && email) {
      const normalizedEmail = email.trim().toLowerCase();
      challenge = await PasswordRecovery.findOne({
        email: normalizedEmail,
        status: 'PENDING'
      }).sort({ createdAt: -1 }).select('+otpHash');
    }

    if (!challenge) {
      return res.status(400).json({ success: false, message: 'No active password recovery session found. Please request a new code.' });
    }

    // Check expiration
    if (challenge.expiresAt < new Date()) {
      challenge.status = 'EXPIRED';
      await challenge.save();
      return res.status(400).json({ success: false, message: 'This recovery code has expired. Please request a new one.' });
    }

    // Check attempt lockout
    if (challenge.attempts >= challenge.maxAttempts || challenge.status === 'EXPIRED') {
      challenge.status = 'EXPIRED';
      await challenge.save();
      return res.status(400).json({
        success: false,
        message: 'Maximum verification attempts exceeded (5/5). This code has been invalidated for security. Please request a new code.'
      });
    }

    // Validate OTP using HMAC
    const computedHmac = PasswordRecovery.computeOtpHmac(cleanCode, challenge.userId, challenge._id);

    if (computedHmac !== challenge.otpHash) {
      challenge.attempts += 1;
      const remainingAttempts = Math.max(0, challenge.maxAttempts - challenge.attempts);

      if (challenge.attempts >= challenge.maxAttempts) {
        challenge.status = 'EXPIRED';
      }
      await challenge.save();

      return res.status(400).json({
        success: false,
        message: remainingAttempts > 0
          ? `Invalid verification code. ${remainingAttempts} attempt${remainingAttempts > 1 ? 's' : ''} remaining.`
          : 'Invalid verification code. Maximum attempts reached. Please request a new code.',
        data: { remainingAttempts }
      });
    }

    // SUCCESS: Mark VERIFIED and issue restricted recovery authorization token
    const rawAuthToken = crypto.randomBytes(32).toString('hex');
    challenge.recoveryAuthTokenHash = PasswordRecovery.hashToken(rawAuthToken);
    challenge.status = 'VERIFIED';
    challenge.verifiedAt = new Date();
    challenge.recoveryAuthExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    await challenge.save();

    // Set recovery authorization cookie (HttpOnly, Secure, restricted to recovery)
    setRecoveryAuthCookie(res, challenge._id, rawAuthToken);

    return res.json({
      success: true,
      message: 'Verification code confirmed. You can now set your new password.',
      data: {
        recoveryStatus: 'OTP_VERIFIED',
        recoveryId: challenge._id,
        email: challenge.email,
        expiresAt: challenge.recoveryAuthExpiresAt
      }
    });

  } catch (err) {
    console.error('❌ Verify reset code error:', err);
    return res.status(500).json({ success: false, message: 'Failed to verify recovery code.' });
  }
};

/**
 * @desc    Get Current Password Recovery Status (Survives Browser Refresh)
 * @route   GET /api/auth/reset-status
 * @access  Public
 */
export const getResetStatus = async (req, res) => {
  try {
    const authCookie = req.cookies?.recovery_auth_token;
    const challengeCookieId = req.cookies?.recovery_challenge;

    // 1. Check if user already successfully verified OTP and has valid recovery authorization
    if (authCookie && authCookie.includes(':')) {
      const [recoveryId, rawToken] = authCookie.split(':');
      if (recoveryId && rawToken) {
        const challenge = await PasswordRecovery.findById(recoveryId).select('+recoveryAuthTokenHash');
        if (
          challenge &&
          challenge.status === 'VERIFIED' &&
          challenge.recoveryAuthExpiresAt &&
          challenge.recoveryAuthExpiresAt > new Date()
        ) {
          const expectedHash = PasswordRecovery.hashToken(rawToken);
          if (expectedHash === challenge.recoveryAuthTokenHash) {
            return res.json({
              success: true,
              recoveryStatus: 'OTP_VERIFIED',
              data: {
                recoveryId: challenge._id,
                email: maskEmail(challenge.email),
                expiresAt: challenge.recoveryAuthExpiresAt
              }
            });
          }
        }
      }
    }

    // 2. Check if user has an active PENDING challenge
    if (challengeCookieId) {
      const challenge = await PasswordRecovery.findById(challengeCookieId);
      if (challenge) {
        if (challenge.status === 'PENDING' && challenge.expiresAt > new Date()) {
          const resendCooldownSeconds = challenge.resendCooldownUntil
            ? Math.max(0, Math.ceil((challenge.resendCooldownUntil.getTime() - Date.now()) / 1000))
            : 0;

          return res.json({
            success: true,
            recoveryStatus: 'OTP_PENDING',
            data: {
              recoveryId: challenge._id,
              email: maskEmail(challenge.email),
              expiresAt: challenge.expiresAt,
              resendCooldownSeconds
            }
          });
        }

        if (challenge.status === 'CONSUMED') {
          return res.json({
            success: true,
            recoveryStatus: 'RECOVERY_COMPLETED',
            message: 'Password reset has already been completed.'
          });
        }

        if (challenge.status === 'EXPIRED' || challenge.expiresAt <= new Date()) {
          return res.json({
            success: true,
            recoveryStatus: 'RECOVERY_EXPIRED',
            message: 'Your recovery session has expired. Please request a new code.'
          });
        }
      }
    }

    // 3. No active recovery
    return res.json({
      success: true,
      recoveryStatus: 'NO_RECOVERY'
    });

  } catch (err) {
    console.error('❌ Get reset status error:', err);
    return res.json({ success: true, recoveryStatus: 'NO_RECOVERY' });
  }
};

/**
 * @desc    Complete Password Reset with New Password
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword, recoveryId, token, code } = req.body;
    const authCookie = req.cookies?.recovery_auth_token;
    const challengeCookieId = req.cookies?.recovery_challenge;

    if (!newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({ success: false, message: 'New password is required.' });
    }

    let challenge = null;

    // ── Method 1: Verified via HttpOnly recovery_auth_token cookie ──
    if (authCookie && authCookie.includes(':')) {
      const [recId, rawToken] = authCookie.split(':');
      const candidate = await PasswordRecovery.findById(recId).select('+recoveryAuthTokenHash');
      if (
        candidate &&
        candidate.status === 'VERIFIED' &&
        candidate.recoveryAuthExpiresAt &&
        candidate.recoveryAuthExpiresAt > new Date()
      ) {
        if (PasswordRecovery.hashToken(rawToken) === candidate.recoveryAuthTokenHash) {
          challenge = candidate;
        }
      }
    }

    // ── Method 2: Verified via direct recoveryId if verified in current flow ──
    if (!challenge && recoveryId) {
      const candidate = await PasswordRecovery.findById(recoveryId).select('+recoveryAuthTokenHash');
      if (candidate && candidate.status === 'VERIFIED' && candidate.recoveryAuthExpiresAt > new Date()) {
        challenge = candidate;
      }
    }

    // ── Method 3: Direct Link Token ──
    if (!challenge && token) {
      const tokenHash = PasswordRecovery.hashToken(token);
      const candidate = await PasswordRecovery.findOne({
        resetTokenHash: tokenHash,
        status: { $in: ['PENDING', 'VERIFIED'] },
        expiresAt: { $gt: new Date() }
      });
      if (candidate) {
        challenge = candidate;
      }
    }

    // ── Method 4: Direct OTP in payload (Backward compatibility fallback) ──
    if (!challenge && code && (email || challengeCookieId)) {
      const targetId = recoveryId || challengeCookieId;
      let candidate = targetId ? await PasswordRecovery.findById(targetId).select('+otpHash') : null;
      if (!candidate && email) {
        candidate = await PasswordRecovery.findOne({
          email: email.trim().toLowerCase(),
          status: 'PENDING',
          expiresAt: { $gt: new Date() }
        }).sort({ createdAt: -1 }).select('+otpHash');
      }

      if (candidate && candidate.attempts < candidate.maxAttempts) {
        const computed = PasswordRecovery.computeOtpHmac(code, candidate.userId, candidate._id);
        if (computed === candidate.otpHash) {
          challenge = candidate;
        }
      }
    }

    if (!challenge) {
      return res.status(400).json({
        success: false,
        message: 'Invalid, unverified, or expired recovery session. Please verify your OTP code again.'
      });
    }

    // 1. Fetch User with security & history fields
    const user = await User.findById(challenge.userId).select('+password +passwordHistory +loginAttempts +lockUntil');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    // 2. Validate Password Strength & Breaches (zxcvbn + HIBP)
    const validation = await validatePasswordSecurely(newPassword, user.email);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, message: validation.feedback });
    }

    // 3. Password History Check (Prevent reuse of previous 5 passwords)
    const historyCheck = await checkPasswordHistory(newPassword, user.password, user.passwordHistory);
    if (historyCheck.isReused) {
      return res.status(400).json({ success: false, message: historyCheck.message });
    }

    // 4. Hash new password with bcrypt salt cost 14
    const salt = await bcrypt.genSalt(14);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // 5. Update user password history (keep maximum 5 historical hashes)
    const updatedHistory = [...(user.passwordHistory || [])];
    if (user.password) {
      updatedHistory.push({ hash: user.password, changedAt: new Date() });
    }
    const trimmedHistory = updatedHistory.slice(-5);

    // 6. Atomic User Update: apply new password, bump tokenVersion, unlock account
    await User.findByIdAndUpdate(user._id, {
      $set: {
        password: hashedPassword,
        passwordHistory: trimmedHistory,
        passwordChangedAt: new Date(),
        allowPasswordChangeOverride: false,
        passwordOverrideExpiresAt: null,
        passwordOverrideReason: null,
        loginAttempts: 0
      },
      $unset: { lockUntil: 1 },
      $inc: { tokenVersion: 1 }
    });

    // 7. Revoke all active customer device sessions
    await CustomerSession.updateMany(
      { userId: user._id, isRevoked: false },
      { $set: { isRevoked: true, revokedAt: new Date() } }
    );

    // 8. Atomically consume the recovery challenge
    challenge.status = 'CONSUMED';
    challenge.consumedAt = new Date();
    await challenge.save();

    // Invalidate any other remaining challenges for this user
    await PasswordRecovery.updateMany(
      { userId: user._id, _id: { $ne: challenge._id }, status: { $in: ['PENDING', 'VERIFIED'] } },
      { $set: { status: 'REVOKED' } }
    );

    // 9. Clear recovery cookies
    clearRecoveryAuthCookie(res);
    clearRecoveryChallengeCookie(res);

    // 10. Log Activity
    await logActivity(
      req,
      'PASSWORD_RESET',
      `Password successfully reset via recovery ${challenge.method} for ${user.email}`,
      user._id,
      { method: challenge.method, recoveryId: challenge._id }
    );

    // 11. Dispatch Security Notification Email
    try {
      let logoUrl;
      try {
        const settings = await Settings.getSettings();
        logoUrl = settings?.store?.logo;
      } catch (e) {}

      await sendEmail({
        to: user.email,
        subject: 'Security Alert: Password Reset Completed',
        html: getSecurityAlertEmail(
          user.firstName || 'Valued Customer',
          'Password Reset via Recovery Verification. All previous active sessions across all devices have been signed out.',
          logoUrl
        )
      });
    } catch (e) {
      console.error('Failed to send password reset confirmation email:', e.message);
    }

    return res.json({
      success: true,
      message: 'Your password has been reset successfully. Please sign in with your new password.',
      recoveryStatus: 'RECOVERY_COMPLETED'
    });

  } catch (err) {
    console.error('❌ Reset password error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to reset password.' });
  }
};
