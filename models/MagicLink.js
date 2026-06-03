// models/MagicLink.js
import mongoose from 'mongoose';

const MagicLinkSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    index: true
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  consumedAt: {
    type: Date
  },
  requestFingerprint: {
    type: String,
    required: true
  },
  fingerprintMismatch: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const MagicLink = mongoose.model('MagicLink', MagicLinkSchema);
export default MagicLink;
