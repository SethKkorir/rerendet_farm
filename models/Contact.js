// models/Contact.js
import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  ticketNumber: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    index: true
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

import { sanitizeString } from '../utils/inputSanitizer.js';

// Pre-save hook: Generate ticketNumber and sanitize user input
contactSchema.pre('save', function (next) {
  if (!this.ticketNumber) {
    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    this.ticketNumber = `TKT-${randomDigits}`;
  }
  if (this.name) this.name = sanitizeString(this.name);
  if (this.subject) this.subject = sanitizeString(this.subject);
  if (this.message) this.message = sanitizeString(this.message);
  if (this.adminResponse) this.adminResponse = sanitizeString(this.adminResponse);
  next();
});

// Virtual for formatted human-readable reference code
contactSchema.virtual('ticketReference').get(function () {
  return this.ticketNumber || `TKT-${this._id ? this._id.toString().slice(-6).toUpperCase() : 'REF'}`;
});

// Index for better query performance
contactSchema.index({ status: 1, createdAt: -1 });
contactSchema.index({ email: 1 });

const Contact = mongoose.model('Contact', contactSchema);

export default Contact;