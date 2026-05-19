import axios from 'axios';
import crypto from 'crypto';

/**
 * Checks a password against the HaveIBeenPwned API using K-Anonymity (SHA-1 prefix range querying).
 * Under this model, the full password or full hash is never transmitted over the network.
 * 
 * @param {string} password - The plain password to check
 * @returns {Promise<number>} - The number of times this password has been leaked (0 if clean)
 */
export const checkPasswordBreach = async (password) => {
  if (!password) return 0;

  try {
    // Generate SHA-1 hash of the password
    const sha1Hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
    
    // Split into prefix (first 5 chars) and suffix (remaining 35 chars)
    const prefix = sha1Hash.substring(0, 5);
    const suffix = sha1Hash.substring(5);

    console.log(`🔒 Checking HaveIBeenPwned for hash prefix: ${prefix}...`);

    // Call HaveIBeenPwned API with prefix
    const response = await axios.get(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'User-Agent': 'Rerendet-Coffee-Enterprise-Security-Hardening' },
      timeout: 5000 // 5 seconds timeout to avoid hanging
    });

    const lines = response.data.split('\n');
    for (const line of lines) {
      const [hashSuffix, count] = line.trim().split(':');
      if (hashSuffix === suffix) {
        const leakCount = parseInt(count, 10);
        console.warn(`⚠️  Password breach detected! Leaked ${leakCount} times.`);
        return leakCount;
      }
    }

    return 0; // Clean!
  } catch (error) {
    // If the API call fails, we log it but don't block registration (fail-open for UX/Availability, or log a warning)
    console.error('❌ HaveIBeenPwned API check failed or timed out:', error.message);
    return 0; // Fallback to safe
  }
};
