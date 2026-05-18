import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
let redisClient = null;
let isRedisConnected = false;

// Initialize Redis only if REDIS_URL is provided, or in production/non-local environments
const shouldInitRedis = process.env.REDIS_URL || process.env.NODE_ENV === 'production';

if (shouldInitRedis) {
  try {
    console.log(`🔗 Initializing Redis connection...`);
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: null, // Required by BullMQ to manage retries internally
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.slice(0, targetError.length) === targetError) {
          return true;
        }
        return false;
      },
      retryStrategy: (times) => {
        // Exponential backoff strategy up to 3 seconds max delay
        const delay = Math.min(times * 150, 3000);
        console.warn(`🔄 Redis reconnecting: attempt ${times}, delaying ${delay}ms`);
        return delay;
      }
    });

    redisClient.on('connect', () => {
      isRedisConnected = true;
      console.log('✅ Redis connection established successfully');
    });

    redisClient.on('error', (err) => {
      isRedisConnected = false;
      console.error('❌ Redis error:', err.message);
    });

    redisClient.on('close', () => {
      isRedisConnected = false;
      console.warn('⚠️ Redis connection closed');
    });
  } catch (error) {
    console.error('❌ Redis client failed to initialize:', error.message);
  }
} else {
  console.log('⚠️ Redis client disabled: No REDIS_URL provided and NODE_ENV is not production');
}

/**
 * invalidateCatalog
 * - Dynamically scans and invalidates all product catalog cache keys.
 */
export const invalidateCatalog = async () => {
  if (redisClient && isRedisConnected) {
    try {
      const keys = await redisClient.keys('products:catalog:*');
      if (keys.length > 0) {
        await redisClient.del(keys);
        console.log(`🧹 Redis: Invalidated ${keys.length} product catalog cache keys:`, keys);
      }
    } catch (err) {
      console.error('❌ Redis: Invalidate catalog failed:', err.message);
    }
  }
};

export { redisClient, isRedisConnected };
export default redisClient;

