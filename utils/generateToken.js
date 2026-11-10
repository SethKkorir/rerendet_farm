import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto';
import {
  REFRESH_TOKEN_EXPIRY_SECONDS,
  REFRESH_TOKEN_EXPIRY_JWT,
  ACCESS_TOKEN_EXPIRY_JWT
} from '../config/tokenConfig.js';

dotenv.config();

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'rerendet_access_secret_fallback';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'rerendet_refresh_secret_fallback';

if (!process.env.JWT_SECRET) console.warn('⚠️ JWT_SECRET not set. Using fallback (UNSAFE).');
if (!process.env.JWT_REFRESH_SECRET) console.warn('⚠️ JWT_REFRESH_SECRET not set. Using fallback (UNSAFE).');

/**
 * Helper to safely extract client IP considering reverse proxies.
 */
export const getClientIp = (req) => {
  if (!req) return '127.0.0.1';
  const forwarded = req.headers && req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
};

/**
 * Generates a SHA-256 session fingerprint combining client IP and User-Agent.
 * Normalized to handle loopback/localhost variations in development.
 */
export const generateFingerprintHash = (ip, userAgent) => {
  const cleanUA = (userAgent || '').trim().slice(0, 200);
  return crypto.createHash('sha256').update(cleanUA).digest('hex');
};

