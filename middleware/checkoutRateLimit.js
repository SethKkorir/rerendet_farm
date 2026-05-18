// middleware/checkoutRateLimit.js
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisClient, isRedisConnected } from '../config/redis.js';

const isProd = process.env.NODE_ENV === 'production';
const useRedis = redisClient && (isRedisConnected || isProd);

let checkoutStore;
let paymentStore;

if (useRedis) {
  console.log('🛡️  Rate limiter: Using RedisStore');
  checkoutStore = new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
    prefix: 'rl:checkout:',
  });
  paymentStore = new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
    prefix: 'rl:payment:',
  });
} else {
  console.warn('⚠️  Rate limiter: Falling back to MemoryStore (Allowed in development only)');
}

// Rate limiter specifically for checkout endpoints
// Prevents rapid checkout attempts and potential fraud
export const checkoutLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each user to 5 checkout attempts per window
    store: checkoutStore, // Will be undefined if using MemoryStore fallback
    message: {
        success: false,
        message: 'Too many checkout attempts. Please try again in 15 minutes.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers

    // Use user ID if authenticated, otherwise use IP
    keyGenerator: (req) => {
        return req.user?._id?.toString() || req.ip;
    },

    // Custom handler for when limit is exceeded
    handler: (req, res) => {
        console.warn(`⚠️ Rate limit exceeded for checkout: ${req.user?._id || req.ip}`);
        res.status(429).json({
            success: false,
            message: 'Too many checkout attempts from this account. Please wait 15 minutes and try again.',
            retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000 / 60)
        });
    },

    // Skip rate limiting for successful requests to avoid penalizing legitimate users
    skip: (req) => {
        // Skip if in development mode
        return process.env.NODE_ENV === 'development' && !useRedis;
    }
});

// Stricter rate limit for payment processing
export const paymentLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 3, // Only 3 payment attempts per window
    store: paymentStore, // Will be undefined if using MemoryStore fallback
    message: {
        success: false,
        message: 'Too many payment attempts. Please contact support if you need assistance.'
    },
    keyGenerator: (req) => {
        return req.user?._id?.toString() || req.ip;
    }
});

export default { checkoutLimiter, paymentLimiter };
