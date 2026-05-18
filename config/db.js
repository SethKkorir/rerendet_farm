// config/db.js
import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    console.log('[OK] Using existing DB connection');
    return;
  }

  try {
    mongoose.set('strictQuery', false);
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 20, // reduced (50 is overkill unless massive traffic)
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`[OK] MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('[ERROR] DB Connection failed:', err.message);
    process.exit(1);
  }
};

export default connectDB;