/**
 * Email utility using Nodemailer.
 * Sends password reset and verification emails.
 * In development, logs the email to console if SMTP is not configured.
 */
import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const createTransporter = () => {
  // If SMTP credentials are not set, use a no-op in dev
  if (!env.SMTP_USER || env.SMTP_USER === 'your_email@gmail.com') {
    return null;
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
};

const sendMail = async ({ to, subject, html }) => {
  const transporter = createTransporter();

  if (!transporter) {
    // Development fallback: print to console
    console.log('\n📧 EMAIL (dev mode - SMTP not configured)');
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Body: ${html.replace(/<[^>]*>/g, '')}`);
    console.log('');
    return { messageId: 'dev-console-fallback' };
  }

  const info = await transporter.sendMail({
    from: `"${env.APP_NAME}" <${env.EMAIL_FROM}>`,
    to,
    subject,
    html,
  });

  return info;
};

// ─── Email Templates ─────────────────────────────────────────────────────────

export const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${resetToken}`;

  await sendMail({
    to: email,
    subject: `Reset your ${env.APP_NAME} password`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #E58A45;">Reset Your Password</h2>
        <p>You requested a password reset for your ${env.APP_NAME} account.</p>
        <p>Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
        <a href="${resetUrl}"
           style="display:inline-block;padding:12px 24px;background:#E58A45;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">
          Reset Password
        </a>
        <p style="margin-top:24px;color:#85817B;font-size:13px;">
          If you did not request this, you can safely ignore this email.
          Your password will not change.
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
        <p style="color:#85817B;font-size:12px;">${env.APP_NAME} · ${env.APP_URL}</p>
      </div>
    `,
  });
};

export const sendEmailVerificationEmail = async (email, verifyToken) => {
  const verifyUrl = `${env.APP_URL}/api/auth/verify-email?token=${verifyToken}`;

  await sendMail({
    to: email,
    subject: `Verify your ${env.APP_NAME} email address`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #E58A45;">Verify Your Email</h2>
        <p>Welcome to ${env.APP_NAME}! Click below to verify your email address.</p>
        <a href="${verifyUrl}"
           style="display:inline-block;padding:12px 24px;background:#E58A45;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">
          Verify Email
        </a>
        <p style="margin-top:24px;color:#85817B;font-size:13px;">
          This link expires in 24 hours.
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
        <p style="color:#85817B;font-size:12px;">${env.APP_NAME} · ${env.APP_URL}</p>
      </div>
    `,
  });
};
