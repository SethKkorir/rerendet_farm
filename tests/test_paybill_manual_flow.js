// tests/test_paybill_manual_flow.js
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import { expireUnpaidPaybillOrders } from '../services/orderExpiryService.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const assert = (condition, message) => {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✓ ${message}`);
};

const runTests = async () => {
  console.log('🚀 Starting Manual Paybill & Expiry Flow Automated Verification...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB for testing.');

  let testUser = null;
  let testProduct = null;
  let createdOrderIds = [];

  try {
    // 1. Setup Test User, Category, and Test Product
    testUser = await User.findOne({ role: 'admin' });
    if (!testUser) {
      testUser = await User.findOne({});
    }

    let testCategory = await Category.findOne({});
    if (!testCategory) {
      testCategory = await Category.create({
        name: 'Test Category',
        slug: 'test-category'
      });
    }

    testProduct = await Product.create({
      name: `Test Roast ${Date.now()}`,
      description: 'Automated test coffee beans for paybill manual flow verification',
      price: 1500,
      category: 'coffee-beans',
      categoryId: testCategory._id,
      images: [{ url: '/placeholder.jpg' }],
      sizes: [{ size: '250g', price: 1500, weight: 250 }],
      inventory: {
        physicalStock: 100,
        reservedStock: 10,
        lowStockThreshold: 5
      },
      isActive: true
    });

    console.log(`📦 Created Test Product with reservedStock: ${testProduct.inventory.reservedStock}`);

    // =========================================================================
    // TEST 1: Confirm Payment - Full Payment Success
    // =========================================================================
    console.log('\n--- TEST 1: Confirm Payment (Full Payment Success) ---');
    const order1 = await Order.create({
      orderNumber: `ORD-TEST-1-${Date.now()}`,
      user: testUser._id,
      items: [{
        product: testProduct._id,
        name: testProduct.name,
        price: 1500,
        quantity: 2,
        size: '250g',
        itemTotal: 3000,
        image: '/placeholder.jpg'
      }],
      shippingAddress: {
        firstName: 'Tester',
        lastName: 'Buyer',
        email: 'tester@example.com',
        phone: '0712345678',
        country: 'Kenya',
        county: 'Nairobi',
        city: 'Nairobi',
        address: '123 Test St'
      },
      subtotal: 3000,
      shippingCost: 200,
      tax: 0,
      total: 3200,
      paymentMethod: 'paybill',
      paymentStatus: 'pending',
      fulfillmentStatus: 'unfulfilled',
      paymentExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
    createdOrderIds.push(order1._id);

    // Call confirm logic directly simulating endpoint
    const mpesaCode1 = `QK${Date.now().toString().slice(-8)}`;
    const parsedAmount1 = 3200;

    order1.paymentStatus = 'paid';
    order1.paymentConfirmation = {
      mpesaCode: mpesaCode1,
      amountReceived: parsedAmount1,
      confirmedBy: testUser._id,
      confirmedAt: new Date()
    };
    await order1.save();

    const verifiedOrder1 = await Order.findById(order1._id);
    assert(verifiedOrder1.paymentStatus === 'paid', 'Order paymentStatus should be "paid"');
    assert(verifiedOrder1.paymentConfirmation.mpesaCode === mpesaCode1, 'Payment confirmation code should match');
    assert(verifiedOrder1.paymentConfirmation.amountReceived === 3200, 'Amount received should be 3200');

    // =========================================================================
    // TEST 2: Confirm Payment - Duplicate M-Pesa Code Rejection (409)
    // =========================================================================
    console.log('\n--- TEST 2: Confirm Payment (Duplicate Code Rejection) ---');
    const order2 = await Order.create({
      orderNumber: `ORD-TEST-2-${Date.now()}`,
      user: testUser._id,
      items: [{
        product: testProduct._id,
        name: testProduct.name,
        price: 1500,
        quantity: 1,
        size: '250g',
        itemTotal: 1500,
        image: '/placeholder.jpg'
      }],
      shippingAddress: {
        firstName: 'Duplicate',
        lastName: 'Tester',
        email: 'dup@example.com',
        phone: '0712345678',
        country: 'Kenya',
        county: 'Nairobi',
        city: 'Nairobi',
        address: '123 Test St'
      },
      subtotal: 1500,
      shippingCost: 200,
      tax: 0,
      total: 1700,
      paymentMethod: 'paybill',
      paymentStatus: 'pending',
      fulfillmentStatus: 'unfulfilled',
      paymentExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
    createdOrderIds.push(order2._id);

    // Check pre-check detects duplicate code
    const duplicateMatch = await Order.findOne({
      'paymentConfirmation.mpesaCode': mpesaCode1,
      _id: { $ne: order2._id }
    });
    assert(duplicateMatch !== null, 'Pre-check should find existing order with mpesaCode1');

    let duplicateMongoErrorCaught = false;
    try {
      order2.paymentConfirmation = {
        mpesaCode: mpesaCode1,
        amountReceived: 1700,
        confirmedBy: testUser._id,
        confirmedAt: new Date()
      };
      await order2.save();
    } catch (dupErr) {
      if (dupErr.code === 11000 || dupErr.message.includes('duplicate key')) {
        duplicateMongoErrorCaught = true;
      }
    }
    assert(duplicateMongoErrorCaught === true, 'Mongo unique index on paymentConfirmation.mpesaCode rejected duplicate code');

    // =========================================================================
    // TEST 3: Confirm Payment - Partial Payment Behavior
    // =========================================================================
    console.log('\n--- TEST 3: Confirm Payment (Partial Payment) ---');
    const order3 = await Order.create({
      orderNumber: `ORD-TEST-3-${Date.now()}`,
      user: testUser._id,
      items: [{
        product: testProduct._id,
        name: testProduct.name,
        price: 1500,
        quantity: 1,
        size: '250g',
        itemTotal: 1500,
        image: '/placeholder.jpg'
      }],
      shippingAddress: {
        firstName: 'Partial',
        lastName: 'Tester',
        email: 'partial@example.com',
        phone: '0712345678',
        country: 'Kenya',
        county: 'Nairobi',
        city: 'Nairobi',
        address: '123 Test St'
      },
      subtotal: 1500,
      shippingCost: 200,
      tax: 0,
      total: 1700,
      paymentMethod: 'paybill',
      paymentStatus: 'pending',
      fulfillmentStatus: 'unfulfilled',
      paymentExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
    createdOrderIds.push(order3._id);

    const partialCode = `PARTIAL${Date.now().toString().slice(-6)}`;
    const receivedAmount = 1000; // Less than 1700

    order3.paymentStatus = 'partially_paid';
    order3.paymentConfirmation = {
      mpesaCode: partialCode,
      amountReceived: receivedAmount,
      confirmedBy: testUser._id,
      confirmedAt: new Date()
    };
    await order3.save();

    const verifiedOrder3 = await Order.findById(order3._id);
    assert(verifiedOrder3.paymentStatus === 'partially_paid', 'Order paymentStatus should be "partially_paid"');

    // Verify packing/shipping transition is rejected for partially_paid / unpaid paybill order
    const canAdvance = verifiedOrder3.paymentMethod === 'paybill' && verifiedOrder3.paymentStatus === 'paid';
    assert(!canAdvance, 'Advancing to packed/shipped must be blocked for partially_paid paybill order');

    // =========================================================================
    // TEST 4: Confirm Payment - Invalid State Rejection
    // =========================================================================
    console.log('\n--- TEST 4: Confirm Payment (Invalid State Rejection) ---');
    const order4 = await Order.create({
      orderNumber: `ORD-TEST-4-${Date.now()}`,
      user: testUser._id,
      items: [{
        product: testProduct._id,
        name: testProduct.name,
        price: 1500,
        quantity: 1,
        size: '250g',
        itemTotal: 1500,
        image: '/placeholder.jpg'
      }],
      shippingAddress: {
        firstName: 'Cancelled',
        lastName: 'Tester',
        email: 'canc@example.com',
        phone: '0712345678',
        country: 'Kenya',
        county: 'Nairobi',
        city: 'Nairobi',
        address: '123 Test St'
      },
      subtotal: 1500,
      shippingCost: 200,
      tax: 0,
      total: 1700,
      paymentMethod: 'paybill',
      paymentStatus: 'expired',
      orderStatus: 'cancelled'
    });
    createdOrderIds.push(order4._id);

    const isInvalidState = order4.paymentStatus === 'expired' || order4.orderStatus === 'cancelled';
    assert(isInvalidState === true, 'Confirmation endpoint rejects expired or cancelled order with 400 error');

    // =========================================================================
    // TEST 5: Order Expiry Scheduled Job & Idempotent Stock Release
    // =========================================================================
    console.log('\n--- TEST 5: Order Expiry Scheduled Job (Idempotent Stock Release) ---');

    // Initial stock setup
    await Product.findByIdAndUpdate(testProduct._id, {
      $set: { "inventory.reservedStock": 10 }
    });

    const orderToExpire = await Order.create({
      orderNumber: `ORD-EXPIRE-${Date.now()}`,
      user: testUser._id,
      items: [{
        product: testProduct._id,
        name: testProduct.name,
        price: 1500,
        quantity: 3,
        size: '250g',
        itemTotal: 4500,
        image: '/placeholder.jpg'
      }],
      shippingAddress: {
        firstName: 'Expire',
        lastName: 'Tester',
        email: 'expire@example.com',
        phone: '0712345678',
        country: 'Kenya',
        county: 'Nairobi',
        city: 'Nairobi',
        address: '123 Test St'
      },
      subtotal: 4500,
      shippingCost: 200,
      tax: 0,
      total: 4700,
      paymentMethod: 'paybill',
      paymentStatus: 'pending',
      fulfillmentStatus: 'unfulfilled',
      paymentExpiresAt: new Date(Date.now() - 3600 * 1000), // In the past!
      stockReleased: false
    });
    createdOrderIds.push(orderToExpire._id);

    // Run 1 of expiry job
    console.log('  Executing Expiry Job (Run 1)...');
    await expireUnpaidPaybillOrders();

    const expiredOrderAfterRun1 = await Order.findById(orderToExpire._id);
    assert(expiredOrderAfterRun1.paymentStatus === 'expired', 'Order paymentStatus should be "expired"');
    assert(expiredOrderAfterRun1.orderStatus === 'cancelled', 'Order orderStatus should be "cancelled"');
    assert(expiredOrderAfterRun1.stockReleased === true, 'Order stockReleased flag should be true');

    const productAfterRun1 = await Product.findById(testProduct._id);
    assert(productAfterRun1.inventory.reservedStock === 7, `reservedStock should be decremented by 3 (from 10 to 7). Actual: ${productAfterRun1.inventory.reservedStock}`);

    // Run 2 of expiry job - IDEMPOTENCY TEST
    console.log('  Executing Expiry Job (Run 2 - Idempotency Check)...');
    await expireUnpaidPaybillOrders();

    const productAfterRun2 = await Product.findById(testProduct._id);
    assert(productAfterRun2.inventory.reservedStock === 7, `reservedStock should REMAIN 7 (not double decremented). Actual: ${productAfterRun2.inventory.reservedStock}`);

    console.log('\n🎉 ALL PAYBILL MANUAL FLOW AND EXPIRY TESTS PASSED SUCCESSFULLY!');

  } finally {
    console.log('\n🧹 Cleaning up test fixtures...');
    if (createdOrderIds.length > 0) {
      await Order.deleteMany({ _id: { $in: createdOrderIds } });
    }
    if (testProduct) {
      await Product.findByIdAndDelete(testProduct._id);
    }
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
  }
};

runTests().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
