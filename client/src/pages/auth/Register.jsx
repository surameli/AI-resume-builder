/**
 * Register page — creates a new CareerCraft AI account.
 * Uses react-hook-form + Zod for client-side validation.
 * On success: redirects to /login with a success message.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';

import AuthLayout from '../../components/layout/AuthLayout.jsx';
import FormField from '../../components/forms/FormField.jsx';
import Button from '../../components/common/Button.jsx';
import Alert from '../../components/common/Alert.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

// ─── Validation schema (mirrors backend) ──────────────────────────────────────
const schema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(50),
  lastName:  z.string().min(2, 'Last name must be at least 2 characters').max(50),
  email:     z.string().email('Please enter a valid email address'),
  password:  z
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

const Register = () => {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    setServerError('');
    try {
      await registerUser({
        firstName: data.firstName,
        lastName:  data.lastName,
        email:     data.email,
        password:  data.password,
      });
      navigate('/login', {
        state: { successMessage: 'Account created! Please check your email to verify your account, then log in.' },
        replace: true,
      });
    } catch (err) {
      const msg = err?.response?.data?.message || 'Registration failed. Please try again.';
      setServerError(msg);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start building AI-powered resumes in minutes. Free to get started."
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {serverError && <Alert type="error" message={serverError} dismissible />}

        {/* Name row */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="First name"
            name="firstName"
            placeholder="Jane"
            register={register}
            error={errors.firstName}
            required
            autoComplete="given-name"
          />
          <FormField
            label="Last name"
            name="lastName"
            placeholder="Doe"
            register={register}
            error={errors.lastName}
            required
            autoComplete="family-name"
          />
        </div>

        <FormField
          label="Email address"
          name="email"
          type="email"
          placeholder="jane@example.com"
          register={register}
          error={errors.email}
          required
          autoComplete="email"
        />

        {/* Password with show/hide toggle */}
        <div className="space-y-1">
          <label htmlFor="password" className="form-label">
            Password <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="form-error" role="alert">{errors.password.message}</p>
          )}
        </div>

        <FormField
          label="Confirm password"
          name="confirmPassword"
          type="password"
          placeholder="Re-enter your password"
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
          Create account
        </Button>

        <p className="text-xs text-brand-muted text-center">
          By creating an account, you agree to our{' '}
          <Link to="/terms" className="text-brand-orange hover:underline">Terms of Service</Link>
          {' '}and{' '}
          <Link to="/privacy" className="text-brand-orange hover:underline">Privacy Policy</Link>.
        </p>

        <p className="text-center text-sm text-brand-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-orange font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default Register;
