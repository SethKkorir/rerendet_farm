// scripts/checkUserEmails.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const checkUserEmails = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    console.log('🔍 Searching all user accounts in database...');
    const users = await User.find({}).select('email role userType');

    console.log('\n--- Accounts List ---');
    users.forEach((u, i) => {
      console.log(`[${i + 1}] Email: "${u.email}" | Role: "${u.role}" | UserType: "${u.userType}"`);
    });
    console.log('---------------------\n');

    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking emails:', error);
    process.exit(1);
  }
};

checkUserEmails();
