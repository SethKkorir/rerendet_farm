import axios from 'axios';
import crypto from 'crypto';

// In-memory prefix cache with 1-hour TTL
const prefixCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000;

// High-risk offline breach blacklist fallback
const KNOWN_BREACHED_COMMON = new Set([
  'password', 'password123', 'admin123', 'qwerty123', '12345678', 'welcome123',
  'iloveyou', 'sunshine', 'princess', 'football', 'monkey', 'shadow', 'dragon',
  'master', 'letmein', 'trustno1', 'starwars', 'killer', 'superman', 'batman',
  'rerendet123', 'coffeefarm123', '123456789', 'p@ssword', 'p@ssw0rd'
]);

/**
 * Checks a password against the HaveIBeenPwned API using K-Anonymity (SHA-1 prefix range querying).
 * Under this model, the full password or full hash is never transmitted over the network.
 * Includes in-memory caching and safe fallback offline analysis.
 * 
 * @param {string} password - The plain password to check
 * @returns {Promise<number>} - The number of times this password has been leaked (0 if clean)
 */
export const checkPasswordBreach = async (password) => {
  if (!password) return 0;

  const lower = password.toLowerCase().trim();
  if (KNOWN_BREACHED_COMMON.has(lower)) {
    return 99999;
  }

  const sha1Hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
  const prefix = sha1Hash.substring(0, 5);
  const suffix = sha1Hash.substring(5);

  const cached = prefixCache.get(prefix);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.results[suffix] || 0;
  }

  try {
    const response = await axios.get(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'User-Agent': 'Rerendet-Coffee-Enterprise-Security-Hardening' },
      timeout: 3500 // 3.5 seconds timeout
    });

    const results = {};
    const lines = response.data.split('\n');
    for (const line of lines) {
      const [hashSuffix, count] = line.trim().split(':');
      if (hashSuffix && count) {
        results[hashSuffix] = parseInt(count, 10);
      }
    }

    prefixCache.set(prefix, { results, timestamp: Date.now() });

    // Clean old entries if cache grows large
    if (prefixCache.size > 2000) {
      const oldestKey = prefixCache.keys().next().value;
      prefixCache.delete(oldestKey);
    }

    return results[suffix] || 0;
  } catch (error) {
    console.warn(`⚠️ HIBP API unavailable (${error.message}). Running safe offline breach & entropy validation.`);
    if (KNOWN_BREACHED_COMMON.has(lower) || /^(.)\1+$/.test(password)) {
      return 1000;
    }
    return 0;
  }
};
