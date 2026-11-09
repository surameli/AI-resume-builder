/**
 * Reset Password page — consumes the token from the URL query string
 * and lets the user set a new password.
 */
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';

import AuthLayout from '../../components/layout/AuthLayout.jsx';
import FormField from '../../components/forms/FormField.jsx';
import Button from '../../components/common/Button.jsx';
import Alert from '../../components/common/Alert.jsx';
import * as authService from '../../services/auth.service.js';

const schema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  if (!token) {
    return (
      <AuthLayout title="Invalid reset link" subtitle="This link is missing or malformed.">
        <Alert
          type="error"
          message="This reset link is invalid. Please request a new one."
        />
        <Link to="/forgot-password" className="btn-primary w-full mt-4 flex items-center justify-center">
          Request new link
        </Link>
      </AuthLayout>
    );
  }

  const onSubmit = async (data) => {
    setServerError('');
    try {
      await authService.resetPassword({ token, password: data.password });
      navigate('/login', {
        state: { successMessage: 'Password reset successfully. Please sign in.' },
        replace: true,
      });
    } catch (err) {
      const msg = err?.response?.data?.message || 'This reset link is invalid or has expired.';
      setServerError(msg);
    }
  };

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Choose a strong password for your account."
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {serverError && <Alert type="error" message={serverError} dismissible />}

        <div className="space-y-1">
          <label htmlFor="password" className="form-label">
            New password <span className="text-red-500 ml-0.5">*</span>
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Min. 8 chars, 1 uppercase, 1 number"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              className={`form-input pr-10 ${errors.password ? 'form-input-error' : ''}`}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="form-error">{errors.password.message}</p>}
        </div>

        <FormField
          label="Confirm new password"
          name="confirmPassword"
          type="password"
          placeholder="Re-enter your new password"
          register={register}
          error={errors.confirmPassword}
          required
          autoComplete="new-password"
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={isSubmitting}
          className="w-full mt-2"
        >
          Reset password
        </Button>

        <Link
          to="/login"
          className="flex items-center justify-center gap-2 text-sm text-brand-muted hover:text-brand-text transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </Link>
      </form>
    </AuthLayout>
  );
};

export default ResetPassword;
