/**
 * Authentication middleware.
 * Reads the access token from the HTTP-only cookie,
 * verifies it, fetches the user from DB, and attaches them to req.user.
 *
 * If the access token is expired, the client should call /api/auth/refresh.
 */
import { verifyAccessToken } from '../utils/jwt.js';
import { sendUnauthorized, sendForbidden } from '../utils/apiResponse.js';
import prisma from '../config/database.js';

/**
 * Protects any route — requires a valid access token cookie.
 */
export const authenticate = async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken;

    if (!token) {
      return sendUnauthorized(res, 'Please log in to continue');
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return sendUnauthorized(res, 'Session expired. Please log in again.');
      }
      return sendUnauthorized(res, 'Invalid session. Please log in again.');
    }

    // Fetch the user to ensure they still exist and aren't suspended
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isEmailVerified: true,
        isSuspended: true,
        createdAt: true,
      },
    });

    if (!user) {
      return sendUnauthorized(res, 'Account not found. Please log in again.');
    }

    if (user.isSuspended) {
      return sendForbidden(res, 'Your account has been suspended. Contact support.');
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return sendUnauthorized(res, 'Authentication failed');
  }
};

/**
 * Requires the authenticated user to have the ADMIN role.
 * Must be used AFTER authenticate middleware.
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return sendUnauthorized(res, 'Not authenticated');
  }
  if (req.user.role !== 'ADMIN') {
    return sendForbidden(res, 'Admin access required');
  }
  next();
};

/**
 * Optional authentication — attaches user to req if token is present,
 * but does NOT block the request if it is missing.
 * Used for public endpoints that behave differently for logged-in users.
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken;
    if (!token) return next();

    const decoded = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, isSuspended: true },
    });

    if (user && !user.isSuspended) {
      req.user = user;
    }
  } catch (_) {
    // Silently ignore invalid/expired tokens for optional auth
  }
  next();
};
