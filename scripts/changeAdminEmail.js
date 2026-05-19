// scripts/changeAdminEmail.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const changeAdminEmail = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    const oldEmail = 'admin@rerendetcoffee.com';
    const newEmail = 'zsethkipchumba179@gmail.com';

    // 1. Check if the target new email already exists
    const existingTargetUser = await User.findOne({ email: newEmail });

    if (existingTargetUser) {
      console.log(`💡 Target user with email: ${newEmail} already exists!`);
      console.log('🔄 Promoting this existing user to Super-Admin role...');
      
      existingTargetUser.userType = 'admin';
      existingTargetUser.role = 'super-admin';
      existingTargetUser.isVerified = true;
      existingTargetUser.isActive = true;
      
      // Temporarily disable 2FA to prevent immediate lockouts, allowing user to log in and set up fresh 2FA
      existingTargetUser.twoFactorEnabled = false;
      existingTargetUser.twoFactorSecret = undefined;
      existingTargetUser.twoFactorBackupCodes = [];

      existingTargetUser.adminPermissions = {
        canManageUsers: true,
        canManageProducts: true,
        canManageOrders: true,
        canManageContent: true
      };

      await existingTargetUser.save({ validateBeforeSave: false });
      console.log(`🎉 User ${newEmail} successfully promoted to Super-Admin!`);

      // 2. Delete the old default admin to avoid conflict/spam
      console.log(`🗑️  Removing the old default placeholder admin: ${oldEmail}...`);
      await User.deleteOne({ email: oldEmail });
      console.log('✅ Old default admin removed.');
    } else {
      // If the target new email does NOT exist, find the old default admin and rename it
      const adminUser = await User.findOne({ email: oldEmail });
      if (adminUser) {
        console.log(`🔄 Renaming old default admin ${oldEmail} to ${newEmail}...`);
        adminUser.email = newEmail;
        adminUser.isVerified = true;
        adminUser.isActive = true;
        adminUser.role = 'super-admin';
        adminUser.userType = 'admin';
        adminUser.twoFactorEnabled = false;
        adminUser.twoFactorSecret = undefined;
        adminUser.twoFactorBackupCodes = [];

        await adminUser.save({ validateBeforeSave: false });
        console.log(`🎉 Success! Admin email updated to: ${newEmail}`);
      } else {
        console.log(`🆕 Creating fresh Super Admin user with email ${newEmail}...`);
        await User.create({
          firstName: 'Seth',
          lastName: 'Kipchumba',
          email: newEmail,
          password: 'Admin123!',
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
        console.log(`🎉 Success! New Super Admin created.`);
      }
    }

    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating admin email:', error);
    process.exit(1);
  }
};

changeAdminEmail();
