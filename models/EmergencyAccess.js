// models/EmergencyAccess.js
import mongoose from 'mongoose';

const emergencyAccessSchema = new mongoose.Schema({
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  adminName: {
    type: String,
    default: 'SuperAdmin'
  },
  recipientEmail: {
    type: String,
    required: true,
    index: true,
    trim: true,
    lowercase: true
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'USED', 'EXPIRED', 'REVOKED'],
    default: 'ACTIVE',
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  usedAt: {
    type: Date,
    default: null
  },
  revokedAt: {
    type: Date,
    default: null
  },
  actionPerformed: {
    type: String,
    enum: ['enable', 'disable', 'none'],
    default: 'none'
  },
  emailDeliveryStatus: {
    type: String,
    enum: ['SENT', 'FAILED', 'PENDING'],
    default: 'PENDING'
  },
  emailError: {
    type: String,
    default: null
  },
  requestMetadata: {
    generationIp: { type: String, default: '' },
    generationUserAgent: { type: String, default: '' },
    executionIp: { type: String, default: '' },
    executionUserAgent: { type: String, default: '' }
  }
}, {
  timestamps: true
});

// TTL index to automatically prune emergency access logs older than 90 days
emergencyAccessSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const EmergencyAccess = mongoose.model('EmergencyAccess', emergencyAccessSchema);
export default EmergencyAccess;
