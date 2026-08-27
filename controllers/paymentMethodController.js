// controllers/paymentMethodController.js
import PaymentMethod from '../models/PaymentMethod.js';
import asyncHandler from 'express-async-handler';

// Helper to mask phone numbers (e.g. 254712345678 -> "•••• 5678")
const maskPhone = (phone) => {
  if (!phone) return '••••';
  const clean = phone.replace(/\D/g, '');
  return `•••• ${clean.slice(-4)}`;
};

// @desc    Get user's saved payment methods (masked only)
// @route   GET /api/payment-methods
// @access  Private
export const getMyPaymentMethods = asyncHandler(async (req, res) => {
  const methods = await PaymentMethod.find({ user: req.user._id, isActive: true })
    .select('type name phone card isDefault createdAt')
    .sort({ isDefault: -1, createdAt: -1 });

  // Map to clean masked view (never exposing raw details)
  const maskedList = methods.map(m => ({
    _id: m._id,
    type: m.type,
    name: m.name,
    isDefault: m.isDefault,
    maskedPhone: m.type === 'mpesa' ? maskPhone(m.phone) : null,
    card: m.type === 'card' && m.card ? {
      last4: m.card.last4,
      brand: m.card.brand || 'Card',
      expiryMonth: m.card.expiryMonth,
      expiryYear: m.card.expiryYear
    } : null,
    createdAt: m.createdAt
  }));

  res.json({
    success: true,
    data: maskedList
  });
});

// @desc    Add a saved payment method (M-Pesa or tokenized card reference)
// @route   POST /api/payment-methods
// @access  Private
export const addPaymentMethod = asyncHandler(async (req, res) => {
  const { type, name, phone, card } = req.body;

  if (!type || !['mpesa', 'card'].includes(type)) {
    res.status(400);
    throw new Error('Payment method type must be mpesa or card');
  }

  if (type === 'mpesa' && !phone) {
    res.status(400);
    throw new Error('Phone number is required for M-Pesa');
  }

  if (type === 'card' && (!card || !card.last4)) {
    res.status(400);
    throw new Error('Valid tokenized card reference is required');
  }

  const count = await PaymentMethod.countDocuments({ user: req.user._id, isActive: true });
  const shouldBeDefault = count === 0;

  const paymentMethod = await PaymentMethod.create({
    user: req.user._id,
    type,
    name: name || (type === 'mpesa' ? `M-Pesa (${maskPhone(phone)})` : `${card?.brand || 'Card'} •••• ${card?.last4}`),
    phone: type === 'mpesa' ? phone : undefined,
    card: type === 'card' ? {
      last4: card.last4,
      brand: card.brand || 'Visa',
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear
    } : undefined,
    isDefault: shouldBeDefault,
    isActive: true
  });

  res.status(201).json({
    success: true,
    message: 'Payment method saved securely',
    data: {
      _id: paymentMethod._id,
      type: paymentMethod.type,
      name: paymentMethod.name,
      isDefault: paymentMethod.isDefault,
      maskedPhone: paymentMethod.type === 'mpesa' ? maskPhone(paymentMethod.phone) : null,
      card: paymentMethod.card
    }
  });
});

// @desc    Set payment method as default
// @route   PUT /api/payment-methods/:id/default
// @access  Private
export const setDefaultPaymentMethod = asyncHandler(async (req, res) => {
  const method = await PaymentMethod.findOne({ _id: req.params.id, user: req.user._id, isActive: true });

  if (!method) {
    res.status(404);
    throw new Error('Payment method not found');
  }

  method.isDefault = true;
  await method.save();

  res.json({
    success: true,
    message: 'Default payment method updated',
    data: method
  });
});

// @desc    Delete (deactivate) saved payment method
// @route   DELETE /api/payment-methods/:id
// @access  Private
export const deletePaymentMethod = asyncHandler(async (req, res) => {
  const method = await PaymentMethod.findOne({ _id: req.params.id, user: req.user._id });

  if (!method) {
    res.status(404);
    throw new Error('Payment method not found');
  }

  method.isActive = false;
  method.isDefault = false;
  await method.save();

  // If deleted method was default, set next available method as default
  const nextMethod = await PaymentMethod.findOne({ user: req.user._id, isActive: true });
  if (nextMethod) {
    nextMethod.isDefault = true;
    await nextMethod.save();
  }

  res.json({
    success: true,
    message: 'Payment method removed'
  });
});
