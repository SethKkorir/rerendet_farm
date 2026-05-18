import Settings from '../models/Settings.js';
import { redisClient, isRedisConnected } from '../config/redis.js';

const SETTINGS_CACHE_KEY = 'app:settings';
const TTL_SECONDS = 60;

/**
 * getSettings
 * - Checks Redis cache first (TTL 60s).
 * - Falls back to Mongo on miss.
 * - Writes back to cache on miss.
 */
export const getSettings = async () => {
  const isCacheReady = redisClient && isRedisConnected;

  if (isCacheReady) {
    try {
      const cached = await redisClient.get(SETTINGS_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      console.error('❌ Settings Cache get error:', err.message);
    }
  }

  // Fallback to MongoDB using Mongoose static helper
  const settings = await Settings.getSettings();

  if (isCacheReady && settings) {
    try {
      await redisClient.set(
        SETTINGS_CACHE_KEY,
        JSON.stringify(settings),
        'EX',
        TTL_SECONDS
      );
    } catch (err) {
      console.error('❌ Settings Cache set error:', err.message);
    }
  }

  return settings;
};

/**
 * invalidateSettings
 * - Deletes the 'app:settings' cache key.
 */
export const invalidateSettings = async () => {
  if (redisClient && isRedisConnected) {
    try {
      await redisClient.del(SETTINGS_CACHE_KEY);
      console.log('🔄 Settings cache invalidated successfully');
    } catch (err) {
      console.error('❌ Settings Cache invalidation error:', err.message);
    }
  }
};

export default { getSettings, invalidateSettings };
