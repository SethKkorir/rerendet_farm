// models/CustomerSession.js - CUSTOMER DEVICE SESSION SCHEMA (GAP 5/FIX 3)
import mongoose from 'mongoose';

const CustomerSessionSchema = new mongoose.Schema({
  jti: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  deviceInfo: {
    type: String,
    required: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  isRevoked: {
    type: Boolean,
    default: false
  },
  revokedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  }
});

// Configure TTL index on expiresAt (auto-clears expired documents)
CustomerSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const CustomerSession = mongoose.model('CustomerSession', CustomerSessionSchema);
export default CustomerSession;
