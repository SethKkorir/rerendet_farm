// models/Contact.js
import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  orderNumber: {
    type: String,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true
  },
  status: {
    type: String,
    enum: ['new', 'pending', 'in_progress', 'replied', 'resolved', 'closed'],
    default: 'new'
  },
  adminResponse: {
    type: String,
    trim: true
  },
  respondedAt: {
    type: Date
  },
  linkedOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  linkedOrderSnapshot: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  slaDeadline: {
    type: Date
  },
  slaBreached: {
    type: Boolean,
    default: false
  },
  firstAdminReplyAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

import { sanitizeString } from '../utils/inputSanitizer.js';

// Pre-save hook: Sanitize user input to prevent stored XSS in admin dashboard
contactSchema.pre('save', function (next) {
  if (this.name) this.name = sanitizeString(this.name);
  if (this.subject) this.subject = sanitizeString(this.subject);
  if (this.message) this.message = sanitizeString(this.message);
  if (this.adminResponse) this.adminResponse = sanitizeString(this.adminResponse);
  next();
});

// Index for better query performance
contactSchema.index({ status: 1, createdAt: -1 });
contactSchema.index({ email: 1 });

const Contact = mongoose.model('Contact', contactSchema);

export default Contact;