import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  throw new Error('Please define the MONGO_URI environment variable inside .env');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: true,
    };

    mongoose.set('strictQuery', false);
    cached.promise = mongoose.connect(MONGO_URI, opts).then(async (mongooseInstance) => {
      console.log('✅ MongoDB Connected (cached)');
      try {
        const Category = (await import('../models/Category.js')).default;
        await Category.seedCategories();
      } catch (err) {
        console.error('Failed to seed categories:', err);
      }
      try {
        await mongooseInstance.connection.syncIndexes();
        console.log('[DB] All model indexes synchronized');
      } catch (err) {
        console.warn('[DB] Index sync failed: ' + err.message);
      }
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
