// controllers/airtelController.js
import axios from 'axios';
import crypto from 'crypto';
import Payment from '../models/PaymentTransaction.js';
import Order from '../models/Order.js';
import asyncHandler from 'express-async-handler';

// Airtel Money Configuration
const AIRTEL_CONFIG = {
  clientId: process.env.AIRTEL_CLIENT_ID,
  clientSecret: process.env.AIRTEL_CLIENT_SECRET,
  merchantId: process.env.AIRTEL_MERCHANT_ID,
  country: process.env.AIRTEL_COUNTRY || 'KE',
  currency: process.env.AIRTEL_CURRENCY || 'KES',
  callbackURL: process.env.AIRTEL_CALLBACK_URL || `${process.env.BASE_URL}/api/payments/airtel-callback`,
  environment: process.env.AIRTEL_ENVIRONMENT || 'sandbox' // sandbox or production
};

// Generate Airtel Money access token
const generateAirtelAccessToken = async () => {
  try {
    const credentials = Buffer.from(`${AIRTEL_CONFIG.clientId}:${AIRTEL_CONFIG.clientSecret}`).toString('base64');
    
    const response = await axios.post(
      AIRTEL_CONFIG.environment === 'production'
        ? 'https://openapi.airtel.africa/auth/oauth2/token'
        : 'https://openapiuat.airtel.africa/auth/oauth2/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${credentials}`
        }
      }
    );

    return response.data.access_token;
  } catch (error) {
    console.error('Airtel Access Token Error:', error.response?.data || error.message);
    throw new Error('Failed to generate Airtel Money access token');
  }
};

