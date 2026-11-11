/**
 * Global Express error handler.
 * Catches any error passed via next(error) and returns a clean JSON response.
 * Hides internal details in production.
 */
import { env } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  // Log the full error in development
  if (env.isDev) {
    console.error('❌ Unhandled error:', err);
  } else {
    // In production only log essential info (no stack traces to console in prod)
    console.error(`❌ Error [${req.method} ${req.path}]:`, err.message);
  }

  // Prisma known errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: 'A record with this value already exists.',
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Record not found.',
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired.' });
  }

  // Default
  const statusCode = err.statusCode || err.status || 500;
  return res.status(statusCode).json({
    success: false,
    message: env.isProd ? 'Something went wrong' : (err.message || 'Internal server error'),
    ...(env.isDev && { stack: err.stack }),
  });
};

/** Handles requests to routes that don't exist */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
};
