import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'rerendet_access_secret_fallback';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'rerendet_refresh_secret_fallback';

if (!process.env.JWT_SECRET) console.warn('⚠️ JWT_SECRET not set. Using fallback (UNSAFE).');
if (!process.env.JWT_REFRESH_SECRET) console.warn('⚠️ JWT_REFRESH_SECRET not set. Using fallback (UNSAFE).');

/**
 * Generates a SHA-256 session fingerprint combining client IP and User-Agent.
 * Normalized to handle loopback/localhost variations in development.
 */
export const generateFingerprintHash = (ip, userAgent) => {
  const normalizedIp = ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1' ? 'loopback' : (ip || '');
  const cleanUA = (userAgent || '').trim();
  return crypto.createHash('sha256').update(`${normalizedIp}:${cleanUA}`).digest('hex');
};

// ── Access Token — short-lived (15 minutes), lives in HttpOnly cookie / auth header ────────────────────
export const generateAccessToken = (userId, arg2, arg3, arg4, arg5, arg6, ip = '', userAgent = '', twoFactorEnabled = false) => {
  let role = 'customer';
  let tokenVersion = 0;
  let email = '';
  let firstName = '';
  let lastName = '';

  if (typeof arg2 === 'string') {
    // New signature: (userId, role, tokenVersion, email, firstName, lastName)
    role = arg2;
    tokenVersion = arg3 || 0;
    email = arg4 || '';
    firstName = arg5 || '';
    lastName = arg6 || '';
  } else {
    // Old/legacy signature: (userId, tokenVersion)
    tokenVersion = arg2 || 0;
  }

  const payload = { userId, role, tokenVersion, email, firstName, lastName, type: 'access', twoFactorEnabled: !!twoFactorEnabled };
  
  if (ip || userAgent) {
    payload.fpt = generateFingerprintHash(ip, userAgent);
  }

  return jwt.sign(
    payload,
    ACCESS_TOKEN_SECRET,
    { expiresIn: '15m' }
  );
};

// ── Refresh Token — long-lived (7 days), lives in HttpOnly cookie ─────────────────────
export const generateRefreshToken = (userId, tokenVersion = 0, jti = crypto.randomUUID(), ip = '', userAgent = '') => {
  const payload = { userId, tokenVersion, jti, type: 'refresh' };
  
  if (ip || userAgent) {
    payload.fpt = generateFingerprintHash(ip, userAgent);
  }

  return jwt.sign(
    payload,
    REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );
};

// ── Verify Access Token ───────────────────────────────────────────────────────
export const verifyAccessToken = (token) => {
  return jwt.verify(token, ACCESS_TOKEN_SECRET);
};

// ── Verify Refresh Token ──────────────────────────────────────────────────────
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, REFRESH_TOKEN_SECRET);
};

// ── Set Access Token as HttpOnly Cookie ──────────────────────────────────────
export const setTokenCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,          // JS cannot read this — XSS-proof
    secure: process.env.NODE_ENV === 'production', // Enforce secure/HTTPS-only in production
    sameSite: 'strict',      // No cross-site requests
    maxAge: 15 * 60 * 1000,  // 15 mins matching access token
    path: '/'                // Global route access
  });
};

// ── Clear Access Token Cookie ─────────────────────────────────────────────────
export const clearTokenCookie = (res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
};

// ── Set Refresh Token as HttpOnly Cookie ─────────────────────────────────────
export const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,          // JS cannot read this — XSS-proof
    secure: process.env.NODE_ENV === 'production', // Enforce secure/HTTPS-only in production
    sameSite: 'strict',      // No cross-site requests
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/' // Global route access for logout and refresh endpoint
  });
};

// ── Clear Refresh Token Cookie ────────────────────────────────────────────────
export const clearRefreshTokenCookie = (res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
};

// ── Legacy — kept for compatibility ──────────────────────────────────────────
const generateToken = (userId, tokenVersion = 0) => generateAccessToken(userId, 'customer', tokenVersion);
export default generateToken;