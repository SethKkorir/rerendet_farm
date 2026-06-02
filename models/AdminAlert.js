// models/AdminAlert.js - NEW MONGOOSE MODEL FOR INTENTIONAL TIERED NOTIFICATIONS
import mongoose from 'mongoose';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import User from './User.js';

const adminAlertSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['critical', 'warning', 'info'],
    required: true
  },
  category: {
    type: String,
    enum: [
      'failed_payment',
      'dlq_item',
      'killswitch_event',
      'sla_breach',
      'low_stock',
      'unresolved_note',
      'new_order',
      'new_user'
    ],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: false
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: false
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  resolvedAt: {
    type: Date,
    required: false
  },
  isResolved: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

adminAlertSchema.index({ isResolved: 1, type: 1 });
adminAlertSchema.index({ createdAt: -1 });

// Initialize BullMQ Queue if REDIS_URL is configured
let emailQueue = null;
try {
  if (process.env.REDIS_URL || process.env.REDIS_HOST) {
    const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
      maxRetriesPerRequest: null
    });
    emailQueue = new Queue('emailQueue', { connection });
  }
} catch (err) {
  console.error('⚠️ Could not initialize emailQueue inside AdminAlert model:', err.message);
}

// Utility to create an alert and dispatch critical emails
export const createAlert = async (type, category, message, metadata = {}) => {
  try {
    const alertData = {
      type,
      category,
      message,
      orderId: metadata.orderId || null,
      productId: metadata.productId || null
    };

    const alert = await mongoose.model('AdminAlert').create(alertData);

    // Email dispatch trigger for CRITICAL alerts
    if (type === 'critical' && emailQueue) {
      // Find all active un-suspended admins and super-admins
      const admins = await User.find({
        role: { $in: ['admin', 'super-admin', 'super_admin', 'owner'] },
        isActive: true,
        isSuspended: false
      }).select('email firstName');

      for (const adminUser of admins) {
        await emailQueue.add('sendEmail', {
          to: adminUser.email,
          subject: `🚨 [CRITICAL ALERT] Rerendet Farm System Notice`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ff4444; border-radius: 8px;">
              <h2 style="color: #ff4444; margin-top: 0;">🚨 Critical Operational Incident</h2>
              <p>Hello ${adminUser.firstName},</p>
              <p>A critical issue was logged in the administrative lifecycle center:</p>
              <div style="background: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; margin: 15px 0; border: 1px solid #f5c6cb;">
                <strong>Category:</strong> ${category}<br/>
                <strong>Message:</strong> ${message}
              </div>
              <p>Please log in to the command dashboard immediately to view, manage, and resolve this alert.</p>
              <hr style="border: 0; border-top: 1px solid #ddd; margin: 20px 0;"/>
              <p style="font-size: 11px; color: #888;">This is an automated system notification from the Rerendet Farm Security Center.</p>
            </div>
          `
        });
      }
    }

    return alert;
  } catch (error) {
    console.error('❌ Failed to write AdminAlert:', error);
  }
};

const AdminAlert = mongoose.model('AdminAlert', adminAlertSchema);
export default AdminAlert;
