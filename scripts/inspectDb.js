// scripts/inspectDb.js
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import User from '../models/User.js';
import Invoice from '../models/Invoice.js';
import PaymentTransaction from '../models/PaymentTransaction.js';
import AbandonedCheckout from '../models/AbandonedCheckout.js';
import AdminAlert from '../models/AdminAlert.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function inspect() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const orderCount = await Order.countDocuments();
    const productCount = await Product.countDocuments();
    const categoryCount = await Category.countDocuments();
    const userCount = await User.countDocuments();
    const invoiceCount = await Invoice.countDocuments();
    const txnCount = await PaymentTransaction.countDocuments();
    const acCount = await AbandonedCheckout.countDocuments();
    const alertCount = await AdminAlert.countDocuments();

    console.log(`📊 DB Summary:`);
    console.log(`   Orders: ${orderCount}`);
    console.log(`   Products: ${productCount}`);
    console.log(`   Categories: ${categoryCount}`);
    console.log(`   Users: ${userCount}`);
    console.log(`   Invoices: ${invoiceCount}`);
    console.log(`   PaymentTransactions: ${txnCount}`);
    console.log(`   AbandonedCheckouts: ${acCount}`);
    console.log(`   AdminAlerts: ${alertCount}`);

    const products = await Product.find({}).select('name price inventory isFeatured isActive category');
    console.log(`\n📦 Current Products (${products.length}):`);
    products.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.name} | KES ${p.price} | Stock: ${p.inventory?.stock ?? 'N/A'} | Active: ${p.isActive}`);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error inspecting DB:', err.message);
    process.exit(1);
  }
}

inspect();
