/**
 * AI routes — all endpoints that call the Groq AI service.
 * These are the most expensive operations in the app, so they have
 * their own stricter rate limiter (aiLimiter: 5 requests per minute).
 *
 * Route map:
 *   POST /api/ai/analyze-job          → analyzeJob (delegates to jobs controller)
 *   POST /api/ai/generate-resume      → (Phase 4)
 *   POST /api/ai/generate-cover-letter → (Phase 6)
 *   POST /api/ai/improve-content      → (Phase 4)
 *   POST /api/ai/career-assistant     → (Phase 10)
 *
 * For Phase 3, only analyze-job is implemented. Future endpoints
 * respond with 501 until their phase is built.
 */
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { analyzeJobSchema } from '../validators/jobs.validator.js';
import { analyzeJob } from '../controllers/jobs.controller.js';

const router = Router();

// All AI routes require authentication
router.use(authenticate);

// ─── Phase 3: Job Analysis ────────────────────────────────────────────────────
router.post('/analyze-job', aiLimiter, validate(analyzeJobSchema), analyzeJob);

// ─── Future phases (501 stubs) ─────────────────────────────────────────────────
router.post('/generate-resume',       (req, res) => res.status(501).json({ success: false, message: 'Resume generation coming in Phase 4' }));
router.post('/generate-cover-letter', (req, res) => res.status(501).json({ success: false, message: 'Cover letter generation coming in Phase 6' }));
router.post('/improve-content',       (req, res) => res.status(501).json({ success: false, message: 'Content improvement coming in Phase 4' }));
router.post('/career-assistant',      (req, res) => res.status(501).json({ success: false, message: 'Career assistant coming in Phase 10' }));

export default router;
