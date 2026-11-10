// models/PasswordRecovery.js — Enterprise Password Recovery Collection
import mongoose from 'mongoose';
import crypto from 'crypto';

const PasswordRecoverySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  method: {
    type: String,
    enum: ['OTP', 'LINK'],
    default: 'OTP',
    required: true
  },
  // HMAC-SHA256 hash of the 6-digit OTP code using dedicated server OTP secret, bound to (userId + challengeId)
  otpHash: {
    type: String,
    default: null,
    select: false
  },
  // SHA-256 hash of the cryptographically random single-use link token
  resetTokenHash: {
    type: String,
    default: null,
    select: false
  },
  status: {
    type: String,
    enum: ['PENDING', 'VERIFIED', 'CONSUMED', 'EXPIRED', 'REVOKED'],
    default: 'PENDING',
    index: true
  },
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 5
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  consumedAt: {
    type: Date,
    default: null
  },
  requestedFromIP: {
    type: String,
    default: ''
  },
  initiatedBy: {
    type: String,
    enum: ['CUSTOMER', 'ADMIN'],
    default: 'CUSTOMER'
  },
  initiatedByAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  operationalReason: {
    type: String,
    default: null
  },
  // Hash of short-lived restricted recovery authorization token (issued via HttpOnly cookie after successful OTP verification)
  recoveryAuthTokenHash: {
    type: String,
    default: null,
    select: false
  },
  recoveryAuthExpiresAt: {
    type: Date,
    default: null
  },
  resendCooldownUntil: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compound indexes for fast lookup and validation
PasswordRecoverySchema.index({ userId: 1, status: 1, expiresAt: 1 });
PasswordRecoverySchema.index({ email: 1, status: 1 });
PasswordRecoverySchema.index({ resetTokenHash: 1 });
PasswordRecoverySchema.index({ recoveryAuthTokenHash: 1 });

// TTL index to automatically prune historical recovery records after 14 days
// Application logic always explicitly validates expiresAt
PasswordRecoverySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 14 * 24 * 60 * 60 });

/**
 * Computes an HMAC-SHA256 hash for a 6-digit OTP bound to userId and challengeId
 */
PasswordRecoverySchema.statics.computeOtpHmac = function (otp, userId, challengeId) {
  const secret = process.env.OTP_HMAC_SECRET || process.env.JWT_SECRET || 'rerendet_enterprise_otp_secret_default_key_2026';
  return crypto.createHmac('sha256', secret).update(`${String(otp).trim()}:${userId}:${challengeId}`).digest('hex');
};

/**
 * Computes SHA-256 hash for link recovery tokens or recovery auth cookie tokens
 */
PasswordRecoverySchema.statics.hashToken = function (token) {
  if (!token) return null;
  return crypto.createHash('sha256').update(String(token).trim()).digest('hex');
};

const PasswordRecovery = mongoose.model('PasswordRecovery', PasswordRecoverySchema, 'password_recoveries');
export default PasswordRecovery;