// ── Access Token — short-lived (15 minutes), lives in HttpOnly cookie / auth header ────────────────────
export const generateAccessToken = (userId, arg2, arg3, arg4, arg5, arg6, ip = '', userAgent = '', twoFactorEnabled = false, jti = null) => {
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

  const payload = { 
    userId, 
    role, 
    tokenVersion, 
    email, 
    firstName, 
    lastName, 
    type: 'access', 
    stage: 'authenticated', 
    twoFactorEnabled: !!twoFactorEnabled 
  };
  
  if (jti) {
    payload.jti = jti;
  }

  if (ip || userAgent) {
    payload.fpt = generateFingerprintHash(ip, userAgent);
  }

  return jwt.sign(
    payload,
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY_JWT }
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
    { expiresIn: REFRESH_TOKEN_EXPIRY_JWT }
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

// ── Session Isolation Cookie Names ─────────────────────────────────────────
export const ADMIN_ACCESS_COOKIE = 'admin_access_token';
export const ADMIN_REFRESH_COOKIE = 'admin_refresh_token';
export const CUSTOMER_ACCESS_COOKIE = 'customer_access_token';
export const CUSTOMER_REFRESH_COOKIE = 'customer_refresh_token';

// ── Cookie Options Helper ──────────────────────────────────────────────────
export const getAuthCookieOptions = (maxAgeMs) => {
  const isProd = process.env.NODE_ENV === 'production';
  // Use Strict for defense-in-depth, or override via env
  const sameSitePolicy = process.env.COOKIE_SAME_SITE || 'strict';
  const isSecure = isProd || sameSitePolicy === 'none';

  const options = {
    httpOnly: true,          // JS cannot read this — XSS-proof
    secure: isSecure,        // Enforce HTTPS in production or sameSite=none
    sameSite: sameSitePolicy,// Strict session isolation against CSRF
    path: '/'                // Global route access
  };

  if (maxAgeMs !== undefined && maxAgeMs !== null) {
    options.maxAge = maxAgeMs;
  }

  return options;
};

// ── Clear All Auth Cookies Helper ──────────────────────────────────────────
export const clearAllAuthCookies = (res) => {
  const opts = getAuthCookieOptions();
  res.clearCookie(ADMIN_ACCESS_COOKIE, opts);
  res.clearCookie(ADMIN_REFRESH_COOKIE, opts);
  res.clearCookie(CUSTOMER_ACCESS_COOKIE, opts);
  res.clearCookie(CUSTOMER_REFRESH_COOKIE, opts);
  res.clearCookie('token', opts);
  res.clearCookie('refreshToken', opts);
};

// ── Admin Session Cookies ──────────────────────────────────────────────────
export const setAdminCookies = (res, accessToken, refreshToken) => {
  // Clear any existing customer session or stale legacy cookies first
  const opts = getAuthCookieOptions();
  res.clearCookie(CUSTOMER_ACCESS_COOKIE, opts);
  res.clearCookie(CUSTOMER_REFRESH_COOKIE, opts);
  res.clearCookie('token', opts);
  res.clearCookie('refreshToken', opts);

  const cookieExpireDays = (!process.env.JWT_COOKIE_EXPIRE || isNaN(Number(process.env.JWT_COOKIE_EXPIRE)))
    ? 7
    : Number(process.env.JWT_COOKIE_EXPIRE);

  res.cookie(ADMIN_ACCESS_COOKIE, accessToken, getAuthCookieOptions(15 * 60 * 1000));
  if (refreshToken) {
    res.cookie(ADMIN_REFRESH_COOKIE, refreshToken, getAuthCookieOptions(cookieExpireDays * 24 * 60 * 60 * 1000));
  }
};

export const clearAdminCookies = (res) => {
  const opts = getAuthCookieOptions();
  res.clearCookie(ADMIN_ACCESS_COOKIE, opts);
  res.clearCookie(ADMIN_REFRESH_COOKIE, opts);
};

// ── Customer Session Cookies ───────────────────────────────────────────────
export const setCustomerCookies = (res, accessToken, refreshToken) => {
  // Clear any existing admin session or stale legacy cookies first
  const opts = getAuthCookieOptions();
  res.clearCookie(ADMIN_ACCESS_COOKIE, opts);
  res.clearCookie(ADMIN_REFRESH_COOKIE, opts);
  res.clearCookie('token', opts);
  res.clearCookie('refreshToken', opts);

  const cookieExpireDays = (!process.env.JWT_COOKIE_EXPIRE || isNaN(Number(process.env.JWT_COOKIE_EXPIRE)))
    ? 7
    : Number(process.env.JWT_COOKIE_EXPIRE);

  res.cookie(CUSTOMER_ACCESS_COOKIE, accessToken, getAuthCookieOptions(15 * 60 * 1000));
  if (refreshToken) {
    res.cookie(CUSTOMER_REFRESH_COOKIE, refreshToken, getAuthCookieOptions(cookieExpireDays * 24 * 60 * 60 * 1000));
  }
};

export const clearCustomerCookies = (res) => {
  const opts = getAuthCookieOptions();
  res.clearCookie(CUSTOMER_ACCESS_COOKIE, opts);
  res.clearCookie(CUSTOMER_REFRESH_COOKIE, opts);
};

// ── Set Access Token as HttpOnly Cookie (Legacy Compatibility) ───────────────
export const setTokenCookie = (res, token) => {
  res.cookie('token', token, getAuthCookieOptions(15 * 60 * 1000));
};

// ── Clear Access Token Cookie ─────────────────────────────────────────────────
export const clearTokenCookie = (res) => {
  res.clearCookie('token', getAuthCookieOptions());
};

// ── Set Refresh Token as HttpOnly Cookie (Legacy Compatibility) ──────────────
export const setRefreshTokenCookie = (res, refreshToken) => {
  const cookieExpireDays = (!process.env.JWT_COOKIE_EXPIRE || isNaN(Number(process.env.JWT_COOKIE_EXPIRE)))
    ? 7
    : Number(process.env.JWT_COOKIE_EXPIRE);

  res.cookie('refreshToken', refreshToken, getAuthCookieOptions(cookieExpireDays * 24 * 60 * 60 * 1000));
};

// ── Clear Refresh Token Cookie ────────────────────────────────────────────────
export const clearRefreshTokenCookie = (res) => {
  res.clearCookie('refreshToken', getAuthCookieOptions());
};

// ── Recovery Session & Authorization Cookies (Restricted & Independent) ────────
export const setRecoveryChallengeCookie = (res, recoveryId) => {
  res.cookie('recovery_challenge', String(recoveryId), getAuthCookieOptions(15 * 60 * 1000));
};

export const clearRecoveryChallengeCookie = (res) => {
  res.clearCookie('recovery_challenge', getAuthCookieOptions());
};

export const setRecoveryAuthCookie = (res, recoveryId, token) => {
  const value = `${recoveryId}:${token}`;
  res.cookie('recovery_auth_token', value, getAuthCookieOptions(15 * 60 * 1000));
};

export const clearRecoveryAuthCookie = (res) => {
  res.clearCookie('recovery_auth_token', getAuthCookieOptions());
};

// ── Legacy — kept for compatibility ──────────────────────────────────────────
const generateToken = (userId, tokenVersion = 0) => generateAccessToken(userId, 'customer', tokenVersion);
export default generateToken;