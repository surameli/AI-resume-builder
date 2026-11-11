/**
 * JWT utility functions.
 * - Access tokens: short-lived (15m), stored in HTTP-only cookie.
 * - Refresh tokens: long-lived (7d), also HTTP-only cookie, stored
 *   as a hash in the database (RefreshSession) so they can be revoked.
 */
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';

// ─── Token Generation ────────────────────────────────────────────────────────

export const generateAccessToken = (payload) => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });
};

export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });
};

// ─── Token Verification ──────────────────────────────────────────────────────

export const verifyAccessToken = (token) => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
};

// ─── Cookie Helpers ──────────────────────────────────────────────────────────

/**
 * Returns the cookie options object.
 * httpOnly + sameSite=strict prevents XSS and CSRF on same-origin requests.
 * secure is only set in production so development works over http.
 */
export const getAccessCookieOptions = () => ({
  httpOnly: true,
  secure: env.isProd,
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000, // 15 minutes in ms
  path: '/',
});

export const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: env.isProd,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/api/auth', // limit refresh cookie to auth routes only
});

export const clearCookieOptions = () => ({
  httpOnly: true,
  secure: env.isProd,
  sameSite: 'strict',
  path: '/',
});

// ─── Secure Random Tokens ────────────────────────────────────────────────────

/** Generates a cryptographically secure random token for password reset etc. */
export const generateSecureToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/** Hashes a token before storing in DB so raw tokens aren't stored at rest. */
export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// ─── Refresh Token Expiry ─────────────────────────────────────────────────────

export const getRefreshTokenExpiry = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d;
};

export const getPasswordResetExpiry = () => {
  const d = new Date();
  d.setHours(d.getHours() + 1); // 1 hour
  return d;
};

export const getEmailVerificationExpiry = () => {
  const d = new Date();
  d.setHours(d.getHours() + 24); // 24 hours
  return d;
};
