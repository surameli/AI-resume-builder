/**
 * Login page — authenticates the user and stores the session as HTTP-only cookies.
 * On success: redirects to /dashboard (or wherever the user was trying to go).
 */
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';

import AuthLayout from '../../components/layout/AuthLayout.jsx';
import FormField from '../../components/forms/FormField.jsx';
import Button from '../../components/common/Button.jsx';
import Alert from '../../components/common/Alert.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const schema = z.object({
  email:    z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Message passed from register redirect or reset-password success
  const successMessage = location.state?.successMessage || '';
  // Where to redirect after login
  const from = location.state?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    setServerError('');
    try {
      await login(data);
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message || 'Invalid email or password.';
      setServerError(msg);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your CareerCraft AI account."
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {successMessage && <Alert type="success" message={successMessage} dismissible />}
        {serverError    && <Alert type="error"   message={serverError}   dismissible />}

        {/* Email verification success */}
        {location.search.includes('verified=true') && (
          <Alert type="success" message="Email verified! You can now log in." dismissible />
        )}

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

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="form-label mb-0">
              Password <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
            </label>
            <Link
              to="/forgot-password"
              className="text-xs text-brand-orange hover:underline font-medium"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              autoComplete="current-password"
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

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={isSubmitting}
          className="w-full mt-2"
        >
          Sign in
        </Button>

        <p className="text-center text-sm text-brand-muted">
          Don't have an account?{' '}
          <Link to="/register" className="text-brand-orange font-medium hover:underline">
            Create one free
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default Login;
