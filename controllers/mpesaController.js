// controllers/mpesaController.js
import axios from 'axios';
import crypto from 'crypto';
import Payment from '../models/PaymentTransaction.js';
import Order from '../models/Order.js';
import asyncHandler from 'express-async-handler';

// M-Pesa Configuration
const MPESA_CONFIG = {
  consumerKey: process.env.MPESA_CONSUMER_KEY,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET,
  shortCode: process.env.MPESA_SHORTCODE,
  passkey: process.env.MPESA_PASSKEY,
  callbackURL: process.env.MPESA_CALLBACK_URL || `${process.env.BASE_URL}/api/payments/mpesa-callback`,
  environment: process.env.MPESA_ENVIRONMENT || 'sandbox' // sandbox or production
};

// Generate M-Pesa access token
const generateMpesaAccessToken = async () => {
  try {
    const auth = Buffer.from(`${MPESA_CONFIG.consumerKey}:${MPESA_CONFIG.consumerSecret}`).toString('base64');

    const response = await axios.get(
      MPESA_CONFIG.environment === 'production'
        ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
        : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${auth}`
        }
      }
    );

    return response.data.access_token;
  } catch (error) {
    console.error('M-Pesa Access Token Error:', error.response?.data || error.message);
    throw new Error('Failed to generate M-Pesa access token');
  }
};

// Generate M-Pesa password
const generateMpesaPassword = () => {
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
  const password = Buffer.from(`${MPESA_CONFIG.shortCode}${MPESA_CONFIG.passkey}${timestamp}`).toString('base64');
  return { password, timestamp };
};

// @desc    Initiate M-Pesa STK Push
// @route   POST /api/payments/mpesa/stk-push
// @access  Private
const initiateMpesaPayment = asyncHandler(async (req, res) => {
  const { orderId, phoneNumber } = req.body;

  if (!phoneNumber) {
    res.status(400);
    throw new Error('Phone number is required');
  }

  // Format phone number (2547...)
  const formattedPhone = formatPhoneNumber(phoneNumber);

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
    const accessToken = await generateMpesaAccessToken();
    const { password, timestamp } = generateMpesaPassword();

    const stkPushData = {
      BusinessShortCode: MPESA_CONFIG.shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.max(1, Math.round(order.total || order.totalPrice || 1)),
      PartyA: formattedPhone,
      PartyB: MPESA_CONFIG.shortCode,
      PhoneNumber: formattedPhone,
      CallBackURL: MPESA_CONFIG.callbackURL,
      AccountReference: transactionRef,
      TransactionDesc: `Payment for order ${order.orderNumber}`
    };

    const response = await axios.post(
      MPESA_CONFIG.environment === 'production'
        ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
        : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      stkPushData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Create payment record
    const payment = await Payment.create({
      order: orderId,
      user: req.user._id,
      paymentMethod: 'mpesa',
      amount: order.total || order.totalPrice || 0,
      status: 'pending',
      mpesaPhoneNumber: formattedPhone,
      referenceNumber: transactionRef
    });

    res.json({
      success: true,
      message: 'M-Pesa payment initiated successfully',
      data: {
        checkoutRequestID: response.data.CheckoutRequestID,
        customerMessage: response.data.CustomerMessage,
        paymentId: payment._id
      }
    });

  } catch (error) {
    console.error('M-Pesa STK Push Error:', error.response?.data || error.message);

    // Create failed payment record
    await Payment.create({
      order: orderId,
      user: req.user._id,
      paymentMethod: 'mpesa',
      amount: order.total || order.totalPrice || 0,
      status: 'failed',
      mpesaPhoneNumber: formattedPhone,
      failureReason: error.response?.data?.errorMessage || 'M-Pesa payment initiation failed'
    });

    res.status(500);
    throw new Error(error.response?.data?.errorMessage || 'Failed to initiate M-Pesa payment');
  }
});

// @desc    M-Pesa payment callback
// @route   POST /api/payments/mpesa-callback
// @access  Public (called by M-Pesa)
const mpesaCallback = asyncHandler(async (req, res) => {
  const callbackData = req.body;

  // console.log('M-Pesa Callback Received:', JSON.stringify(callbackData, null, 2));

  // Send immediate response to M-Pesa
  res.json({
    ResultCode: 0,
    ResultDesc: 'Accepted'
  });

  // Process callback asynchronously
  processMpesaCallback(callbackData);
});

// Process M-Pesa callback
const processMpesaCallback = async (callbackData) => {
  try {
    const resultCode = callbackData.Body.stkCallback.ResultCode;
    const resultDesc = callbackData.Body.stkCallback.ResultDesc;
    const callbackMetadata = callbackData.Body.stkCallback.CallbackMetadata;
    const checkoutRequestID = callbackData.Body.stkCallback.CheckoutRequestID;

    if (resultCode === 0) {
      // Payment successful
      const metadataItems = callbackMetadata.Item;

      let amount, mpesaReceiptNumber, transactionDate, phoneNumber;

      metadataItems.forEach(item => {
        switch (item.Name) {
          case 'Amount':
            amount = item.Value;
            break;
          case 'MpesaReceiptNumber':
            mpesaReceiptNumber = item.Value;
            break;
          case 'TransactionDate':
            transactionDate = item.Value;
            break;
          case 'PhoneNumber':
            phoneNumber = item.Value;
            break;
        }
      });

      // Find payment by checkoutRequestID or other identifier
      const payment = await Payment.findOne({
        referenceNumber: callbackData.Body.stkCallback.MerchantRequestID
      });

      if (payment) {
        payment.status = 'completed';
        payment.mpesaTransactionId = checkoutRequestID;
        payment.mpesaReceiptNumber = mpesaReceiptNumber;
        payment.paymentDate = new Date(transactionDate);
        payment.callbackData = callbackData;
        await payment.save();

        // Update order status
        await Order.findByIdAndUpdate(payment.order, {
          isPaid: true,
          paidAt: new Date(),
          status: 'confirmed',
          paymentResult: {
            id: mpesaReceiptNumber,
            status: 'completed',
            update_time: new Date().toISOString(),
            phone_number: phoneNumber
          }
        });

        console.log(`M-Pesa payment completed for order: ${payment.order}`);
      }
    } else {
      // Payment failed
      const payment = await Payment.findOne({
        referenceNumber: callbackData.Body.stkCallback.MerchantRequestID
      });

      if (payment) {
        payment.status = 'failed';
        payment.failureReason = resultDesc;
        payment.callbackData = callbackData;
        await payment.save();

        console.log(`M-Pesa payment failed for order: ${payment.order}, Reason: ${resultDesc}`);
      }
    }
  } catch (error) {
    console.error('Error processing M-Pesa callback:', error);
  }
};

// @desc    Check M-Pesa payment status
// @route   GET /api/payments/mpesa/status/:paymentId
// @access  Private
const checkMpesaPaymentStatus = asyncHandler(async (req, res) => {
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

  res.json({
    success: true,
    data: payment
  });
});

// Helper function to format phone number
const formatPhoneNumber = (phone) => {
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
  initiateMpesaPayment,
  mpesaCallback,
  checkMpesaPaymentStatus
};