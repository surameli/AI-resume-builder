/**
 * AI routes
 *   POST /api/ai/analyze-job           → Phase 3 ✅
 *   POST /api/ai/generate-resume       → Phase 4 ✅
 *   POST /api/ai/improve-content       → Phase 4 ✅
 *   POST /api/ai/generate-cover-letter → Phase 6 ✅
 *   POST /api/ai/rewrite-cover-letter  → Phase 6 ✅
 *   POST /api/ai/career-assistant      → Phase 10
 */
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { analyzeJobSchema } from '../validators/jobs.validator.js';
import { generateResumeSchema, improveContentSchema } from '../validators/resumes.validator.js';
import { generateCoverLetterSchema, rewriteCoverLetterSchema } from '../validators/coverLetters.validator.js';
import { analyzeJob } from '../controllers/jobs.controller.js';
import { generateResume, improveContent } from '../controllers/resumes.controller.js';
import {
  generateCoverLetterHandler,
  rewriteCoverLetterHandler,
} from '../controllers/coverLetters.controller.js';

const router = Router();
router.use(authenticate);

// Phase 3
router.post('/analyze-job',          aiLimiter, validate(analyzeJobSchema),          analyzeJob);
// Phase 4
router.post('/generate-resume',      aiLimiter, validate(generateResumeSchema),      generateResume);
router.post('/improve-content',      aiLimiter, validate(improveContentSchema),      improveContent);
// Phase 6
router.post('/generate-cover-letter', aiLimiter, validate(generateCoverLetterSchema), generateCoverLetterHandler);
router.post('/rewrite-cover-letter',  aiLimiter, validate(rewriteCoverLetterSchema),  rewriteCoverLetterHandler);
// Phase 10
router.post('/career-assistant', (req, res) => res.status(501).json({ success: false, message: 'Career assistant coming in Phase 10' }));

export default router;
