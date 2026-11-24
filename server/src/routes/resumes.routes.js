/**
 * Resume routes
 *
 * Route map:
 *   GET    /api/resumes                          → getAllResumes
 *   POST   /api/resumes                          → createResume
 *   GET    /api/resumes/:id                      → getResume
 *   PUT    /api/resumes/:id                      → updateResume
 *   DELETE /api/resumes/:id                      → deleteResume
 *   POST   /api/resumes/:id/duplicate            → duplicateResume
 *   GET    /api/resumes/:id/versions             → getVersions
 *   POST   /api/resumes/:id/restore/:versionId   → restoreVersion
 *
 * Note: /:id/duplicate, /:id/versions, /:id/restore/:versionId
 * are all sub-paths of /:id so they're matched after the base /:id route
 * since Express matches more specific paths first with method-level routing.
 */
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import * as resumesController from '../controllers/resumes.controller.js';
import {
  createResumeSchema,
  updateResumeSchema,
} from '../validators/resumes.validator.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ─── Collection routes ─────────────────────────────────────────────────────────
router.get('/',   resumesController.getAllResumes);
router.post('/',  validate(createResumeSchema), resumesController.createResume);

// ─── Item routes ───────────────────────────────────────────────────────────────
// Order matters: more specific paths (duplicate, versions, restore) before /:id
router.post('/:id/duplicate',           resumesController.duplicateResume);
router.get('/:id/versions',             resumesController.getVersions);
router.post('/:id/restore/:versionId',  resumesController.restoreVersion);

router.get('/:id',    resumesController.getResume);
router.put('/:id',    validate(updateResumeSchema), resumesController.updateResume);
router.delete('/:id', resumesController.deleteResume);

export default router;
