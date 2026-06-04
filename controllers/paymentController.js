import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';
import PaymentTransaction from '../models/PaymentTransaction.js';
import { initiateMpesaStkPushService, queryMpesaStkStatusService } from '../services/mpesaService.js';
import { createPayPalOrderService, capturePayPalOrderService } from '../services/paypalService.js';
import { convertKEStoUSD } from '../utils/currencyConverter.js';
import { sendOrderConfirmationEmailHelper } from '../utils/orderEmailSender.js';
import { recordPaymentFailure } from '../utils/securityAlerts.js';

// @desc    Initiate M-Pesa Express (STK Push)
// @route   POST /api/payments/mpesa/stk
// @access  Private
export const processMpesaPayment = asyncHandler(async (req, res) => {
  const { orderId, phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ success: false, message: 'Phone number is required for STK Push' });
  }

  console.log(`📱 Initiating M-Pesa STK Push for Order: ${orderId} to phone: ${phoneNumber}`);

  // 1. Find the order
  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  // 2. Prevent duplicate payment
  if (order.paymentStatus === 'paid') {
    return res.status(400).json({ success: false, message: 'Order is already paid' });
  }

  try {
    // 3. Request Daraja to send STK Push
    const result = await initiateMpesaStkPushService(phoneNumber, order.total, order.orderNumber);
    const checkoutRequestId = result.CheckoutRequestID;

    // 4. Update the order's transactionId to CheckoutRequestID (so webhook can link it!)
    order.transactionId = checkoutRequestId;
    order.orderEvents.push({
      status: 'PAYMENT_INITIATED',
      note: `M-Pesa STK Push triggered to ${phoneNumber}. CheckoutRequestID: ${checkoutRequestId}`,
      user: req.user?._id
    });
    await order.save();

    // 5. Create a PENDING transaction record
    await PaymentTransaction.create({
      order: order._id,
      provider: 'MPESA',
      transactionId: checkoutRequestId, // Indexed unique field
      amount: order.total,
      currency: 'KES',
      status: 'PENDING',
      rawResponse: result,
      metadata: { phoneNumber, merchantRequestId: result.MerchantRequestID }
    });

    console.log(`✅ STK Push initiated successfully: CheckoutID=${checkoutRequestId}`);
    res.json({
      success: true,
      message: 'STK Push sent successfully to your phone. Please enter your PIN.',
      checkoutRequestId,
      data: {
        paymentId: checkoutRequestId,
        checkoutRequestId
      }
    });

  } catch (error) {
    console.error('❌ M-Pesa payment initiation failed:', error.message);

    // Track failure in alert monitor
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userEmail = req.user ? req.user.email : 'Guest';
    recordPaymentFailure(ip, userEmail, 'M-Pesa Express', error.message).catch(e => console.error('Alert monitor fail:', e));

    // Queue a background retry (2-min delay) regardless of failure type
    let retryQueued = false;
    try {
      const { retryQueue } = await import('../queues/index.js');
      await retryQueue.add('stkRetry', {
        phoneNumber,
        amount: order.total,
        orderNumber: order.orderNumber,
        attempt: 1
      }, {
        delay: 2 * 60 * 1000 // 2 minutes
      });
      retryQueued = true;
      console.log(`📬 [M-Pesa Payment] Failed push enqueued to Retry Queue with 2-minute delay for Order #${order.orderNumber}`);
    } catch (retryErr) {
      console.error('❌ Failed to enqueue failed STK Push to retryQueue:', retryErr.message);
    }

    // ── Safaricom gateway busy (500.003.02) ──────────────────────────────
    // Their system is temporarily overloaded. We've already queued a retry,
    // so send 202 Accepted — the client should poll / show a "processing" state.
    if (error.isGatewayBusy) {
      console.warn(`⏳ [M-Pesa] Safaricom gateway busy (500.003.02) for Order #${order.orderNumber}. Retry queued.`);
      return res.status(202).json({
        success: false,
        retrying: true,
        message: 'The M-Pesa gateway is momentarily busy. We\'ve queued your payment and will retry automatically in 2 minutes. Please wait — you will receive the STK prompt shortly.',
        safaricomCode: error.safaricomCode,
        orderNumber: order.orderNumber
      });
    }

    // ── All other failures → 503 Service Unavailable ─────────────────────
    return res.status(503).json({
      success: false,
      retrying: retryQueued,
      message: retryQueued
        ? 'Payment could not be initiated. We\'ve queued a retry — please wait a few minutes and check your order status.'
        : (error.message || 'M-Pesa STK Push initiation failed')
    });
  }
});

