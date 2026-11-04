// models/Invoice.js — Commercial & B2B Invoices for Rerendet Coffee Farm
import mongoose from 'mongoose';

const invoiceItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 }
});

const clientInfoSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  company: { type: String, default: '' },
  kraPin: { type: String, default: '' },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  country: { type: String, default: 'Kenya' }
});

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: false
    },
    client: clientInfoSchema,
    items: [invoiceItemSchema],

    // Financial breakdown
    subtotal: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, default: 16 }, // 16% VAT standard Kenya
    taxAmount: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'KES' },

    // Dates & Terms
    issueDate: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true },
    paymentTerms: {
      type: String,
      enum: ['due_on_receipt', 'net_7', 'net_15', 'net_30', 'net_60'],
      default: 'due_on_receipt'
    },

    // Status
    status: {
      type: String,
      enum: ['draft', 'pending', 'paid', 'overdue', 'cancelled'],
      default: 'pending',
      index: true
    },

    // Payment Info
    paymentMethod: {
      type: String,
      enum: ['MPESA', 'STRIPE', 'BANK_TRANSFER', 'CASH', 'OTHER'],
      default: 'MPESA'
    },
    paymentReference: { type: String, default: '' },
    paidAt: { type: Date, default: null },

    // Signature
    signatureImage: { type: String, default: '' },
    signatoryName: { type: String, default: 'Authorized Farm Signatory' },

    // Notes & Footer
    notes: { type: String, default: '' },
    paymentInstructions: {
      type: String,
      default: 'M-Pesa Till: 5412345 | Bank: Equity Bank Kenya, Acc: Rerendet Coffee Farm'
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Auto-check overdue status before saving
invoiceSchema.pre('save', function (next) {
  if (this.status === 'pending' && this.dueDate && new Date() > this.dueDate) {
    this.status = 'overdue';
  }
  next();
});

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;
