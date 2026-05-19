import * as Sentry from '@sentry/node';

const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // Capture server-side 5xx exceptions to Sentry securely
  if (statusCode >= 500) {
    Sentry.captureException(err);

    // Track internal crash and spike in alert monitor
    import('../utils/securityAlerts.js').then(({ recordServerCrash }) => {
      recordServerCrash(err, req);
    }).catch(e => console.error('Crash tracker failed:', e));
  }

  // Handle Mongoose Duplicate Key Error (E11000)
  if (err.code === 11000) {
    statusCode = 400;
    const field = err.keyPattern ? Object.keys(err.keyPattern)[0] : 'field';
    const value = err.keyValue ? err.keyValue[field] : 'value';
    const displayField = field.split('.').pop();
    message = `Duplicate value error: A record with this ${displayField} ("${value}") already exists.`;
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(', ');
  }

  if (statusCode === 400 || statusCode === 500) {
    console.error(`❌ [ERROR] ${req.method} ${req.path}:`, err);
  }

  res.status(statusCode);
  res.json({
    success: false,
    message: message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

export { notFound, errorHandler };