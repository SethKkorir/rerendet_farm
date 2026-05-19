// scripts/createAdmin.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const createAdmin = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    // Check if admin already exists
    const adminExists = await User.findOne({ email: 'zsethkipchumba179@gmail.com' });
    
    if (adminExists) {
      console.log('✅ Admin user already exists');
      console.log('📧 Email:', adminExists.email);
      console.log('👤 User Type:', adminExists.userType);
      console.log('🎯 Role:', adminExists.role);
    } else {
      // Create admin user
      const adminUser = await User.create({
        firstName: 'Seth',
        lastName: 'Kipchumba',
        email: 'zsethkipchumba179@gmail.com',
        password: 'Admin123!', // You'll need to change this after first login
        phone: '+254700000000',
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
      });
      
      console.log('✅ Default admin user created successfully!');
      console.log('📧 Email: zsethkipchumba179@gmail.com');
      console.log('🔑 Password: Admin123!');
      console.log('👤 User Type: admin');
      console.log('🎯 Role: super-admin');
      console.log('⚠️  Please change the password after first login!');
    }
    
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
};

createAdmin();