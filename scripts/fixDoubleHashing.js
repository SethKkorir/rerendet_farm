// scripts/fixDoubleHashing.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

dotenv.config();

const fixDoubleHashing = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    const emails = ['zsethkipchumba179@gmail.com', 'zzsethkipchumba179@gmail.com'];
    const plaintextPassword = 'Admin123!';

    for (const email of emails) {
      console.log(`\n🔄 Fixing account: ${email}...`);
      
      const user = await User.findOne({ email }).select('+password');
      if (user) {
        // Set plaintext password so Mongoose pre-save hooks hash it exactly ONCE
        user.password = plaintextPassword;
        user.userType = 'admin';
        user.role = 'super-admin';
        user.isVerified = true;
        user.isActive = true;
        user.loginAttempts = 0;
        user.lockUntil = undefined;
        user.twoFactorEnabled = false;
        user.twoFactorSecret = undefined;
        user.twoFactorBackupCodes = [];
        
        await user.save({ validateBeforeSave: false });
        console.log(`✅ ${email} saved successfully!`);

        // Test the password comparison immediately to be 1000% sure it works
        const testUser = await User.findOne({ email }).select('+password');
        const isMatch = await bcrypt.compare(plaintextPassword, testUser.password);
        console.log(`🔍 Verification Test for ${email}: ${isMatch ? '⭐ PASSED! (Hash matches)' : '❌ FAILED (Double hashing still occurred)'}`);
      } else {
        console.log(`❌ User ${email} not found.`);
      }
    }

    await mongoose.disconnect();
    console.log('\n🔌 MongoDB disconnected');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing double hashing:', error);
    process.exit(1);
  }
};

fixDoubleHashing();
