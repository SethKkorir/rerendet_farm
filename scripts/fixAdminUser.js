// scripts/fixAdminUser.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const fixAdminUser = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    // Find and update the existing user
    const result = await User.findOneAndUpdate(
      { email: 'zsethkipchumba179@gmail.com' },
      {
        userType: 'admin',
        role: 'super-admin',
        isVerified: true,
        isActive: true,
        adminPermissions: {
          canManageUsers: true,
          canManageProducts: true,
          canManageOrders: true,
          canManageContent: true
        }
      },
      { new: true }
    );

    if (result) {
      console.log('✅ Admin user updated successfully!');
      console.log('📧 Email:', result.email);
      console.log('👤 User Type:', result.userType);
      console.log('🎯 Role:', result.role);
    } else {
      console.log('❌ No user found to update');
    }

    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected');
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

fixAdminUser();