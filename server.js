console.log("🏁 server.js execution started AT TOP");
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import cookieParser from 'cookie-parser';

import connectDB from './config/db.js';

// Routes
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import adRoutes from './routes/adRoutes.js';
import blogRoutes from './routes/blogRoutes.js';
import subscriberRoutes from './routes/subscriberRoutes.js';
import marketingRoutes from './routes/marketingRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import { startCronJobs } from './utils/cronJobs.js';

dotenv.config();

const app = express();

console.log("🏁 server.js execution started");
// ================= DB =================
console.log("🔗 Connecting to MongoDB...");
connectDB();
console.log("✅ connectDB initiated");

// ================= SECURITY =================

// Helmet (keep this global — it's lightweight)
app.use(helmet());

// CORS (optimized)
const allowedOrigins = new Set([
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'https://rerendet-coffee.com',
  'https://rerendet.com',
  'https://rerendet-website-two.vercel.app',
  'https://rerendet.vercel.app',
  'https://rerendet.coffee'

]);

app.use(cors({
  origin: (origin, cb) => {
    const isDev = process.env.NODE_ENV !== 'production';
    if (
      !origin ||
      allowedOrigins.has(origin) ||
      origin.endsWith('.vercel.app') ||
      (isDev && (
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        /^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin)
      ))
    ) {
      return cb(null, true);
    }
    console.warn('❌ CORS Blocked Origin:', origin);
    cb(new Error('CORS blocked'));
  },
  credentials: true
}));

// ================= PERFORMANCE =================

// Compression (only large responses)
app.use(compression({ threshold: 1024 }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Cookies
app.use(cookieParser());

// ================= RATE LIMIT =================

// Global (light)
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500
}));

// Strict (auth only)
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 1000 : 30,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.'
  }
}));

// ================= SANITIZATION (SCOPED) =================

// Only apply to risky routes
app.use('/api/auth', mongoSanitize(), xss());
app.use('/api/orders', mongoSanitize());
app.use('/api/payments', hpp());

// ================= LOGGER (DEV ONLY) =================
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      console.log(`${req.method} ${req.url} - ${Date.now() - start}ms`);
    });
    next();
  });
}

// ================= ROUTES =================
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/promotions', adRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/subscribers', subscriberRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/cart', cartRoutes);

// ================= HEALTH =================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    db: 'connected'
  });
});

// ================= ERROR =================
app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

// ================= START =================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  // Boot up automated system-wide background jobs (Cleanups, Fraud scans, Payment Reconciliations)
  startCronJobs();
});