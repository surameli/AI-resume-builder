/**
 * AI routes — all endpoints that call the Groq AI service.
 * These are the most expensive operations in the app, so they have
 * their own stricter rate limiter (aiLimiter: 5 requests per minute).
 *
 * Route map:
 *   POST /api/ai/analyze-job          → Phase 3 ✅
 *   POST /api/ai/generate-resume      → Phase 4 ✅
 *   POST /api/ai/improve-content      → Phase 4 ✅
 *   POST /api/ai/generate-cover-letter → (Phase 6)
 *   POST /api/ai/career-assistant     → (Phase 10)
 */
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { analyzeJobSchema } from '../validators/jobs.validator.js';
import { generateResumeSchema, improveContentSchema } from '../validators/resumes.validator.js';
import { analyzeJob } from '../controllers/jobs.controller.js';
import { generateResume, improveContent } from '../controllers/resumes.controller.js';

const router = Router();

// All AI routes require authentication
router.use(authenticate);

// ─── Phase 3: Job Analysis ────────────────────────────────────────────────────
router.post('/analyze-job', aiLimiter, validate(analyzeJobSchema), analyzeJob);

// ─── Phase 4: Resume Generation & Content Improvement ──────────────────────────
router.post('/generate-resume', aiLimiter, validate(generateResumeSchema), generateResume);
router.post('/improve-content', aiLimiter, validate(improveContentSchema), improveContent);

// ─── Future phases (501 stubs) ─────────────────────────────────────────────────
router.post('/generate-cover-letter', (req, res) => res.status(501).json({ success: false, message: 'Cover letter generation coming in Phase 6' }));
router.post('/career-assistant',      (req, res) => res.status(501).json({ success: false, message: 'Career assistant coming in Phase 10' }));

export default router;
