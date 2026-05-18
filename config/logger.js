// config/logger.js
import pino from 'pino';

// Deep redaction pathways to safeguard sensitive data from leaking into logs
const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'req.headers["xsrf-token"]',
  'res.headers["set-cookie"]',
  'body.password',
  'body.oldPassword',
  'body.newPassword',
  'body.confirmPassword',
  'body.creditCard',
  'body.cardNumber',
  'body.cvv',
  'body.cardExpiry',
  'body.twoFactorSecret',
  'body.twoFactorBackupCodes',
  'body.twoFactorCode',
  'body.secret',
  'password',
  'twoFactorSecret',
  'twoFactorBackupCodes'
];

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: redactPaths,
    censor: '[REDACTED]'
  }
});

export default logger;
