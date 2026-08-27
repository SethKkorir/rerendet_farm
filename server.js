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
import 'dotenv/config';
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
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import addressRoutes from './routes/addressRoutes.js';
import paymentMethodRoutes from './routes/paymentMethodRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import maintenanceMode from './middleware/maintenanceMiddleware.js';

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
const CRITICAL_ENV = ['MONGO_URI', 'JWT_SECRET', 'FRONTEND_URL'];
const missingEnv = CRITICAL_ENV.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
  console.warn(`⚠️  WARNING: Missing critical environment variables: ${missingEnv.join(', ')}`);
  console.warn('   The app will attempt to start, but some features may not work correctly.');
}

const validEnvs = ['development', 'staging', 'production'];
if (!process.env.NODE_ENV || !validEnvs.includes(process.env.NODE_ENV)) {
  throw new Error("NODE_ENV must be set to development, staging, or production");
}

const rawPort = process.env.PORT;
const parsedPort = parseInt(rawPort, 10);
if (!rawPort || isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535 || parsedPort.toString() !== rawPort.trim()) {
  throw new Error("PORT must be a valid port number");
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

// CSP Override Middleware for Admin Pages (Layer 8)
app.use((req, res, next) => {
  const adminSegment = process.env.ADMIN_PATH_SEGMENT || 'admin';
  const path = req.path.toLowerCase();
  
  if (path.startsWith('/admin') || (adminSegment && path.includes(adminSegment.toLowerCase()))) {
    const originalSetHeader = res.setHeader;
    res.setHeader = function (name, value) {
      const lowerName = name.toLowerCase();
      if (
        lowerName === 'content-security-policy' ||
        lowerName === 'x-frame-options' ||
        lowerName === 'x-content-type-options' ||
        lowerName === 'referrer-policy' ||
        lowerName === 'permissions-policy' ||
        lowerName === 'cache-control'
      ) {
        return this;
      }
      return originalSetHeader.apply(this, arguments);
    };
    
    originalSetHeader.call(res, 'Content-Security-Policy', 
      `default-src 'self'; ` +
      `script-src 'self'; ` +
      `style-src 'self' 'unsafe-inline'; ` +
      `img-src 'self' data: https://res.cloudinary.com; ` +
      `connect-src 'self' ${process.env.VITE_API_URL || ''}; ` +
      `font-src 'self'; ` +
      `frame-ancestors 'none'; ` +
      `form-action 'self'; ` +
      `base-uri 'self';`
    );
    originalSetHeader.call(res, 'X-Frame-Options', 'DENY');
    originalSetHeader.call(res, 'X-Content-Type-Options', 'nosniff');
    originalSetHeader.call(res, 'Referrer-Policy', 'no-referrer');
    originalSetHeader.call(res, 'Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    originalSetHeader.call(res, 'Cache-Control', 'no-store, no-cache, must-revalidate');
  }
  next();
});

// Old path interceptor (Layer 3)
app.use((req, res, next) => {
  const forbiddenPaths = [
    '/admin/login',
    '/admin',
    '/admin/dashboard',
    '/wp-admin'
  ];
  const normalizedPath = req.path.replace(/\/+$/, '');
  if (forbiddenPaths.includes(normalizedPath)) {
    res.status(404);
    return next(new Error(`Not Found - ${req.originalUrl}`));
  }
  next();
});

// ================= SECURITY =================

// Helmet - enterprise-grade security headers

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

// ================= DB CONNECTION GUARANTEE =================
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('❌ Database connection middleware error:', err.message);
    res.status(500).json({ success: false, message: 'Database connection error' });
  }
});

// ================= ROUTES =================
app.use(maintenanceMode); // Must be before routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
import customerRoutes from './routes/customerRoutes.js';
app.use('/api/customer', customerRoutes);
import adminReportingRoutes from './routes/adminReportingRoutes.js';
import adminControlsRoutes from './routes/adminControlsRoutes.js';
import adminAlertRoutes from './routes/adminAlertRoutes.js';
import adminSessionRoutes from './routes/adminSessionRoutes.js';
import adminAuditRoutes from './routes/adminAuditRoutes.js';
app.use('/api/admin/reports', adminReportingRoutes);
app.use('/api/admin/controls', adminControlsRoutes);
app.use('/api/admin/alerts', adminAlertRoutes);
app.use('/api/admin/sessions', adminSessionRoutes);
app.use('/api/admin/audit-log', adminAuditRoutes);
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
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/payment-methods', paymentMethodRoutes);

// ================= PUBLIC DELIVERY RATES =================
app.get('/api/delivery-rates', async (req, res) => {
  try {
    const Settings = (await import('./models/Settings.js')).default;
    const settings = await Settings.getSettings();
    res.json({
      success: true,
      data: settings.deliveryRates || []
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ================= HEALTH =================
app.get('/api/health', async (req, res) => {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date(),
    services: {
      mongodb: { status: 'healthy', latencyMs: 0 },
      redis: { status: 'healthy', latencyMs: 0 },
      queues: { status: 'healthy', latencyMs: 0 },
      cloudinary: { status: 'healthy', latencyMs: 0 }
    }
  };

  let hasError = false;

  // 1. MongoDB check
  const mongoStart = Date.now();
  try {
    const mongoose = (await import('mongoose')).default;
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.admin().ping();
      healthStatus.services.mongodb.latencyMs = Date.now() - mongoStart;
    } else {
      throw new Error(`Connection status is ${mongoose.connection.readyState}`);
    }
  } catch (err) {
    hasError = true;
    healthStatus.services.mongodb.status = 'unhealthy';
    healthStatus.services.mongodb.error = err.message;
  }

  // 2. Redis check
  const redisStart = Date.now();
  try {
    const { redisClient, isRedisConnected } = await import('./lib/redis.js');
    if (redisClient && isRedisConnected) {
      await redisClient.ping();
      healthStatus.services.redis.latencyMs = Date.now() - redisStart;
    } else {
      throw new Error('Redis client not connected');
    }
  } catch (err) {
    hasError = true;
    healthStatus.services.redis.status = 'unhealthy';
    healthStatus.services.redis.error = err.message;
  }

  // 3. Queue check
  const queueStart = Date.now();
  try {
    const { emailQueue } = await import('./queues/index.js');
    if (emailQueue) {
      await emailQueue.getJobCounts();
      healthStatus.services.queues.latencyMs = Date.now() - queueStart;
    } else {
      throw new Error('BullMQ queues not initialized');
    }
  } catch (err) {
    hasError = true;
    healthStatus.services.queues.status = 'unhealthy';
    healthStatus.services.queues.error = err.message;
  }

  // 4. Cloudinary check
  const cloudinaryStart = Date.now();
  try {
    const cloudinary = (await import('./config/cloudinary.js')).default;
    if (cloudinary && cloudinary.config().api_key) {
      await cloudinary.api.ping();
      healthStatus.services.cloudinary.latencyMs = Date.now() - cloudinaryStart;
    } else {
      throw new Error('Cloudinary not configured');
    }
  } catch (err) {
    // Cloudinary warning but doesn't necessarily fail critical app boot
    healthStatus.services.cloudinary.status = 'unhealthy';
    healthStatus.services.cloudinary.error = err.message;
  }

  if (hasError) {
    healthStatus.status = 'unhealthy';
    return res.status(503).json(healthStatus);
  }

  res.json(healthStatus);
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
  });
}