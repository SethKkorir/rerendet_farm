// scripts/migrateOrdersPaybill.js
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Order from '../models/Order.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI environment variable is missing.');
  process.exit(1);
}

const runMigration = async () => {
  try {
    console.log('🔄 Connecting to MongoDB for orders migration...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB.');

    // 1. Backfill paymentMethod defaults for orders without paymentMethod
    const ordersWithoutMethod = await Order.find({
      $or: [
        { paymentMethod: { $exists: false } },
        { paymentMethod: null },
        { paymentMethod: '' }
      ]
    });

    console.log(`🔍 Found ${ordersWithoutMethod.length} orders missing paymentMethod.`);
    for (const order of ordersWithoutMethod) {
      order.paymentMethod = 'paybill';
      await order.save();
    }

    // 2. Ensure stockReleased field exists on all orders
    const updateStockReleasedResult = await Order.updateMany(
      { stockReleased: { $exists: false } },
      { $set: { stockReleased: false } }
    );
    console.log(`📦 Initialized stockReleased: false on ${updateStockReleasedResult.modifiedCount} orders.`);

    // 3. For any paybill orders created within the last 24h that are pending without paymentExpiresAt, backfill paymentExpiresAt
    const pendingPaybillOrders = await Order.find({
      paymentMethod: 'paybill',
      paymentStatus: 'pending',
      paymentExpiresAt: { $exists: false }
    });

    console.log(`⏳ Found ${pendingPaybillOrders.length} pending Paybill orders without paymentExpiresAt.`);
    const expiryHours = parseInt(process.env.PAYBILL_EXPIRY_HOURS, 10) || 24;
    for (const order of pendingPaybillOrders) {
      const createdTime = order.createdAt ? new Date(order.createdAt).getTime() : Date.now();
      order.paymentExpiresAt = new Date(createdTime + expiryHours * 60 * 60 * 1000);
      await order.save();
    }

    console.log('✨ Migration completed successfully! All orders are backward-compatible.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

runMigration();

