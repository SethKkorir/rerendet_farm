// scripts/migrateGapsStock.js - CONVERT OLD INVENTORY SCHEMA TO MULTI-STOCK SCHEMAS
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';
import User from '../models/User.js';

dotenv.config();

const migrate = async () => {
  try {
    console.log('🔗 Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    // 1. Product migrations
    const products = await Product.find({});
    console.log(`📋 Scanning ${products.length} products...`);

    let productsUpdated = 0;
    for (const prod of products) {
      let changed = false;

      // Handle legacy "stock" field mapping to physicalStock
      if (prod.inventory && typeof prod.inventory.physicalStock === 'undefined') {
        const legacyStock = prod.inventory.stock ?? 0;
        prod.inventory.physicalStock = legacyStock;
        prod.inventory.reservedStock = 0;
        prod.inventory.lowStockThreshold = prod.inventory.lowStockAlert || 5;
        changed = true;
      }

      if (changed) {
        // Save using direct driver updates to bypass strict schema validation checks if needed
        await Product.updateOne(
          { _id: prod._id },
          {
            $set: {
              'inventory.physicalStock': prod.inventory.physicalStock,
              'inventory.reservedStock': prod.inventory.reservedStock,
              'inventory.lowStockThreshold': prod.inventory.lowStockThreshold
            }
          }
        );
        productsUpdated++;
      }
    }
    console.log(`🎉 Product Migration complete. Updated ${productsUpdated} products.`);

    // 2. User admin role migration
    const superAdminEmail = process.env.DEV_EMAIL || 'kipzseth@gmail.com';
    console.log(`🔑 Granting super_admin role to developer account: ${superAdminEmail}...`);

    const devUser = await User.findOne({ email: superAdminEmail });
    if (devUser) {
      devUser.role = 'super_admin';
      await devUser.save();
      console.log(`⚡ Dev account ${superAdminEmail} successfully promoted to super_admin.`);
    } else {
      console.warn(`⚠️ Developer account ${superAdminEmail} was not found. Please register it first.`);
    }

    // Convert old "admin" role to "owner"
    const ownerMigrateCount = await User.updateMany(
      { role: 'admin' },
      { $set: { role: 'owner' } }
    );
    console.log(`🎉 Migrated ${ownerMigrateCount.modifiedCount} legacy admins to owners.`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
};

migrate();
