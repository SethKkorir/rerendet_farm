// scripts/resetSethPassword.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

dotenv.config();

const resetSethPassword = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    const email = 'zsethkipchumba179@gmail.com';
    const newPassword = 'Admin123!';

    console.log(`🔄 Finding user ${email}...`);
    const user = await User.findOne({ email });

    if (user) {
      console.log('✅ User found. Resetting password to default: Admin123!');
      
      // Hash password using bcryptjs to match pre-save behavior
      const salt = await bcrypt.genSalt(14); // Use salt rounds 14 from our hardened standard
      user.password = await bcrypt.hash(newPassword, salt);
      
      // Ensure role & userType are correct
      user.userType = 'admin';
      user.role = 'super-admin';
      user.isVerified = true;
      user.isActive = true;
      user.loginAttempts = 0;
      user.lockUntil = undefined;
      
      // Reset 2FA to prevent immediately locking them out
      user.twoFactorEnabled = false;
      user.twoFactorSecret = undefined;
      user.twoFactorBackupCodes = [];

      await user.save({ validateBeforeSave: false });
      console.log(`🎉 Password for ${email} successfully reset to default: Admin123!`);
      console.log('💡 You can now log in using these credentials.');
    } else {
      console.log(`❌ User with email ${email} not found.`);
    }

    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting password:', error);
    process.exit(1);
  }
};

resetSethPassword();
