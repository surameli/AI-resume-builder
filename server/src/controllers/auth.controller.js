/**
 * Auth Controller — thin layer between routes and auth service.
 * Handles HTTP concerns: reading req, calling service, setting cookies, sending response.
 */
import * as authService from '../services/auth.service.js';
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendBadRequest,
} from '../utils/apiResponse.js';
import {
  getAccessCookieOptions,
  getRefreshCookieOptions,
  clearCookieOptions,
} from '../utils/jwt.js';

// ─── POST /api/auth/register ──────────────────────────────────────────────────

export const register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    const user = await authService.registerUser({ firstName, lastName, email, password });

    return sendCreated(res, {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.profile.firstName,
        lastName: user.profile.lastName,
        isEmailVerified: user.isEmailVerified,
      },
    }, 'Account created successfully. Please check your email to verify your account.');
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;

    const { user, accessToken, refreshToken } = await authService.loginUser({
      email,
      password,
      userAgent,
      ipAddress,
    });

    // Set HTTP-only cookies
    res.cookie('accessToken', accessToken, getAccessCookieOptions());
    res.cookie('refreshToken', refreshToken, getRefreshCookieOptions());

    return sendSuccess(res, {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
    }, 'Logged in successfully');
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

export const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    await authService.logoutUser(refreshToken);

    // Clear both cookies
    res.clearCookie('accessToken', clearCookieOptions());
    res.clearCookie('refreshToken', { ...clearCookieOptions(), path: '/api/auth' });

    return sendSuccess(res, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────

export const refreshToken = async (req, res, next) => {
  try {
    const oldRefreshToken = req.cookies?.refreshToken;

    if (!oldRefreshToken) {
      return sendBadRequest(res, 'No refresh token provided');
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await authService.refreshAccessToken(oldRefreshToken);

    res.cookie('accessToken', accessToken, getAccessCookieOptions());
    res.cookie('refreshToken', newRefreshToken, getRefreshCookieOptions());

    return sendSuccess(res, null, 'Token refreshed');
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

export const getMe = async (req, res, next) => {
  try {
    const user = await authService.getCurrentUser(req.user.id);
    return sendSuccess(res, { user });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    await authService.forgotPassword(email);

    // Always return success regardless of whether email exists (prevents enumeration)
    return sendSuccess(
      res,
      null,
      'If an account with that email exists, a password reset link has been sent.'
    );
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/auth/reset-password ───────────────────────────────────────────

export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    await authService.resetPassword({ token, password });

    return sendSuccess(res, null, 'Password reset successfully. Please log in with your new password.');
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/auth/verify-email ───────────────────────────────────────────────

export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;

    if (!token) {
      return sendBadRequest(res, 'Verification token is required');
    }

    await authService.verifyEmail(token);

    // Redirect to frontend success page
    return res.redirect(`${process.env.CLIENT_URL}/login?verified=true`);
  } catch (error) {
    next(error);
  }
};
