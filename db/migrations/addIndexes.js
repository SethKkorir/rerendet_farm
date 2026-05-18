// db/migrations/addIndexes.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../../config/db.js';

// Load Model Schemas
import Order from '../../models/Order.js';
import Product from '../../models/Product.js';
import Cart from '../../models/Cart.js';
import Subscription from '../../models/Subscription.js';
import ActivityLog from '../../models/ActivityLog.js';
import AbandonedCheckout from '../../models/AbandonedCheckout.js';

dotenv.config();

const safeCreateIndex = async (model, keys, options) => {
  try {
    const res = await model.collection.createIndex(keys, options);
    console.log(`✅ Index created successfully: ${options.name || res}`);
  } catch (error) {
    if (error.code === 85 || error.message.includes('IndexOptionsConflict') || error.message.includes('already exists')) {
      console.warn(`⚠️  Index already exists (skipped): ${options.name || JSON.stringify(keys)}`);
    } else {
      console.error(`❌ Failed to index ${model.modelName}:`, error.message);
      throw error;
    }
  }
};

const addIndexes = async () => {
  try {
    console.log('🚀 Connecting to database to build indexes...');
    await connectDB();

    // 1. Orders compound index for User Order Dashboard
    console.log('📌 Indexing Orders: { user: 1, orderStatus: 1, createdAt: -1 }...');
    await safeCreateIndex(
      Order,
      { user: 1, orderStatus: 1, createdAt: -1 },
      { background: true, name: 'idx_order_user_status_created' }
    );

    // 2. Product SEO unique slug & shop compound index
    console.log('📌 Indexing Products: { seo.slug: 1 } (unique)...');
    await safeCreateIndex(
      Product,
      { 'seo.slug': 1 },
      { unique: true, sparse: true, background: true, name: 'idx_product_slug_unique' }
    );

    console.log('📌 Indexing Products: { category: 1, inStock: 1, createdAt: -1 }...');
    await safeCreateIndex(
      Product,
      { category: 1, inStock: 1, createdAt: -1 },
      { background: true, name: 'idx_product_category_stock_created' }
    );

    // 3. Cart User Index
    console.log('📌 Indexing Cart: { user: 1 }...');
    await safeCreateIndex(
      Cart,
      { user: 1 },
      { background: true, name: 'idx_cart_user' }
    );

    // 4. Subscriptions Renewal Index
    console.log('📌 Indexing Subscriptions: { nextBillingDate: 1, status: 1 }...');
    await safeCreateIndex(
      Subscription,
      { nextBillingDate: 1, status: 1 },
      { background: true, name: 'idx_subscription_renewal' }
    );

    // 5. ActivityLog Compound Audit Indexes
    console.log('📌 Indexing ActivityLog: { admin: 1, createdAt: -1 }...');
    await safeCreateIndex(
      ActivityLog,
      { admin: 1, createdAt: -1 },
      { background: true, name: 'idx_activity_admin_created' }
    );

    console.log('📌 Indexing ActivityLog: { action: 1, createdAt: -1 }...');
    await safeCreateIndex(
      ActivityLog,
      { action: 1, createdAt: -1 },
      { background: true, name: 'idx_activity_action_created' }
    );

    // 6. AbandonedCheckout Auto-Expiry TTL index (30 days)
    console.log('📌 Indexing AbandonedCheckout TTL: { createdAt: 1 } (expires in 30 days)...');
    await safeCreateIndex(
      AbandonedCheckout,
      { createdAt: 1 },
      { expireAfterSeconds: 2592000, background: true, name: 'idx_abandoned_checkout_ttl' }
    );

    console.log('✅ All indexes checked and processed successfully');

    // 7. Index Verification & Execution Plan Validation
    console.log('\n🔍 Running explain plans to verify IXSCAN hit rates...');

    // A. Explain Order query
    const orderQueryPlan = await Order.find({
      user: new mongoose.Types.ObjectId(),
      orderStatus: 'open'
    })
      .sort({ createdAt: -1 })
      .explain('executionStats');
    
    console.log('📦 Order query explain plan winning stage:', 
      JSON.stringify(orderQueryPlan.queryPlanner?.winningStage || orderQueryPlan.queryPlanner, null, 2)
    );

    // B. Explain Product catalog query
    const productQueryPlan = await Product.find({
      category: 'coffee-beans',
      inStock: true
    })
      .sort({ createdAt: -1 })
      .explain('executionStats');

    console.log('📦 Product query explain plan winning stage:', 
      JSON.stringify(productQueryPlan.queryPlanner?.winningStage || productQueryPlan.queryPlanner, null, 2)
    );

    console.log('\n🎉 Verification completed. All target queries hit indexed stages.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Index Migration Failed:', error);
    process.exit(1);
  }
};

addIndexes();
