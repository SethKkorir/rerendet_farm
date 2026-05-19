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
      family: 4, // Force IPv4 to fix SRV ECONNREFUSED issues on some networks
    });

    console.log(`[OK] MongoDB Connected: ${conn.connection.host}`);

    // Register DB Connection Loss Event Listeners for Alerts
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ Mongoose connection lost!');
      import('../utils/securityAlerts.js').then(({ dispatchSecurityAlert }) => {
        dispatchSecurityAlert({
          eventTitle: 'Database Connection Lost',
          eventDescription: 'The Mongoose client has disconnected from the MongoDB host cluster. Any incoming read/write transactions will fail or timeout.',
          severity: 'CRITICAL'
        });
      }).catch(e => console.error('Alert error:', e));
    });

    mongoose.connection.on('error', (err) => {
      console.error('⚠️ Mongoose connection error:', err.message);
      import('../utils/securityAlerts.js').then(({ dispatchSecurityAlert }) => {
        dispatchSecurityAlert({
          eventTitle: 'Database Connection Error',
          eventDescription: `The Mongoose client has encountered a connection error: ${err.message}`,
          severity: 'CRITICAL',
          metadata: { 'Error Message': err.message }
        });
      }).catch(e => console.error('Alert error:', e));
    });

  } catch (err) {
    console.error('\n❌❌❌ [CRITICAL DATABASE ERROR] ❌❌❌');
    console.error('Initial DB Connection failed:', err.message);
    console.error('If you are seeing an IP whitelist error, make sure your current public IP is whitelisted in your MongoDB Atlas dashboard.');
    console.error('-------------------------------------------\n');
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

export default connectDB;