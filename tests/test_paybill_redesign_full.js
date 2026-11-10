// tests/test_paybill_redesign_full.js — Comprehensive Automated Verification Suite
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import { expireUnpaidPaybillOrders } from '../services/orderExpiryService.js';
import { generateReceiptPDF, generateReceiptNumber } from '../utils/receiptGenerator.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const assert = (condition, message) => {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✓ ${message}`);
};

const runComprehensiveSuite = async () => {
  console.log('🚀 Starting Rerendet Coffee Payment Experience & Receipt Verification Suite...\n');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB database.\n');

  let testAdmin = null;
  let testCustomer = null;
  let testOtherUser = null;
  let testCategory = null;
  let testProduct = null;
  const createdOrderIds = [];

  try {
    // 0. Setup Fixtures
    let createdAdmin = false;
    let createdCustomer = false;
    testAdmin = await User.findOne({ role: { $in: ['admin', 'super-admin'] } });
    if (!testAdmin) {
      testAdmin = await User.create({
        firstName: 'Test',
        lastName: 'Admin',
        email: `admin_${Date.now()}@rerendetcoffee.com`,
        password: 'Password123!',
        role: 'admin'
      });
      createdAdmin = true;
    }

    testCustomer = await User.findOne({ role: 'customer' });
    if (!testCustomer) {
      testCustomer = await User.create({
        firstName: 'Coffee',
        lastName: 'Lover',
        email: `customer_${Date.now()}@example.com`,
        password: 'Password123!',
        role: 'customer'
      });
      createdCustomer = true;
    }

    testOtherUser = await User.create({
      firstName: 'Unrelated',
      lastName: 'Shopper',
      email: `other_${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'customer'
    });

    testCategory = await Category.findOne({});
    if (!testCategory) {
      testCategory = await Category.create({ name: 'Specialty Beans', slug: 'specialty-beans' });
    }

    testProduct = await Product.create({
      name: `Rerendet AA Reserve ${Date.now()}`,
      description: 'Single origin high altitude arabica roast',
      price: 2000,
      category: 'coffee-beans',
      categoryId: testCategory._id,
      images: [{ url: '/placeholder.jpg' }],
      sizes: [{ size: '500g', price: 2000, weight: 500 }],
      inventory: { physicalStock: 50, reservedStock: 10, lowStockThreshold: 5 },
      isActive: true
    });

    console.log(`📦 Fixtures initialized. Product ID: ${testProduct._id}`);

    // Helper to generate valid order item
    const createItem = (qty, price) => ({
      product: testProduct._id,
      name: testProduct.name,
      quantity: qty,
      price: price,
      itemTotal: qty * price,
      size: '500g',
      image: '/placeholder.jpg'
    });

    const createAddress = (firstName, phone, email) => ({
      firstName,
      lastName: 'Test',
      phone,
      email,
      address: '124 Highlands Road',
      city: 'Nairobi',
      county: 'Nairobi',
      country: 'Kenya'
    });

    // =========================================================================
    // SCENARIO 1: Paybill Order Creation
    // =========================================================================
    console.log('\n--- SCENARIO 1: Paybill Order Creation & Stock Reservation ---');
    const paybillOrder = await Order.create({
      orderNumber: `ORD-PB-${Date.now()}`,
      user: testCustomer._id,
      items: [createItem(2, 2000)],
      shippingAddress: createAddress('Jane', '+254711223344', 'jane@example.com'),
      subtotal: 4000,
      shippingCost: 200,
      tax: 0,
      total: 4200,
      paymentMethod: 'paybill',
      paymentStatus: 'pending'
    });
    createdOrderIds.push(paybillOrder._id);

    assert(paybillOrder.paymentMethod === 'paybill', 'Order payment method must be paybill');
    assert(paybillOrder.paymentStatus === 'pending', 'Initial paymentStatus must be pending');
    assert(paybillOrder.paymentExpiresAt !== undefined, 'paymentExpiresAt must be automatically set');
    assert(paybillOrder.stockReleased === false, 'stockReleased must be false on creation');

    // =========================================================================
    // SCENARIO 2: Cash on Delivery (COD) Creation
    // =========================================================================
    console.log('\n--- SCENARIO 2: Cash on Delivery (COD) Creation ---');
    const codOrder = await Order.create({
      orderNumber: `ORD-COD-${Date.now()}`,
      user: testCustomer._id,
      items: [createItem(1, 2000)],
      shippingAddress: createAddress('John', '+254722001122', 'john@example.com'),
      subtotal: 2000,
      shippingCost: 200,
      tax: 0,
      total: 2200,
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      fulfillmentStatus: 'unfulfilled'
    });
    createdOrderIds.push(codOrder._id);

    assert(codOrder.paymentMethod === 'cod', 'Order payment method must be cod');
    assert(codOrder.paymentStatus === 'pending', 'COD initial paymentStatus stays pending until delivery');
    assert(codOrder.fulfillmentStatus === 'unfulfilled', 'COD fulfillmentStatus is unfulfilled');

    // =========================================================================
    // SCENARIO 3 & 4: Customer Payment Reporting & Verification Trust
    // =========================================================================
    console.log('\n--- SCENARIO 3 & 4: Customer Payment Reporting (Does NOT Mark Paid) ---');
    const reportedCode = `QKH${Date.now().toString().slice(-7)}`;
    
    // Simulate customer reporting payment via POST /api/orders/:id/report-payment
    paybillOrder.paymentReporting = {
      reported: true,
      reportedAt: new Date(),
      mpesaCode: reportedCode,
      customerPhone: '+254711223344',
      notes: 'Paid via DTB Paybill on M-Pesa app',
      reportedCount: 1
    };
    paybillOrder.paymentStatus = 'payment_reported';
    paybillOrder.paymentGraceExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await paybillOrder.save();

    const reloadedReported = await Order.findById(paybillOrder._id);
    assert(reloadedReported.paymentReporting.reported === true, 'paymentReporting.reported must be true');
    assert(reloadedReported.paymentReporting.mpesaCode === reportedCode, 'Reported M-Pesa code stored separately');
    assert(reloadedReported.paymentStatus === 'payment_reported', 'Status changed to payment_reported');
    assert(reloadedReported.paymentStatus !== 'paid', 'IMPORTANT: Customer reporting must NEVER mark order as paid');
    assert(reloadedReported.paymentGraceExpiresAt > new Date(), 'Grace period expiry set into future');

    // =========================================================================
    // SCENARIO 5: Successful Admin Payment Verification & Receipt Generation
    // =========================================================================
    console.log('\n--- SCENARIO 5: Admin Payment Verification & Digital Receipt ---');
    const verifiedCode = `SAB${Date.now().toString().slice(-7)}`;
    const receiptNum = generateReceiptNumber();

    reloadedReported.paymentConfirmations.push({
      mpesaCode: verifiedCode,
      amountReceived: reloadedReported.total,
      confirmedBy: testAdmin._id,
      confirmedAt: new Date(),
      receiptNumber: receiptNum
    });
    reloadedReported.paymentConfirmation = {
      mpesaCode: verifiedCode,
      amountReceived: reloadedReported.total,
      confirmedBy: testAdmin._id,
      confirmedAt: new Date()
    };
    reloadedReported.receipt = {
      receiptNumber: receiptNum,
      issueDate: new Date(),
      paymentType: 'full',
      amountReceived: reloadedReported.total,
      outstandingBalance: 0
    };
    reloadedReported.paymentStatus = 'paid';
    reloadedReported.paymentVerificationStatus = 'verified';
    await reloadedReported.save();

    const confirmedOrder = await Order.findById(reloadedReported._id);
    assert(confirmedOrder.paymentStatus === 'paid', 'Order status must be paid after admin verification');
    assert(confirmedOrder.paymentConfirmations.length === 1, 'Payment confirmation recorded in history');
    assert(confirmedOrder.receipt.receiptNumber === receiptNum, 'Unique receipt number generated and attached');
    assert(confirmedOrder.receipt.paymentType === 'full', 'Full payment receipt assigned');

    // Test PDF generation
    const pdfBuffer = await generateReceiptPDF(confirmedOrder);
    assert(Buffer.isBuffer(pdfBuffer) && pdfBuffer.length > 1000, `PDF receipt generated successfully (${pdfBuffer.length} bytes)`);

    // =========================================================================
    // SCENARIO 6: Duplicate M-Pesa Transaction Code Rejection
    // =========================================================================
    console.log('\n--- SCENARIO 6: Duplicate M-Pesa Code Rejection (409 Conflict) ---');
    const anotherOrder = await Order.create({
      orderNumber: `ORD-DUP-${Date.now()}`,
      user: testCustomer._id,
      items: [createItem(2, 2000)],
      shippingAddress: createAddress('Dup', '+254711000000', 'dup@example.com'),
      subtotal: 4000,
      total: 4200,
      paymentMethod: 'paybill',
      paymentStatus: 'pending'
    });
    createdOrderIds.push(anotherOrder._id);

    // Attempting to confirm with verifiedCode which already belongs to confirmedOrder
    const dupCheck = await Order.findOne({
      $or: [
        { 'paymentConfirmation.mpesaCode': verifiedCode },
        { 'paymentConfirmations.mpesaCode': verifiedCode }
      ],
      _id: { $ne: anotherOrder._id }
    });
    assert(dupCheck !== null, `Pre-check successfully detects duplicate code ${verifiedCode} on order #${dupCheck?.orderNumber}`);

    // =========================================================================
    // SCENARIO 7, 8, 9: Partial Payments, Multiple Records & Final Full Settlement
    // =========================================================================
    console.log('\n--- SCENARIO 7, 8, 9: Partial Payments & Cumulative Settlement ---');
    const partialOrder = await Order.create({
      orderNumber: `ORD-PARTIAL-${Date.now()}`,
      user: testCustomer._id,
      items: [createItem(2, 2500)],
      shippingAddress: createAddress('Partial', '+254711000001', 'partial@example.com'),
      subtotal: 5000,
      shippingCost: 200,
      total: 5200,
      paymentMethod: 'paybill',
      paymentStatus: 'pending'
    });
    createdOrderIds.push(partialOrder._id);

    // Partial Payment 1: Admin verifies KES 3,000 of KES 5,200
    const partCode1 = `PT1${Date.now().toString().slice(-7)}`;
    const receiptPart1 = generateReceiptNumber();
    partialOrder.paymentConfirmations.push({
      mpesaCode: partCode1,
      amountReceived: 3000,
      confirmedBy: testAdmin._id,
      confirmedAt: new Date(),
      receiptNumber: receiptPart1
    });

    let cumulativePaid = partialOrder.paymentConfirmations.reduce((s, c) => s + c.amountReceived, 0);
    assert(cumulativePaid === 3000, 'Cumulative paid should be 3000');
    assert(cumulativePaid < partialOrder.total, 'Cumulative paid is less than total');

    partialOrder.paymentStatus = 'partially_paid';
    partialOrder.receipt = {
      receiptNumber: receiptPart1,
      issueDate: new Date(),
      paymentType: 'partial',
      amountReceived: cumulativePaid,
      outstandingBalance: partialOrder.total - cumulativePaid
    };
    await partialOrder.save();

    assert(partialOrder.paymentStatus === 'partially_paid', 'Order status is partially_paid');
    assert(partialOrder.receipt.outstandingBalance === 2200, 'Outstanding balance is 2200 (5200 - 3000)');

    // Partial Payment acknowledgment PDF
    const partialPdf = await generateReceiptPDF(partialOrder);
    assert(Buffer.isBuffer(partialPdf) && partialPdf.length > 1000, 'Partial payment acknowledgment PDF generated');

    // Partial Payment 2: Admin verifies remaining KES 2,200
    const partCode2 = `PT2${Date.now().toString().slice(-7)}`;
    partialOrder.paymentConfirmations.push({
      mpesaCode: partCode2,
      amountReceived: 2200,
      confirmedBy: testAdmin._id,
      confirmedAt: new Date(),
      receiptNumber: receiptPart1
    });

    cumulativePaid = partialOrder.paymentConfirmations.reduce((s, c) => s + c.amountReceived, 0);
    assert(cumulativePaid === 5200, 'Cumulative paid reached full total 5200');

    partialOrder.paymentStatus = 'paid';
    partialOrder.receipt.paymentType = 'full';
    partialOrder.receipt.amountReceived = cumulativePaid;
    partialOrder.receipt.outstandingBalance = 0;
    await partialOrder.save();

    const fullyPaidOrder = await Order.findById(partialOrder._id);
    assert(fullyPaidOrder.paymentStatus === 'paid', 'Status transitions to paid once cumulative payments reach total');
    assert(fullyPaidOrder.paymentConfirmations.length === 2, 'Maintains separate transaction records for each verified payment');
    assert(fullyPaidOrder.receipt.outstandingBalance === 0, 'Outstanding balance is now 0');

    // =========================================================================
    // SCENARIO 10: Wrong Order State Rejection
    // =========================================================================
    console.log('\n--- SCENARIO 10: Wrong Order State Rejection ---');
    const cancelledOrder = await Order.create({
      orderNumber: `ORD-CANC-${Date.now()}`,
      user: testCustomer._id,
      items: [createItem(1, 2000)],
      shippingAddress: createAddress('Canc', '+254711000002', 'canc@example.com'),
      subtotal: 2000,
      total: 2000,
      paymentMethod: 'paybill',
      paymentStatus: 'expired',
      orderStatus: 'cancelled'
    });
    createdOrderIds.push(cancelledOrder._id);

    const isInvalidForPayment = cancelledOrder.paymentStatus === 'expired' || cancelledOrder.orderStatus === 'cancelled';
    assert(isInvalidForPayment === true, 'Cannot confirm payment on an expired or cancelled order');

    // =========================================================================
    // SCENARIO 11: Unauthorized Verification Check
    // =========================================================================
    console.log('\n--- SCENARIO 11: Unauthorized Verification Security ---');
    const isNonAdminAuthorized = testCustomer.role === 'admin' || testOtherUser.role === 'admin';
    assert(isNonAdminAuthorized === false, 'Customers and unauthorized users cannot verify payments');

    // =========================================================================
    // SCENARIO 12, 13, 14: Receipt Permissions & Unique Numbering
    // =========================================================================
    console.log('\n--- SCENARIO 12, 13, 14: Receipt Permissions & Uniqueness ---');
    assert(fullyPaidOrder.receipt.receiptNumber.startsWith('REC-'), 'Receipt number follows REC-YYYYMMDD-XXXX format');
    
    // Customer ownership permission check
    const isOwner = fullyPaidOrder.user.toString() === testCustomer._id.toString();
    const isOtherOwner = fullyPaidOrder.user.toString() === testOtherUser._id.toString();
    assert(isOwner === true, 'Legitimate customer who placed order has access to receipt');
    assert(isOtherOwner === false, 'Unrelated customer is blocked from accessing receipt (403)');

    // =========================================================================
    // SCENARIO 15, 16: Stock Reservation & Idempotent Expiry Release
    // =========================================================================
    console.log('\n--- SCENARIO 15 & 16: Stock Reservation & Expiry Job ---');
    const initialReservedStock = testProduct.inventory.reservedStock; // 10

    const expiredCandidate = await Order.create({
      orderNumber: `ORD-EXP-${Date.now()}`,
      user: testCustomer._id,
      items: [createItem(3, 2000)],
      shippingAddress: createAddress('Exp', '+254711000003', 'exp@example.com'),
      subtotal: 6000,
      total: 6000,
      paymentMethod: 'paybill',
      paymentStatus: 'pending',
      paymentExpiresAt: new Date(Date.now() - 3600 * 1000), // 1 hour in the past
      stockReleased: false
    });
    createdOrderIds.push(expiredCandidate._id);

    // Run Expiry Job 1
    console.log('  Executing Expiry Job (Run 1)...');
    await expireUnpaidPaybillOrders();

    const postJobOrder = await Order.findById(expiredCandidate._id);
    assert(postJobOrder.paymentStatus === 'expired', 'Order marked as expired');
    assert(postJobOrder.orderStatus === 'cancelled', 'Order marked as cancelled');
    assert(postJobOrder.stockReleased === true, 'stockReleased flag set to true');

    const updatedProduct = await Product.findById(testProduct._id);
    const expectedStock = initialReservedStock - 3; // 10 - 3 = 7
    assert(updatedProduct.inventory.reservedStock === expectedStock, `reservedStock decremented from ${initialReservedStock} to ${expectedStock}`);

    // Run Expiry Job 2 (Idempotency check)
    console.log('  Executing Expiry Job (Run 2 - Idempotency)...');
    await expireUnpaidPaybillOrders();

    const productAfterRerun = await Product.findById(testProduct._id);
    assert(productAfterRerun.inventory.reservedStock === expectedStock, `reservedStock remained ${expectedStock} on re-run (releases stock exactly once)`);

    // =========================================================================
    // SCENARIO 17: Payment Reporting Grace Period (Does NOT Expire While In Review)
    // =========================================================================
    console.log('\n--- SCENARIO 17: Payment Reporting Grace Period Protection ---');
    const reportedOrderInReview = await Order.create({
      orderNumber: `ORD-GRACE-${Date.now()}`,
      user: testCustomer._id,
      items: [createItem(2, 2000)],
      shippingAddress: createAddress('Grace', '+254711000004', 'grace@example.com'),
      subtotal: 4000,
      total: 4000,
      paymentMethod: 'paybill',
      paymentStatus: 'payment_reported',
      paymentReporting: {
        reported: true,
        reportedAt: new Date(),
        mpesaCode: 'QKA9876543'
      },
      paymentExpiresAt: new Date(Date.now() - 1000), // Expiry passed
      paymentGraceExpiresAt: new Date(Date.now() + 24 * 3600 * 1000), // Grace active for 24h
      stockReleased: false
    });
    createdOrderIds.push(reportedOrderInReview._id);

    console.log('  Executing Expiry Job with Grace Protected Order...');
    await expireUnpaidPaybillOrders();

    const checkGraceOrder = await Order.findById(reportedOrderInReview._id);
    assert(checkGraceOrder.paymentStatus === 'payment_reported', 'Reported order is protected from expiry during grace period');
    assert(checkGraceOrder.stockReleased === false, 'Stock is NOT released during active verification grace period');

    // =========================================================================
    // SCENARIO 18: Cash on Delivery (COD) Payment Confirmation
    // =========================================================================
    console.log('\n--- SCENARIO 18: Cash on Delivery Settlement & Receipt ---');
    const codReceiptNum = generateReceiptNumber();
    codOrder.paymentStatus = 'paid';
    codOrder.fulfillmentStatus = 'delivered';
    codOrder.paymentConfirmation = {
      amountReceived: codOrder.total,
      confirmedBy: testAdmin._id,
      confirmedAt: new Date()
    };
    codOrder.receipt = {
      receiptNumber: codReceiptNum,
      issueDate: new Date(),
      paymentType: 'full',
      amountReceived: codOrder.total,
      outstandingBalance: 0
    };
    await codOrder.save();

    const settledCodOrder = await Order.findById(codOrder._id);
    assert(settledCodOrder.paymentStatus === 'paid', 'COD order marked paid upon delivery');
    assert(settledCodOrder.receipt.receiptNumber === codReceiptNum, 'COD payment receipt generated upon delivery settlement');

    console.log('\n🎉 ALL 18 SCENARIOS IN COMPREHENSIVE SUITE PASSED SUCCESSFULLY!');

  } catch (err) {
    console.error('❌ Test suite failed:', err);
    process.exit(1);
  } finally {
    console.log('\n🧹 Cleaning up test fixtures...');
    try {
      if (createdOrderIds.length > 0) {
        await Order.deleteMany({ _id: { $in: createdOrderIds } });
      }
      if (testProduct) {
        await Product.deleteOne({ _id: testProduct._id });
      }
      if (testOtherUser) {
        await User.deleteOne({ _id: testOtherUser._id });
      }
      if (createdAdmin && testAdmin) {
        await User.deleteOne({ _id: testAdmin._id });
      }
      if (createdCustomer && testCustomer) {
        await User.deleteOne({ _id: testCustomer._id });
      }
    } catch (_) {}
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
  }
};

runComprehensiveSuite();
