/**
 * Rate limiters using express-rate-limit.
 * Separate limiters for different sensitivity levels.
 */
import rateLimit from 'express-rate-limit';

/** Strict limiter for auth endpoints (login, register, forgot-password) */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    message: 'Too many attempts. Please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

/** General API limiter for all other routes */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Strict limiter for AI endpoints (more expensive operations) */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: {
    success: false,
    message: 'AI request limit reached. Please wait a moment before trying again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Password reset limiter */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again in 1 hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
