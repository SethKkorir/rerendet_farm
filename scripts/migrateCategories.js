import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import connectDB from '../lib/mongodb.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';

/**
 * One-time idempotent migration script.
 * Converts legacy string `category` fields on Product documents
 * to proper `categoryId` ObjectId references.
 *
 * Safe to run multiple times — already-migrated products are skipped.
 */
const migrateCategories = async () => {
  console.log('🚀 Category migration starting...\n');

  try {
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // Use the raw driver to find products where `category` is still a string field
    const cursor = Product.collection.find({ category: { $type: 'string' } });
    const productsToMigrate = await cursor.toArray();

    let migrated = 0;
    let skipped = 0;
    let failed = 0;

    console.log(`📦 Found ${productsToMigrate.length} product(s) with string category field\n`);

    for (const doc of productsToMigrate) {
      try {
        // If the product already has a valid categoryId, skip it
        if (doc.categoryId) {
          console.log(`⏭️  SKIP: "${doc.name}" — already has categoryId (${doc.categoryId})`);
          skipped++;
          continue;
        }

        const categoryName = doc.category.trim();
        if (!categoryName) {
          console.log(`⏭️  SKIP: "${doc.name}" — empty category string`);
          skipped++;
          continue;
        }

        // Look up existing category (case-insensitive) or create one
        let category = await Category.findOne({
          name: { $regex: new RegExp(`^${categoryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        });

        if (!category) {
          console.log(`   🆕  Creating new category: "${categoryName}"`);
          category = await Category.create({ name: categoryName });
        }

        // Atomic update: set categoryId, unset legacy string category
        await Product.collection.updateOne(
          { _id: doc._id },
          {
            $set: { categoryId: category._id },
            $unset: { category: '' }
          }
        );

        console.log(`✅ MIGRATED: "${doc.name}" → category "${category.name}" (${category._id})`);
        migrated++;
      } catch (err) {
        console.error(`❌ FAILED: "${doc.name}" — ${err.message}`);
        failed++;
      }
    }

    console.log('\n══════════════════════════════════════');
    console.log('  MIGRATION SUMMARY');
    console.log('══════════════════════════════════════');
    console.log(`  Migrated : ${migrated}`);
    console.log(`  Skipped  : ${skipped}`);
    console.log(`  Failed   : ${failed}`);
    console.log(`  Total    : ${productsToMigrate.length}`);
    console.log('══════════════════════════════════════\n');

    if (failed > 0) {
      console.warn('⚠️  Some products failed to migrate. Review the errors above.');
    } else {
      console.log('🎉 Migration complete — all products processed successfully!');
    }
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

migrateCategories();
