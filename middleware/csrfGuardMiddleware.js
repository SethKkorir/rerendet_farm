import dotenv from 'dotenv';
dotenv.config();

const ALLOWED_ORIGINS = new Set([
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

/**
 * Double-Defense CSRF Protection Middleware.
 * Enforces strict Origin/Referer verification and requires custom security headers
 * (e.g., X-Requested-With or X-CSRF-Token) for all state-changing requests (POST, PUT, DELETE, PATCH).
 */
export const csrfGuard = (req, res, next) => {
  // Safe methods do not mutate state and are bypassed
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Webhooks are trusted third-party integrations (Stripe, M-Pesa) and use signature validation, so bypass CSRF
  if (req.originalUrl.startsWith('/api/webhooks')) {
    return next();
  }

  // Silent token refresh is cookie-secured and response is protected by CORS, so bypass CSRF to prevent proxy blocks
  if (req.originalUrl.includes('/api/auth/refresh')) {
    return next();
  }

  // Public anonymous state-changing endpoints do not use session credentials and are not vulnerable to CSRF
  const isPublicRoute = 
    req.originalUrl.startsWith('/api/newsletter') ||
    req.originalUrl.startsWith('/api/subscribers') ||
    req.originalUrl.startsWith('/api/auth/login') ||
    req.originalUrl.startsWith('/api/auth/register') ||
    req.originalUrl.startsWith('/api/auth/forgot') ||
    req.originalUrl.startsWith('/api/auth/reset') ||
    req.originalUrl.startsWith('/api/auth/customer/challenge') ||
    req.originalUrl.startsWith('/api/auth/customer/verify-email') ||
    req.originalUrl.startsWith('/api/auth/resend-verification') ||
    req.originalUrl.startsWith('/api/public') ||
    req.originalUrl.includes('/restock-subscribe') ||
    req.originalUrl.includes('/track/impression') ||
    req.originalUrl.includes('/track/click');

  if (isPublicRoute) {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;

  // 1. Check Origin and Referer
  let sourceOrigin = '';
  if (origin) {
    sourceOrigin = origin;
  } else if (referer) {
    try {
      const parsedReferer = new URL(referer);
      sourceOrigin = parsedReferer.origin;
    } catch (_) {}
  }

  const isDev = process.env.NODE_ENV !== 'production';

  if (sourceOrigin) {
    const isAllowed = ALLOWED_ORIGINS.has(sourceOrigin) ||
      sourceOrigin.endsWith('.vercel.app') ||
      (isDev && (
        sourceOrigin.startsWith('http://localhost:') ||
        sourceOrigin.startsWith('http://127.0.0.1:')
      ));

    if (!isAllowed) {
      console.warn(`🚨 [CSRF BLOCK] State-changing request blocked due to unauthorized Origin: ${sourceOrigin}`);
      return res.status(403).json({
        success: false,
        code: 'CSRF_BLOCKED',
        message: 'Security Restriction: Cross-Origin request blocked. CSRF validation failed.'
      });
    }
  }

  // 2. Custom Security Header check (protects against browser standard form/cross-site submissions)
  const requestedWith = req.headers['x-requested-with'];
  const csrfHeader = req.headers['x-csrf-token'];
  const authHeader = req.headers['authorization'];

  if (!requestedWith && !csrfHeader && !authHeader) {
    console.warn(`🚨 [CSRF BLOCK] Request blocked due to missing custom authorization headers (X-Requested-With / X-CSRF-Token / Authorization). IP: ${req.ip}`);
    return res.status(403).json({
      success: false,
      code: 'CSRF_BLOCKED',
      message: 'Security Restriction: Custom security header missing. CSRF protection blocked this request.'
    });
  }

  next();
};

export default csrfGuard;