// @desc    Initiate Airtel Money payment
// @route   POST /api/payments/airtel/request
// @access  Private
const initiateAirtelPayment = asyncHandler(async (req, res) => {
  const { orderId, phoneNumber } = req.body;
  
  if (!phoneNumber) {
    res.status(400);
    throw new Error('Phone number is required');
  }

  // Format phone number
  const formattedPhone = formatAirtelPhoneNumber(phoneNumber);
  
  // Get order details
  const order = await Order.findById(orderId).populate('user', 'firstName lastName');
  
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (order.user._id.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to pay for this order');
  }

  if (order.isPaid) {
    res.status(400);
    throw new Error('Order is already paid');
  }

  // Generate transaction reference
  const transactionRef = `RCD${order.orderNumber}${Date.now().toString().slice(-6)}`;

  try {
    const accessToken = await generateAirtelAccessToken();

    const paymentData = {
      reference: transactionRef,
      subscriber: {
        country: AIRTEL_CONFIG.country,
        currency: AIRTEL_CONFIG.currency,
        msisdn: formattedPhone
      },
      transaction: {
        amount: order.totalPrice,
        country: AIRTEL_CONFIG.country,
        currency: AIRTEL_CONFIG.currency,
        id: transactionRef
      }
    };

    const response = await axios.post(
      AIRTEL_CONFIG.environment === 'production'
        ? 'https://openapi.airtel.africa/merchant/v1/payments/'
        : 'https://openapiuat.airtel.africa/merchant/v1/payments/',
      paymentData,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Country': AIRTEL_CONFIG.country,
          'X-Currency': AIRTEL_CONFIG.currency,
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    // Create payment record
    const payment = await Payment.create({
      order: orderId,
      user: req.user._id,
      paymentMethod: 'airtel_money',
      amount: order.totalPrice,
      status: 'pending',
      airtelPhoneNumber: formattedPhone,
      airtelReference: transactionRef,
      airtelTransactionId: response.data.data.transaction.id
    });

    res.json({
      success: true,
      message: 'Airtel Money payment initiated successfully',
      data: {
        transactionId: response.data.data.transaction.id,
        status: response.data.data.transaction.status,
        paymentId: payment._id,
        message: 'Check your phone to complete the payment'
      }
    });

  } catch (error) {
    console.error('Airtel Payment Error:', error.response?.data || error.message);
    
    // Create failed payment record
    await Payment.create({
      order: orderId,
      user: req.user._id,
      paymentMethod: 'airtel_money',
      amount: order.totalPrice,
      status: 'failed',
      airtelPhoneNumber: formattedPhone,
      failureReason: error.response?.data?.error?.message || 'Airtel Money payment initiation failed'
    });

    res.status(500);
    throw new Error(error.response?.data?.error?.message || 'Failed to initiate Airtel Money payment');
  }
});

// @desc    Airtel Money payment callback
// @route   POST /api/payments/airtel-callback
// @access  Public (called by Airtel)
const airtelCallback = asyncHandler(async (req, res) => {
  const callbackData = req.body;

  console.log('Airtel Money Callback Received:', JSON.stringify(callbackData, null, 2));

  // Send immediate response to Airtel
  res.json({ status: 'SUCCESS' });

  // Process callback asynchronously
  processAirtelCallback(callbackData);
});

// Process Airtel callback
const processAirtelCallback = async (callbackData) => {
  try {
    const transaction = callbackData.transaction;
    
    if (transaction.status === 'TS') { // Transaction Success
      // Find payment by transaction ID
      const payment = await Payment.findOne({
        airtelTransactionId: transaction.id
      });

      if (payment) {
        payment.status = 'completed';
        payment.paymentDate = new Date();
        payment.callbackData = callbackData;
        await payment.save();

        // Update order status
        await Order.findByIdAndUpdate(payment.order, {
          isPaid: true,
          paidAt: new Date(),
          status: 'confirmed',
          paymentResult: {
            id: transaction.id,
            status: 'completed',
            update_time: new Date().toISOString(),
            phone_number: payment.airtelPhoneNumber
          }
        });

        console.log(`Airtel Money payment completed for order: ${payment.order}`);
      }
    } else if (transaction.status === 'TF') { // Transaction Failed
      const payment = await Payment.findOne({
        airtelTransactionId: transaction.id
      });

      if (payment) {
        payment.status = 'failed';
        payment.failureReason = transaction.message || 'Payment failed';
        payment.callbackData = callbackData;
        await payment.save();

        console.log(`Airtel Money payment failed for order: ${payment.order}`);
      }
    }
  } catch (error) {
    console.error('Error processing Airtel callback:', error);
  }
};

// @desc    Check Airtel payment status
// @route   GET /api/payments/airtel/status/:paymentId
// @access  Private
const checkAirtelPaymentStatus = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.paymentId)
    .populate('order')
    .populate('user', 'firstName lastName');

  if (!payment) {
    res.status(404);
    throw new Error('Payment not found');
  }

  if (payment.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
    res.status(403);
    throw new Error('Not authorized to view this payment');
  }

  // If payment is still pending, try to check with Airtel API
  if (payment.status === 'pending' && payment.airtelTransactionId) {
    try {
      const accessToken = await generateAirtelAccessToken();
      
      const response = await axios.get(
        AIRTEL_CONFIG.environment === 'production'
          ? `https://openapi.airtel.africa/standard/v1/payments/${payment.airtelTransactionId}`
          : `https://openapiuat.airtel.africa/standard/v1/payments/${payment.airtelTransactionId}`,
        {
          headers: {
            'X-Country': AIRTEL_CONFIG.country,
            'X-Currency': AIRTEL_CONFIG.currency,
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      if (response.data.data.status === 'TS') {
        payment.status = 'completed';
        await payment.save();
      } else if (response.data.data.status === 'TF') {
        payment.status = 'failed';
        payment.failureReason = response.data.data.message;
        await payment.save();
      }
    } catch (error) {
      console.error('Error checking Airtel payment status:', error);
    }
  }

  res.json({
    success: true,
    data: payment
  });
});

// Helper function to format Airtel phone number
const formatAirtelPhoneNumber = (phone) => {
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  } else if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith('254') === false) {
    cleaned = '254' + cleaned;
  }
  
  return cleaned;
};

export {
  initiateAirtelPayment,
  airtelCallback,
  checkAirtelPaymentStatus
};