// @desc    Query M-Pesa transaction status (polling or on-demand query)
// @route   GET /api/payments/mpesa/status/:checkoutRequestId
// @access  Private
export const checkMpesaPaymentStatus = asyncHandler(async (req, res) => {
  const { checkoutRequestId } = req.params;

  console.log(`🔍 Checking M-Pesa STK status for CheckoutRequestID: ${checkoutRequestId}`);

  // 1. Find the transaction
  let tx = await PaymentTransaction.findOne({ transactionId: checkoutRequestId, provider: 'MPESA' });
  if (!tx) {
    return res.status(404).json({ success: false, message: 'Payment transaction record not found' });
  }

  // 2. Find the order
  const order = await Order.findById(tx.order);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Associated order not found' });
  }

  // 3. JIT Self-Healing: If DB is still pending, pull status from Daraja in case webhook failed
  if (tx.status === 'PENDING') {
    const POLL_INTERVAL_MS = 15000;
    const timeSinceLastQuery = tx.lastQueriedAt ? (Date.now() - new Date(tx.lastQueriedAt).getTime()) : Infinity;

    if (timeSinceLastQuery < POLL_INTERVAL_MS) {
      console.log(`ℹ️ Skipping M-Pesa gateway query for CheckoutID: ${checkoutRequestId} to prevent Spike Arrest (last queried ${Math.round(timeSinceLastQuery / 1000)}s ago).`);
    } else {
      try {
        console.log(`⏳ DB status is PENDING. Querying Safaricom Gateway for CheckoutID: ${checkoutRequestId}`);
        tx.lastQueriedAt = Date.now();
        await tx.save();

        const response = await queryMpesaStkStatusService(checkoutRequestId);

        // ResultCode === '0' means transaction was processed successfully
        if (response.ResultCode === '0' || response.ResultCode === 0) {
          tx.status = 'SUCCESS';
          tx.rawResponse = { ...tx.rawResponse, queryResult: response };
          await tx.save();

          if (order.paymentStatus !== 'paid') {
            order.paymentStatus = 'paid';
            order.orderEvents.push({
              status: 'PAYMENT_CONFIRMED',
              note: `M-Pesa payment verified via JIT query. CheckoutRequestID: ${checkoutRequestId}`,
              user: null
            });
            await order.save();
            console.log(`✅ Self-Healed: Order ${order.orderNumber} successfully marked as PAID`);
            sendOrderConfirmationEmailHelper(order).catch(err => console.error('Error sending payment-triggered email:', err));
          }
        } else if (['1032', '1037', '2001', '9002'].includes(response.ResultCode?.toString())) {
          // Known cancellation/failure codes: 1032 (Canceled by user), 1037 (Timeout), 2001 (Wrong PIN)
          tx.status = 'FAILED';
          tx.rawResponse = { ...tx.rawResponse, queryResult: response };
          await tx.save();

          if (order.paymentStatus !== 'failed') {
            order.paymentStatus = 'failed';
            order.orderEvents.push({
              status: 'PAYMENT_FAILED',
              note: `M-Pesa payment failed: ${response.ResultDesc} (Code: ${response.ResultCode})`,
              user: null
            });
            await order.save();
            console.log(`❌ Order ${order.orderNumber} updated to FAILED based on JIT query`);
          }
        }
      } catch (queryErr) {
        console.warn(`⚠️ M-Pesa status query failed during polling check: ${queryErr.message}`);
      }
    }
  }

  res.json({
    success: true,
    status: tx.status,
    paymentStatus: order.paymentStatus,
    orderId: order._id,
    orderNumber: order.orderNumber
  });
});

