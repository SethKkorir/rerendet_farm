import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Settings from './models/Settings.js';
import connectDB from './config/db.js';

dotenv.config();

const check = async () => {
  try {
    await connectDB();
    const settings = await Settings.getSettings();
    console.log('=========================================');
    console.log('🚧 CURRENT MAINTENANCE STATUS');
    console.log('Enabled:', settings.maintenance.enabled);
    console.log('Message:', settings.maintenance.message);
    console.log('Last Toggled At:', settings.maintenance.lastToggledAt);
    console.log('Active Magic Link Raw Token:', settings.maintenance.magicLinkRaw);
    console.log('=========================================');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

check();
