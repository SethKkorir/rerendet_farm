import * as Sentry from '@sentry/node';

const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || 'An unexpected error occurred';

  // 1. Handle Mongoose Bad ObjectId / CastError
  if (err.name === 'CastError') {
    statusCode = 404;
    message = `Resource not found with identifier: ${err.value}`;
  }

  // 2. Handle Mongoose Duplicate Key Error (E11000)
  else if (err.code === 11000) {
    statusCode = 400;
    const field = err.keyPattern ? Object.keys(err.keyPattern)[0] : 'field';
    const value = err.keyValue ? err.keyValue[field] : 'value';
    const displayField = field.split('.').pop();
    message = `A record with this ${displayField} ("${value}") already exists.`;
  }

  // 3. Handle Mongoose Schema Validation Error
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(', ');
  }

  // 4. Handle JWT Authentication & Expiry Errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token. Please sign in again.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication session has expired. Please sign in again.';
  }

  // 5. Handle Multer File Upload Errors
  else if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'Uploaded file is too large. Maximum size allowed is 5MB.';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = `Unexpected upload field: ${err.field}`;
    } else {
      message = err.message || 'File upload failed';
    }
  }

  // 6. Handle Malformed JSON Body Parse Error
  else if (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.status === 400 && 'body' in err)) {
    statusCode = 400;
    message = 'Malformed JSON payload in request body';
  }

  // 7. Handle MongoDB Network / Connection Drops
  else if (err.code === 'ECONNREFUSED' || err.name === 'MongoServerSelectionError' || err.name === 'MongoNetworkError') {
    statusCode = 503;
    message = 'Database service is temporarily unavailable. Please retry in a moment.';
  }

  // Log error details for diagnosis
  if (statusCode >= 500) {
    console.error(`💥 [5xx SERVER ERROR] ${req.method} ${req.originalUrl}:`, err);
    
    // Capture to Sentry if initialized
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(err);
    }

    // Record crash internally
    import('../utils/securityAlerts.js').then(({ recordServerCrash }) => {
      recordServerCrash(err, req);
    }).catch(() => {});
  } else {
    console.warn(`⚠️ [${statusCode} CLIENT ERROR] ${req.method} ${req.originalUrl}: ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    message: message,
    statusCode: statusCode,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
};

const notFound = (req, res, next) => {
  const error = new Error(`Resource Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

export { notFound, errorHandler };