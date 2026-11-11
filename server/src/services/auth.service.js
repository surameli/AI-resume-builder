/**
 * Auth Service — all authentication business logic lives here.
 * Controllers are thin; they call these functions and send responses.
 */
import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateSecureToken,
  hashToken,
  getRefreshTokenExpiry,
  getPasswordResetExpiry,
  getEmailVerificationExpiry,
} from '../utils/jwt.js';
import {
  sendPasswordResetEmail,
  sendEmailVerificationEmail,
} from '../utils/email.js';

const BCRYPT_ROUNDS = 12;

// ─── Register ────────────────────────────────────────────────────────────────

export const registerUser = async ({ firstName, lastName, email, password }) => {
  // Check for existing account
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const error = new Error('An account with this email already exists.');
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Create user + profile + free subscription in a transaction
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email,
        password: hashedPassword,
        profile: {
          create: {
            firstName,
            lastName,
          },
        },
        subscription: {
          create: {
            plan: 'FREE',
            status: 'ACTIVE',
          },
        },
      },
      select: {
        id: true,
        email: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
        profile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
    return newUser;
  });

  // Send verification email (non-blocking — don't fail registration if email fails)
  try {
    const verifyToken = generateSecureToken();
    const hashedVerifyToken = hashToken(verifyToken);

    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token: hashedVerifyToken,
        expiresAt: getEmailVerificationExpiry(),
      },
    });

    await sendEmailVerificationEmail(email, verifyToken);
  } catch (emailErr) {
    console.error('Failed to send verification email:', emailErr.message);
  }

  return user;
};

// ─── Login ───────────────────────────────────────────────────────────────────

export const loginUser = async ({ email, password, userAgent, ipAddress }) => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      password: true,
      role: true,
      isEmailVerified: true,
      isSuspended: true,
    },
  });

  // Use constant-time comparison regardless of whether user exists
  // to prevent user enumeration
  const dummyHash = '$2a$12$dummy.hash.to.prevent.timing.attacks.xxxxxxxxxxxxxxxxxx';
  const passwordToCheck = user?.password || dummyHash;
  const isValid = await bcrypt.compare(password, passwordToCheck);

  if (!user || !isValid) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  if (user.isSuspended) {
    const error = new Error('Your account has been suspended. Contact support.');
    error.statusCode = 403;
    throw error;
  }

  // Generate tokens
  const tokenPayload = { userId: user.id, role: user.role };
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Store hashed refresh token in DB
  await prisma.refreshSession.create({
    data: {
      userId: user.id,
      token: hashToken(refreshToken),
      userAgent: userAgent || null,
      ipAddress: ipAddress || null,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  // Return user data (never include password hash)
  const { password: _, ...safeUser } = user;

  return { user: safeUser, accessToken, refreshToken };
};

// ─── Refresh Token ───────────────────────────────────────────────────────────

export const refreshAccessToken = async (refreshToken) => {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    const error = new Error('Invalid or expired refresh token.');
    error.statusCode = 401;
    throw error;
  }

  // Check it exists in DB (not revoked)
  const session = await prisma.refreshSession.findUnique({
    where: { token: hashToken(refreshToken) },
  });

  if (!session || session.expiresAt < new Date()) {
    const error = new Error('Session expired. Please log in again.');
    error.statusCode = 401;
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, email: true, role: true, isSuspended: true },
  });

  if (!user || user.isSuspended) {
    const error = new Error('Account not found or suspended.');
    error.statusCode = 401;
    throw error;
  }

  // Rotate: delete old session, create new access token
  await prisma.refreshSession.delete({ where: { id: session.id } });

  const newAccessToken = generateAccessToken({ userId: user.id, role: user.role });
  const newRefreshToken = generateRefreshToken({ userId: user.id, role: user.role });

  await prisma.refreshSession.create({
    data: {
      userId: user.id,
      token: hashToken(newRefreshToken),
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

// ─── Logout ──────────────────────────────────────────────────────────────────

export const logoutUser = async (refreshToken) => {
  if (!refreshToken) return;

  try {
    await prisma.refreshSession.delete({
      where: { token: hashToken(refreshToken) },
    });
  } catch {
    // Session may already be expired/deleted — that's fine
  }
};

// ─── Get Current User ────────────────────────────────────────────────────────

export const getCurrentUser = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      isEmailVerified: true,
      createdAt: true,
      profile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          professionalTitle: true,
          photoUrl: true,
          phone: true,
          location: true,
          linkedinUrl: true,
          githubUrl: true,
          portfolioUrl: true,
          summary: true,
        },
      },
      subscription: {
        select: {
          plan: true,
          status: true,
        },
      },
    },
  });

  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  return user;
};

// ─── Forgot Password ─────────────────────────────────────────────────────────

export const forgotPassword = async (email) => {
  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success — don't reveal whether email exists
  if (!user) return;

  // Delete any existing unused tokens
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  const resetToken = generateSecureToken();
  const hashedToken = hashToken(resetToken);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token: hashedToken,
      expiresAt: getPasswordResetExpiry(),
    },
  });

  await sendPasswordResetEmail(email, resetToken);
};

// ─── Reset Password ──────────────────────────────────────────────────────────

export const resetPassword = async ({ token, password }) => {
  const hashedToken = hashToken(token);

  const resetRecord = await prisma.passwordResetToken.findUnique({
    where: { token: hashedToken },
  });

  if (!resetRecord || resetRecord.used || resetRecord.expiresAt < new Date()) {
    const error = new Error('This reset link is invalid or has expired.');
    error.statusCode = 400;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetRecord.userId },
      data: { password: hashedPassword },
    }),
    // Mark token as used
    prisma.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { used: true },
    }),
    // Invalidate all existing refresh sessions for security
    prisma.refreshSession.deleteMany({
      where: { userId: resetRecord.userId },
    }),
  ]);
};

// ─── Verify Email ─────────────────────────────────────────────────────────────

export const verifyEmail = async (token) => {
  const hashedToken = hashToken(token);

  const record = await prisma.emailVerificationToken.findUnique({
    where: { token: hashedToken },
  });

  if (!record || record.expiresAt < new Date()) {
    const error = new Error('Verification link is invalid or has expired.');
    error.statusCode = 400;
    throw error;
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { isEmailVerified: true },
    }),
    prisma.emailVerificationToken.delete({ where: { id: record.id } }),
  ]);
};
