console.log("🏁 server.js execution started AT TOP");
import * as Sentry from '@sentry/node';

// Gracefully load Sentry CPU Profiling bindings (Node v25 Windows compatibility fallback)
let nodeProfilingIntegration;
try {
  // Removed top-level await for @sentry/profiling-node as it hangs on Node 24+ on Windows
  // console.warn('⚠️  [Sentry] CPU Profiler bindings disabled for local dev to prevent hanging.');
} catch (profilingErr) {
  console.warn('⚠️  [Sentry] CPU Profiler bindings not found for this platform. Profiling disabled.');
}
import pinoHttp from 'pino-http';
import logger from './config/logger.js';
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
import csrfGuard from './middleware/csrfGuardMiddleware.js';

// Routes
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import cronRoutes from './routes/cronRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import adRoutes from './routes/adRoutes.js';
import blogRoutes from './routes/blogRoutes.js';
import subscriberRoutes from './routes/subscriberRoutes.js';
import marketingRoutes from './routes/marketingRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import { startCronJobs } from './utils/cronJobs.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import maintenanceMode from './middleware/maintenanceMiddleware.js';
import { startEmailWorker } from './workers/emailWorker.js';
import { startSubscriptionWorker } from './workers/subscriptionWorker.js';
import { startRetryWorker } from './workers/retryWorker.js';
import { redisClient, isRedisConnected } from './config/redis.js';

dotenv.config();

// Initialize Sentry before any other middleware or routes
if (process.env.SENTRY_DSN) {
  console.log('🛡️  [Sentry] Initializing Sentry monitoring...');
  const integrations = [];
  if (nodeProfilingIntegration) {
    integrations.push(nodeProfilingIntegration());
  }
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations,
    tracesSampleRate: 1.0,
    profilesSampleRate: nodeProfilingIntegration ? 1.0 : undefined,
  });
} else {
  console.warn('⚠️  Sentry DSN not found. Monitoring disabled.');
}

// Validate critical environment variables at startup
const REQUIRED_ENV = ['MONGO_URI', 'JWT_SECRET'];
const missing = REQUIRED_ENV.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error(`❌ FATAL: Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}
if (!process.env.JWT_REFRESH_SECRET) {
  console.warn('⚠️  JWT_REFRESH_SECRET not set. Using fallback (UNSAFE for production).');
}
if (!process.env.ENCRYPTION_KEY) {
  console.warn('⚠️  ENCRYPTION_KEY not set. Phone/wallet data encryption will use insecure fallback.');
}

const app = express();

// Trust Vercel's proxy headers for accurate client IP rate-limiting
app.set('trust proxy', 1);

// Register pino-http logger as the first global middleware
const httpLogger = pinoHttp({ logger });
app.use(httpLogger);

console.log("🏁 server.js execution started");
// ================= DB =================
console.log("🔗 Connecting to MongoDB...");
connectDB();
console.log("✅ connectDB initiated");

// ================= SECURITY =================

// Helmet - enterprise-grade security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://apis.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      connectSrc: ["'self'", "https://api.github.com", "https://api.haveibeenpwned.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameAncestors: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny'
  }
}));

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
  'https://rerendet.coffee',
  'https://rerendet-farm.vercel.app'
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

// Webhooks router registered BEFORE global body parsers to preserve raw stream for Stripe signature validation
app.use('/api/webhooks', webhookRoutes);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Cookies
app.use(cookieParser());

// ================= RATE LIMIT =================

// Global (light)
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  handler: (req, res, next, options) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    import('./utils/securityAlerts.js').then(({ dispatchSecurityAlert }) => {
      dispatchSecurityAlert({
        eventTitle: 'Global Rate Limit Blocked IP',
        eventDescription: `An IP address has exceeded the global limit of 500 requests in 15 minutes. Potential DDoS or automated scraping attempt.`,
        ipAddress: ip,
        severity: 'WARNING',
        metadata: { 'Target Path': req.originalUrl }
      });
    }).catch(e => console.error(e));
    res.status(429).json({ success: false, message: 'Too many requests. Please try again in 15 minutes.' });
  }
}));

// Strict (auth only)
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 1000 : 30,
  handler: (req, res, next, options) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    import('./utils/securityAlerts.js').then(({ dispatchSecurityAlert }) => {
      dispatchSecurityAlert({
        eventTitle: 'Auth Rate Limit Blocked IP',
        eventDescription: `An IP address has exceeded authentication request thresholds. Possible credential stuffing or brute force endpoint attack.`,
        ipAddress: ip,
        severity: 'WARNING',
        metadata: { 'Target Path': req.originalUrl }
      });
    }).catch(e => console.error(e));
    res.status(429).json({ success: false, message: 'Too many authentication attempts. Please try again in 15 minutes.' });
  }
}));

// ================= SANITIZATION (SCOPED) =================

// Only apply to risky routes
app.use('/api/auth', mongoSanitize(), xss());
app.use('/api/orders', mongoSanitize());
app.use('/api/payments', hpp());

// ================= HARDWARE RESOURCE SATURATION MONITOR =================
let lastHardwareCheck = 0;
app.use((req, res, next) => {
  const now = Date.now();
  if (now - lastHardwareCheck > 5 * 60 * 1000) { // every 5 minutes
    lastHardwareCheck = now;
    import('./utils/securityAlerts.js').then(({ checkHardwareResources }) => {
      checkHardwareResources(req);
    }).catch(e => console.error('Hardware monitor check error:', e));
  }
  next();
});

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

// ================= ANTI-CSRF SHIELD =================
app.use(csrfGuard);

// ================= ROUTES =================
app.use(maintenanceMode); // Must be before routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/promotions', adRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/subscribers', subscriberRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ================= HEALTH =================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    db: 'connected'
  });
});

// ================= ERROR =================
app.use(notFound);
app.use(errorHandler);

// ================= START =================
export default app;

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    // Boot up automated system-wide background jobs (Cleanups, Fraud scans, Payment Reconciliations)
    startCronJobs();
    
    // Boot up BullMQ asynchronous workers only if Redis is active
    if (redisClient && (isRedisConnected || process.env.NODE_ENV === 'production')) {
      try {
        startEmailWorker();
        startSubscriptionWorker();
        startRetryWorker();
        console.log('✅ [BullMQ] All background workers started successfully!');
      } catch (workerErr) {
        console.error('❌ [BullMQ] Failed to start background workers:', workerErr.message);
      }
    } else {
      console.warn('⚠️  [BullMQ] Redis is offline. Asynchronous workers will not be started.');
    }
  });
}