import asyncHandler from 'express-async-handler';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Middleware to enforce strict IP allowlisting for administrative operations.
 * Allows local developer loopbacks automatically, supports comma-separated whitelists,
 * and handles emergency override flags securely.
 */
export const ipAllowlist = asyncHandler(async (req, res, next) => {
  // If emergency override is set, permit access with warning
  if (process.env.DISABLE_ADMIN_IP_ALLOWLIST === 'true') {
    console.warn('⚠️  [SECURITY WARNING] Admin IP allowlist is explicitly DISABLED via DISABLE_ADMIN_IP_ALLOWLIST=true!');
    return next();
  }

  const clientIp = req.ip || req.socket?.remoteAddress || '';
  
  // Normalization for local loopbacks
  const normalizedClientIp = clientIp.trim();
  const isLoopback = normalizedClientIp === '127.0.0.1' || 
                      normalizedClientIp === '::1' || 
                      normalizedClientIp === '::ffff:127.0.0.1';

  if (isLoopback) {
    return next(); // Always permit local developer loopbacks
  }

  const allowlistEnv = process.env.ADMIN_IP_ALLOWLIST;

  // In non-production, if allowlist is empty, allow and warn to prevent instant lockout
  if (!allowlistEnv && process.env.NODE_ENV !== 'production') {
    console.warn(`⚠️  [ADMIN IP GUARD] No ADMIN_IP_ALLOWLIST configured in environment. Allowing client IP (${normalizedClientIp}) in development mode.`);
    return next();
  }

  // If in production and allowlist is empty, throw critical lockout protection
  if (!allowlistEnv) {
    console.error('❌ [CRITICAL SECURITY ERROR] ADMIN_IP_ALLOWLIST is empty in production! Blocking all remote admin traffic for security.');
    res.status(403);
    throw new Error('Access Denied: Administration allowlist is unconfigured in production.');
  }

  // Parse allowed IPs
  const allowedIps = allowlistEnv.split(',').map(ip => ip.trim());

  if (allowedIps.includes(normalizedClientIp)) {
    return next();
  }

  // Log unauthorized admin access attempt
  console.warn(`⛔ [IP ALLOWLIST BLOCKED] Blocked unauthorized administrative access attempt from IP: ${normalizedClientIp}`);
  res.status(403);
  throw new Error(`Access Denied: Your IP address (${normalizedClientIp}) is not whitelisted for administrative routes.`);
});
export default ipAllowlist;
