/**
 * Express application setup.
 * Configures all middleware, routes, and error handlers.
 * Kept separate from server.js so it can be imported in tests.
 */
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';

// Route modules
import authRoutes      from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import profileRoutes   from './routes/profile.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// ─── Security Headers ────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true, // Required for HTTP-only cookies
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Request Parsing ─────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(env.COOKIE_SECRET));

// ─── Logging ─────────────────────────────────────────────────────────────────
if (env.isDev) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ─── Trust Proxy ─────────────────────────────────────────────────────────────
// Needed so req.ip returns the real IP behind a proxy/load balancer
app.set('trust proxy', 1);

// ─── Global Rate Limiter ─────────────────────────────────────────────────────
app.use('/api', apiLimiter);

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'CareerCraft AI API is running',
    env: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─── Static Files (uploaded profile photos) ──────────────────────────────────
// Serves /uploads/* as static files so profile photos can be accessed by the frontend.
// In production, replace this with a CDN/S3 URL stored in the database.
app.use('/uploads', express.static(path.join(__dirname, '..', '..', 'uploads')));

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/profile',   profileRoutes);

// Placeholder routes for future phases — respond with 501
app.use('/api/resumes', (req, res) => {
  res.status(501).json({ success: false, message: 'Resumes API coming in Phase 4' });
});
app.use('/api/jobs', (req, res) => {
  res.status(501).json({ success: false, message: 'Jobs API coming in Phase 3' });
});

// ─── 404 & Error Handlers ────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
