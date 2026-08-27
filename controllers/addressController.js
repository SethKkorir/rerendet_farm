// controllers/addressController.js
import Address from '../models/Address.js';
import Subscription from '../models/Subscription.js';
import asyncHandler from 'express-async-handler';

// @desc    Get user's saved addresses
// @route   GET /api/addresses
// @access  Private
export const getMyAddresses = asyncHandler(async (req, res) => {
  const addresses = await Address.find({ user: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
  res.json({
    success: true,
    data: addresses
  });
});

// @desc    Create a new saved address
// @route   POST /api/addresses
// @access  Private
export const createAddress = asyncHandler(async (req, res) => {
  const { type = 'home', name, street, city, postalCode, country = 'Kenya', isDefault = false, instructions } = req.body;

  if (!name || !street || !city) {
    res.status(400);
    throw new Error('Name, street address, and city/county are required');
  }

  // If this is user's first address, make it default automatically
  const count = await Address.countDocuments({ user: req.user._id });
  const shouldBeDefault = count === 0 ? true : isDefault;

  const address = await Address.create({
    user: req.user._id,
    type,
    name,
    street,
    city,
    postalCode: postalCode || '00100',
    country,
    isDefault: shouldBeDefault,
    instructions
  });

  res.status(201).json({
    success: true,
    message: 'Address saved successfully',
    data: address
  });
});

// @desc    Update saved address
// @route   PUT /api/addresses/:id
// @access  Private
export const updateAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({ _id: req.params.id, user: req.user._id });

  if (!address) {
    res.status(404);
    throw new Error('Address not found');
  }

  const { type, name, street, city, postalCode, country, isDefault, instructions } = req.body;

  if (name !== undefined) address.name = name;
  if (type !== undefined) address.type = type;
  if (street !== undefined) address.street = street;
  if (city !== undefined) address.city = city;
  if (postalCode !== undefined) address.postalCode = postalCode;
  if (country !== undefined) address.country = country;
  if (isDefault !== undefined) address.isDefault = isDefault;
  if (instructions !== undefined) address.instructions = instructions;

  await address.save();

  res.json({
    success: true,
    message: 'Address updated successfully',
    data: address
  });
});

// @desc    Set address as default
// @route   PUT /api/addresses/:id/default
// @access  Private
export const setDefaultAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({ _id: req.params.id, user: req.user._id });

  if (!address) {
    res.status(404);
    throw new Error('Address not found');
  }

  address.isDefault = true;
  await address.save();

  res.json({
    success: true,
    message: 'Default delivery address updated',
    data: address
  });
});

// @desc    Delete saved address
// @route   DELETE /api/addresses/:id
// @access  Private
export const deleteAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({ _id: req.params.id, user: req.user._id });

  if (!address) {
    res.status(404);
    throw new Error('Address not found');
  }

  // Safety check: Check if linked to an active subscription
  const activeSubs = await Subscription.find({
    user: req.user._id,
    status: { $in: ['active', 'paused'] }
  });

  const matchingSub = activeSubs.find(sub => {
    return sub.shippingAddress?.address?.toLowerCase() === address.street?.toLowerCase() ||
           sub.shippingAddress?.street?.toLowerCase() === address.street?.toLowerCase();
  });

  if (matchingSub && !req.query.force) {
    return res.status(409).json({
      success: false,
      conflict: true,
      subscriptionId: matchingSub._id,
      message: 'This address is in use by an active coffee subscription. Please choose a replacement address first to avoid delivery interruptions.'
    });
  }

  await Address.deleteOne({ _id: address._id });

  // If deleted address was default, set next available address as default
  if (address.isDefault) {
    const nextAddress = await Address.findOne({ user: req.user._id });
    if (nextAddress) {
      nextAddress.isDefault = true;
      await nextAddress.save();
    }
  }

  res.json({
    success: true,
    message: 'Address deleted successfully'
  });
});
