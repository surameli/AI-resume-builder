/**
 * Environment configuration
 * Centralizes all env variable access and validates required values at startup.
 * Import this instead of using process.env directly throughout the app.
 */
import dotenv from 'dotenv';
dotenv.config();

const required = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const optional = (key, defaultValue = '') => {
  return process.env[key] || defaultValue;
};

export const env = {
  NODE_ENV: optional('NODE_ENV', 'development'),
  PORT: parseInt(optional('PORT', '5000'), 10),
  isDev: optional('NODE_ENV', 'development') === 'development',
  isProd: process.env.NODE_ENV === 'production',

  // Database
  DATABASE_URL: required('DATABASE_URL'),

  // JWT
  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRES_IN: optional('JWT_ACCESS_EXPIRES_IN', '15m'),
  JWT_REFRESH_EXPIRES_IN: optional('JWT_REFRESH_EXPIRES_IN', '7d'),

  // Cookie
  COOKIE_SECRET: optional('COOKIE_SECRET', 'dev_cookie_secret'),

  // CORS
  CLIENT_URL: optional('CLIENT_URL', 'http://localhost:5173'),

  // Groq AI
  GROQ_API_KEY: optional('GROQ_API_KEY', ''),
  GROQ_MODEL: optional('GROQ_MODEL', 'llama-3.3-70b-versatile'),

  // Email
  SMTP_HOST: optional('SMTP_HOST', 'smtp.gmail.com'),
  SMTP_PORT: parseInt(optional('SMTP_PORT', '587'), 10),
  SMTP_USER: optional('SMTP_USER', ''),
  SMTP_PASS: optional('SMTP_PASS', ''),
  EMAIL_FROM: optional('EMAIL_FROM', 'noreply@careercraft.ai'),

  // App
  APP_NAME: optional('APP_NAME', 'CareerCraft AI'),
  APP_URL: optional('APP_URL', 'http://localhost:5000'),

  // AI Usage Limits
  FREE_AI_RESUME_LIMIT: parseInt(optional('FREE_AI_RESUME_LIMIT', '5'), 10),
  FREE_AI_COVER_LETTER_LIMIT: parseInt(optional('FREE_AI_COVER_LETTER_LIMIT', '3'), 10),
  FREE_AI_ATS_LIMIT: parseInt(optional('FREE_AI_ATS_LIMIT', '10'), 10),
  FREE_AI_ASSISTANT_LIMIT: parseInt(optional('FREE_AI_ASSISTANT_LIMIT', '50'), 10),
};
