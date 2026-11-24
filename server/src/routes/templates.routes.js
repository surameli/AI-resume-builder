/**
 * Templates routes
 * Public — no authentication required (users can browse templates without logging in).
 *
 *   GET /api/templates → getAllTemplates
 */
import { Router } from 'express';
import { getAllTemplates } from '../controllers/templates.controller.js';
import { optionalAuth } from '../middleware/authenticate.js';

const router = Router();

// Optional auth so logged-in users get the same endpoint but it's not required
router.get('/', optionalAuth, getAllTemplates);

export default router;
