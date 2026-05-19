// scripts/makeBothAdmins.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

dotenv.config();

const makeBothAdmins = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    const emails = ['zsethkipchumba179@gmail.com', 'zzsethkipchumba179@gmail.com'];
    const defaultPassword = 'Admin123!';

    const salt = await bcrypt.genSalt(14);
    const hashedPassword = await bcrypt.hash(defaultPassword, salt);

    for (const email of emails) {
      console.log(`\n🔄 Processing email: ${email}...`);
      let user = await User.findOne({ email });

      if (user) {
        console.log(`✅ User found. Promoting and setting password to default: ${defaultPassword}`);
        user.password = hashedPassword;
        user.userType = 'admin';
        user.role = 'super-admin';
        user.isVerified = true;
        user.isActive = true;
        user.loginAttempts = 0;
        user.lockUntil = undefined;
        user.twoFactorEnabled = false;
        user.twoFactorSecret = undefined;
        user.twoFactorBackupCodes = [];
        user.adminPermissions = {
          canManageUsers: true,
          canManageProducts: true,
          canManageOrders: true,
          canManageContent: true
        };

        await user.save({ validateBeforeSave: false });
        console.log(`🎉 Success! Updated ${email}`);
      } else {
        console.log(`🆕 User not found. Creating a fresh Super-Admin account for ${email}...`);
        await User.create({
          firstName: 'Seth',
          lastName: 'Kipchumba',
          email,
          password: defaultPassword, // Trigger Mongoose pre-save password hook, which hashes it automatically
          phone: '+254700000000',
          userType: 'admin',
          role: 'super-admin',
          isVerified: true,
          isActive: true,
          twoFactorEnabled: false,
          adminPermissions: {
            canManageUsers: true,
            canManageProducts: true,
            canManageOrders: true,
            canManageContent: true
          }
        });
        console.log(`🎉 Success! Created fresh Super-Admin: ${email}`);
      }
    }

    await mongoose.disconnect();
    console.log('\n🔌 MongoDB disconnected');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up admins:', error);
    process.exit(1);
  }
};

makeBothAdmins();
