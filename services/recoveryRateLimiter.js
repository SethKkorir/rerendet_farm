// services/recoveryRateLimiter.js — Multi-dimensional Recovery Rate Limiter
import redisClient from '../config/redis.js';

// In-memory sliding window counters fallback
const memoryBuckets = new Map();

// Periodic prune every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of memoryBuckets.entries()) {
    if (record.expiresAt < now) {
      memoryBuckets.delete(key);
    }
  }
}, 10 * 60 * 1000).unref();

const checkWindowLimit = async (key, maxLimit, windowSeconds) => {
  const now = Date.now();

  // Try Redis first if connected and ready
  if (redisClient && redisClient.status === 'ready') {
    try {
      const redisKey = `ratelimit:recovery:${key}`;
      const count = await redisClient.incr(redisKey);
      if (count === 1) {
        await redisClient.expire(redisKey, windowSeconds);
      }
      return {
        allowed: count <= maxLimit,
        count,
        maxLimit,
        retryAfterSeconds: count > maxLimit ? await redisClient.ttl(redisKey) : 0
      };
    } catch (e) {
      console.warn('Redis rate limiter error, using memory fallback:', e.message);
    }
  }

  // Memory fallback
  let record = memoryBuckets.get(key);
  if (!record || record.expiresAt < now) {
    record = {
      count: 1,
      expiresAt: now + windowSeconds * 1000
    };
    memoryBuckets.set(key, record);
    return { allowed: true, count: 1, maxLimit, retryAfterSeconds: 0 };
  }

  record.count += 1;
  const retryAfterSeconds = Math.max(1, Math.ceil((record.expiresAt - now) / 1000));
  return {
    allowed: record.count <= maxLimit,
    count: record.count,
    maxLimit,
    retryAfterSeconds: record.count > maxLimit ? retryAfterSeconds : 0
  };
};

/**
 * Validates initial forgot-password request limits:
 * - Max 3 requests / 15m / account
 * - Max 5 requests / 15m / IP
 * - Max 10 requests / 24h / account
 */
export const checkForgotPasswordLimits = async (normalizedEmail, ip) => {
  // 1. IP Limit: 5 per 15 minutes
  if (ip) {
    const ipRes = await checkWindowLimit(`ip_15m:${ip}`, 5, 15 * 60);
    if (!ipRes.allowed) {
      return {
        allowed: false,
        message: 'Too many recovery requests from this IP address. Please try again after 15 minutes.'
      };
    }
  }

  // 2. Account Limit: 3 per 15 minutes
  if (normalizedEmail) {
    const acc15m = await checkWindowLimit(`acc_15m:${normalizedEmail}`, 3, 15 * 60);
    if (!acc15m.allowed) {
      return {
        allowed: false,
        message: 'Too many recovery requests for this account. Please wait 15 minutes before requesting again.'
      };
    }

    // 3. Account Limit: 10 per 24 hours
    const acc24h = await checkWindowLimit(`acc_24h:${normalizedEmail}`, 10, 24 * 60 * 60);
    if (!acc24h.allowed) {
      return {
        allowed: false,
        message: 'Daily password recovery limit reached for this account. Please contact customer support.'
      };
    }
  }

  return { allowed: true };
};

/**
 * Validates resend limits:
 * - Max 5 resends / hour / account
 * - Max 10 delivery emails / hour / account
 */
export const checkResendLimits = async (normalizedEmail) => {
  if (!normalizedEmail) return { allowed: true };

  const resends1h = await checkWindowLimit(`resend_1h:${normalizedEmail}`, 5, 60 * 60);
  if (!resends1h.allowed) {
    return {
      allowed: false,
      message: 'Maximum recovery resend limit reached for this hour (5 attempts). Please check your spam folder or wait before retrying.'
    };
  }

  const emails1h = await checkWindowLimit(`email_1h:${normalizedEmail}`, 10, 60 * 60);
  if (!emails1h.allowed) {
    return {
      allowed: false,
      message: 'Maximum email delivery quota reached for this account. Please try again later.'
    };
  }

  return { allowed: true };
};

/**
 * Validates administrator assisted recovery rate limits:
 * - Max 5 initiations / 15m / admin
 * - Max 10 emails / hour / admin
 * - Max 20 initiations / 24h / admin
 */
export const checkAdminRecoveryLimits = async (adminId) => {
  if (!adminId) return { allowed: true };

  const admin15m = await checkWindowLimit(`admin_15m:${adminId}`, 5, 15 * 60);
  if (!admin15m.allowed) {
    return {
      allowed: false,
      message: 'Admin security threshold: Maximum 5 recovery initiations per 15 minutes exceeded.'
    };
  }

  const admin1h = await checkWindowLimit(`admin_1h:${adminId}`, 10, 60 * 60);
  if (!admin1h.allowed) {
    return {
      allowed: false,
      message: 'Admin security threshold: Maximum 10 recovery deliveries per hour exceeded.'
    };
  }

  const admin24h = await checkWindowLimit(`admin_24h:${adminId}`, 20, 24 * 60 * 60);
  if (!admin24h.allowed) {
    return {
      allowed: false,
      message: 'Admin security threshold: Maximum 20 recovery initiations per 24 hours exceeded.'
    };
  }

  return { allowed: true };
};
