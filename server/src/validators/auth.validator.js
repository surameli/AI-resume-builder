/**
 * Zod validation schemas for auth routes.
 * The validate middleware (below) uses these to reject bad requests
 * before they reach the controller.
 */
import { z } from 'zod';

export const registerSchema = z.object({
  firstName: z
    .string({ required_error: 'First name is required' })
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be under 50 characters')
    .trim(),

  lastName: z
    .string({ required_error: 'Last name is required' })
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be under 50 characters')
    .trim(),

  email: z
    .string({ required_error: 'Email is required' })
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim(),

  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim(),

  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim(),
});

export const resetPasswordSchema = z.object({
  token: z
    .string({ required_error: 'Reset token is required' })
    .min(1, 'Reset token is required'),

  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const changePasswordSchema = z.object({
  currentPassword: z
    .string({ required_error: 'Current password is required' })
    .min(1, 'Current password is required'),

  newPassword: z
    .string({ required_error: 'New password is required' })
    .min(8, 'New password must be at least 8 characters')
    .max(128, 'New password is too long')
    .regex(/[A-Z]/, 'New password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'New password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'New password must contain at least one number'),
});