// @desc    Create PayPal checkout order with JIT conversion from KES to USD
// @route   POST /api/payments/paypal/create-order
// @access  Private
export const createPayPalOrder = asyncHandler(async (req, res) => {
  const { orderId, returnUrl, cancelUrl } = req.body;

  console.log(`💳 Creating PayPal order for Order ID: ${orderId}`);

  // 1. Find the order
  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  if (order.paymentStatus === 'paid') {
    return res.status(400).json({ success: false, message: 'Order is already paid' });
  }

  try {
    // 2. Perform JIT exchange rate conversion (KES -> USD)
    const amountInUSD = await convertKEStoUSD(order.total);
    console.log(`🔄 JIT Conversion: KES ${order.total} converted to USD ${amountInUSD}`);

    // 3. Create Order via PayPal REST API V2
    const paypalOrder = await createPayPalOrderService(amountInUSD, order.orderNumber, returnUrl, cancelUrl);
    const paypalOrderId = paypalOrder.id;

    // 4. Update order with PayPal order ID as temporary transaction ID
    order.transactionId = paypalOrderId;
    order.orderEvents.push({
      status: 'PAYMENT_INITIATED',
      note: `PayPal checkout session created. PayPal Order ID: ${paypalOrderId}. Amount: $${amountInUSD} USD`,
      user: req.user?._id
    });
    await order.save();

    // 5. Create PENDING transaction record
    await PaymentTransaction.create({
      order: order._id,
      provider: 'PAYPAL',
      transactionId: paypalOrderId,
      amount: order.total,
      currency: 'KES',
      status: 'PENDING',
      rawResponse: paypalOrder,
      metadata: { amountUSD: amountInUSD }
    });

    // 6. Find checkout/approval link
    const approvalLink = paypalOrder.links.find(link => link.rel === 'approve')?.href;

    res.json({
      success: true,
      paypalOrderId,
      approvalUrl: approvalLink,
      amountInUSD
    });

  } catch (error) {
    console.error('❌ PayPal Order creation failed:', error.message);

    // Track failure in alert monitor
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userEmail = req.user ? req.user.email : 'Guest';
    recordPaymentFailure(ip, userEmail, 'PayPal Order Creation', error.message).catch(e => console.error('Alert monitor fail:', e));

    res.status(500).json({
      success: false,
      message: error.message || 'PayPal checkout initialization failed'
    });
  }
});

// @desc    Capture PayPal checkout payment
// @route   POST /api/payments/paypal/capture-order
// @access  Private
export const capturePayPalOrder = asyncHandler(async (req, res) => {
  const { paypalOrderId } = req.body;

  if (!paypalOrderId) {
    return res.status(400).json({ success: false, message: 'PayPal Order ID is required' });
  }

  console.log(`💰 Capturing PayPal Order: ${paypalOrderId}`);

  // 1. Find the transaction
  const tx = await PaymentTransaction.findOne({ transactionId: paypalOrderId, provider: 'PAYPAL' });
  if (!tx) {
    return res.status(404).json({ success: false, message: 'Payment transaction not found for this PayPal Order ID' });
  }

  // 2. Find the order
  const order = await Order.findById(tx.order);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Associated order not found' });
  }

  if (order.paymentStatus === 'paid') {
    return res.json({ success: true, message: 'Order is already marked as paid' });
  }

  try {
    // 3. Send capture request to PayPal REST API V2
    const captureResult = await capturePayPalOrderService(paypalOrderId);
    const status = captureResult.status;

    if (status === 'COMPLETED') {
      // 4. Update payment transaction log to SUCCESS
      tx.status = 'SUCCESS';
      tx.rawResponse = captureResult;
      await tx.save();

      // 5. Complete order status
      order.paymentStatus = 'paid';
      order.orderEvents.push({
        status: 'PAYMENT_CONFIRMED',
        note: `PayPal payment captured successfully. PayPal Transaction ID: ${paypalOrderId}`,
        user: req.user?._id
      });
      await order.save();

      console.log(`✅ PayPal Order ${order.orderNumber} captured successfully!`);
      sendOrderConfirmationEmailHelper(order).catch(err => console.error('Error sending payment-triggered email:', err));
      res.json({
        success: true,
        message: 'PayPal payment processed successfully',
        orderId: order._id,
        orderNumber: order.orderNumber
      });
    } else {
      // Capture succeeded but status is not completed yet (pending capture)
      tx.status = 'PENDING';
      tx.rawResponse = captureResult;
      await tx.save();

      res.json({
        success: true,
        message: `PayPal capture status: ${status}. Waiting for final settlement.`,
        status: 'PENDING'
      });
    }

  } catch (error) {
    console.error('❌ PayPal Capture failed:', error.message);

    // Track failure in alert monitor
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userEmail = req.user ? req.user.email : 'Guest';
    recordPaymentFailure(ip, userEmail, 'PayPal Capture Failed', error.message).catch(e => console.error('Alert monitor fail:', e));
    
    tx.status = 'FAILED';
    await tx.save();

    order.paymentStatus = 'failed';
    order.orderEvents.push({
      status: 'PAYMENT_FAILED',
      note: `PayPal payment capture failed: ${error.message}`,
      user: req.user?._id
    });
    await order.save();

    res.status(500).json({
      success: false,
      message: error.message || 'PayPal capture process failed'
    });
  }
});

