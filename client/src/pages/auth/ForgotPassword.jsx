/**
 * Forgot Password page — requests a password reset email.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Mail } from 'lucide-react';

import AuthLayout from '../../components/layout/AuthLayout.jsx';
import FormField from '../../components/forms/FormField.jsx';
import Button from '../../components/common/Button.jsx';
import Alert from '../../components/common/Alert.jsx';
import * as authService from '../../services/auth.service.js';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const ForgotPassword = () => {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async ({ email }) => {
    setServerError('');
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch {
      // Even on error, show success to prevent email enumeration
      setSent(true);
    }
  };

  if (sent) {
    return (
      <AuthLayout
        title="Check your email"
        subtitle="If an account with that address exists, we've sent a reset link."
      >
        <div className="space-y-6">
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-sm text-brand-muted text-center max-w-xs">
              The reset link expires in 1 hour. Check your spam folder if you don't see it.
            </p>
          </div>
          <Link to="/login" className="btn-secondary w-full flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email and we'll send you a reset link."
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {serverError && <Alert type="error" message={serverError} dismissible />}

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

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={isSubmitting}
          className="w-full mt-2"
        >
          Send reset link
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

export default ForgotPassword;
