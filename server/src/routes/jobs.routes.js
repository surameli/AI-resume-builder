/**
 * Job Description routes
 *
 * Route map:
 *   GET    /api/jobs              → getAllJobs (list saved jobs)
 *   POST   /api/jobs              → createJob  (save raw job text)
 *   GET    /api/jobs/:id          → getJob     (get full job with extracted data)
 *   PUT    /api/jobs/:id          → updateJob  (edit saved job)
 *   DELETE /api/jobs/:id          → deleteJob
 *   POST   /api/jobs/analyze      → analyzeJob (AI extraction — no save)
 *   POST   /api/jobs/save-analyzed → saveAnalyzedJob (save with AI data)
 *
 * Note: /analyze and /save-analyzed are placed BEFORE /:id so Express
 * doesn't treat them as id parameters.
 */
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import * as jobsController from '../controllers/jobs.controller.js';
import {
  createJobSchema,
  updateJobSchema,
  analyzeJobSchema,
} from '../validators/jobs.validator.js';
import { z } from 'zod';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ─── AI analysis endpoints (stricter rate limit, placed before /:id) ──────────
router.post('/analyze', aiLimiter, validate(analyzeJobSchema), jobsController.analyzeJob);

// Save with analyzed data — has its own schema inline since it combines fields
const saveAnalyzedSchema = z.object({
  title:         z.string().min(1, 'Title is required').max(200).trim(),
  company:       z.string().max(200).trim().optional().nullable(),
  rawText:       z.string().min(50, 'Job description is too short').max(50000).trim(),
  extractedData: z.record(z.any()).optional().nullable(),
});
router.post('/save-analyzed', validate(saveAnalyzedSchema), jobsController.saveAnalyzedJob);

// ─── CRUD endpoints ────────────────────────────────────────────────────────────
router.get('/',          jobsController.getAllJobs);
router.post('/',         validate(createJobSchema), jobsController.createJob);
router.get('/:id',       jobsController.getJob);
router.put('/:id',       validate(updateJobSchema), jobsController.updateJob);
router.delete('/:id',    jobsController.deleteJob);

export default router;