// @desc    Process Card Payment (Simulated)
// @route   POST /api/payments/card
// @access  Private
export const processCardPayment = asyncHandler(async (req, res) => {
  const { orderId, cardDetails } = req.body;

  console.log(`💳 Processing Simulated Card Payment for Order: ${orderId}`);

  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  if (order.paymentStatus === 'paid') {
    return res.status(400).json({ success: false, message: 'Order is already paid' });
  }

  const transactionId = `STRP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  const transaction = await PaymentTransaction.create({
    order: order._id,
    provider: 'STRIPE',
    transactionId: transactionId,
    amount: order.total,
    currency: 'KES',
    status: 'SUCCESS',
    rawResponse: { simulation: true, method: 'card' },
    metadata: {
      cardBrand: cardDetails?.brand || 'visa',
      last4: cardDetails?.cardNumber?.slice(-4) || 'XXXX'
    }
  });

  order.paymentStatus = 'paid';
  order.transactionId = transactionId;
  order.orderEvents.push({
    status: 'PAYMENT_CONFIRMED',
    note: `Card payment simulated successfully. Transaction: ${transactionId}`,
    user: req.user?._id
  });
  await order.save();

  console.log(`✅ Order ${order.orderNumber} PAID via simulated card.`);
  sendOrderConfirmationEmailHelper(order).catch(err => console.error('Error sending payment-triggered email:', err));
  res.json({
    success: true,
    message: 'Card payment processed successfully',
    data: { transactionId, transaction: transaction._id }
  });
});

// @desc    Simulate M-Pesa Webhook Callback
// @route   POST /api/payments/mpesa/callback (Simulated)
// @access  Public
export const simulateMpesaWebhook = asyncHandler(async (req, res) => {
  const { orderNumber, amount, transactionId, status } = req.body;

  console.log('📡 Received Simulated M-Pesa Webhook Callback:', req.body);

  const order = await Order.findOne({ orderNumber });
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  const existingTx = await PaymentTransaction.findOne({ order: order._id, provider: 'MPESA' }).sort({ createdAt: -1 });
  if (existingTx) {
    existingTx.status = status === 'Success' ? 'SUCCESS' : 'FAILED';
    existingTx.rawResponse = { ...existingTx.rawResponse, webhook: req.body };
    if (transactionId) existingTx.transactionId = transactionId;
    await existingTx.save();
  } else {
    await PaymentTransaction.create({
      order: order._id,
      provider: 'MPESA',
      transactionId: transactionId || `MPESA-WEB-${Date.now()}`,
      amount: amount || order.total,
      currency: 'KES',
      status: status === 'Success' ? 'SUCCESS' : 'FAILED',
      rawResponse: req.body
    });
  }

  if (status === 'Success') {
    if (order.paymentStatus !== 'paid') {
      order.paymentStatus = 'paid';
      order.transactionId = transactionId || `MPESA-${Date.now()}`;
      order.orderEvents.push({
        status: 'PAYMENT_CONFIRMED',
        note: `M-Pesa Payment Confirmed via Webhook Simulation. Receipt: ${order.transactionId}`,
        user: null
      });
      await order.save();
      sendOrderConfirmationEmailHelper(order).catch(err => console.error('Error sending payment-triggered email:', err));
    }
    return res.json({ success: true, message: 'Simulated payment processed successfully' });
  } else {
    order.paymentStatus = 'failed';
    order.orderEvents.push({
      status: 'PAYMENT_FAILED',
      note: 'M-Pesa Payment failed via Webhook Simulation',
      user: null
    });
    await order.save();
    return res.json({ success: true, message: 'Simulated payment failure recorded' });
  }
});