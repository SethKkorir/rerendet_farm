#!/usr/bin/env node
/**
 * scripts/breakGlassEmergency.js
 * 
 * BREAK-GLASS EMERGENCY ACCESS TOOL
 * ---------------------------------
 * Standalone direct MongoDB maintenance & emergency inspection tool.
 * Usable when application server / REST API is unreachable, provided DB is accessible.
 * 
 * Usage:
 *   node scripts/breakGlassEmergency.js status
 *   node scripts/breakGlassEmergency.js maintenance <on|off>
 *   node scripts/breakGlassEmergency.js reconcile
 *   node scripts/breakGlassEmergency.js dump-orders
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import process from 'process';

dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ FATAL: Neither MONGO_URI nor MONGODB_URI environment variable is defined in .env');
  process.exit(1);
}

const args = process.argv.slice(2);
const command = args[0] || 'status';

const runBreakGlass = async () => {
  try {
    console.log('🚨 [BREAK-GLASS CLI] Connecting directly to MongoDB database...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to database successfully.');

    // Import models
    const Order = (await import('../models/Order.js')).default;
    const Settings = (await import('../models/Settings.js')).default;
    const PaymentTransaction = (await import('../models/PaymentTransaction.js')).default;

    if (command === 'status') {
      console.log('\n===== 📊 EMERGENCY SYSTEM STATUS =====');
      const pendingOrders = await Order.countDocuments({ paymentStatus: 'pending' });
      const paidOrders = await Order.countDocuments({ paymentStatus: 'paid' });
      const totalOrders = await Order.countDocuments();
      const settings = await Settings.findOne();
      const maintenanceMode = settings?.maintenance?.enabled ? '🚨 ACTIVE (STORE CLOSED)' : '🟢 INACTIVE (STORE OPEN)';

      console.log(`• Store Maintenance Mode: ${maintenanceMode}`);
      console.log(`• Total Orders in Ledger: ${totalOrders}`);
      console.log(`• Paid Orders:             ${paidOrders}`);
      console.log(`• Stale Pending Orders:    ${pendingOrders}`);

      const recentPending = await Order.find({ paymentStatus: 'pending' }).sort({ createdAt: -1 }).limit(5).select('orderNumber total paymentMethod createdAt');
      if (recentPending.length > 0) {
        console.log('\n--- Recent Pending Orders ---');
        recentPending.forEach(o => {
          console.log(`  [${o.orderNumber}] ${o.paymentMethod} - KES ${o.total} (${new Date(o.createdAt).toLocaleTimeString()})`);
        });
      }
    } else if (command === 'maintenance') {
      const mode = args[1];
      if (!['on', 'off'].includes(mode)) {
        console.error('❌ Invalid mode. Use: node scripts/breakGlassEmergency.js maintenance <on|off>');
        process.exit(1);
      }
      const enable = mode === 'on';
      await Settings.findOneAndUpdate({}, { $set: { 'maintenance.enabled': enable, 'maintenance.message': 'Store under emergency maintenance. Check back shortly.' } }, { upsert: true });
      console.log(`✅ Maintenance mode has been updated to: ${enable ? 'ENABLED (ON)' : 'DISABLED (OFF)'}`);
    } else if (command === 'reconcile') {
      console.log('🔄 Executing emergency payment reconciliation run...');
      const { runPaymentReconciliation } = await import('./reconcilePayments.js');
      await runPaymentReconciliation();
      console.log('✅ Emergency reconciliation run complete.');
    } else if (command === 'dump-orders') {
      console.log('📄 Exporting recent paid orders dump...');
      const paidOrders = await Order.find({ paymentStatus: 'paid' }).sort({ createdAt: -1 }).limit(100).lean();
      console.log(JSON.stringify(paidOrders, null, 2));
    } else {
      console.log(`Unknown command '${command}'. Options: status, maintenance <on|off>, reconcile, dump-orders`);
    }

    await mongoose.disconnect();
    console.log('\n👋 Disconnected from database. Break-glass run complete.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Break-glass execution failed:', err.message);
    process.exit(1);
  }
};

runBreakGlass();
