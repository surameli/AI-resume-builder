/**
 * Cover Letter routes
 *   GET    /api/cover-letters            → getAllCoverLetters
 *   POST   /api/cover-letters            → createCoverLetter
 *   GET    /api/cover-letters/:id        → getCoverLetter
 *   PUT    /api/cover-letters/:id        → updateCoverLetter
 *   DELETE /api/cover-letters/:id        → deleteCoverLetter
 */
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import * as ctrl from '../controllers/coverLetters.controller.js';
import { createCoverLetterSchema, updateCoverLetterSchema } from '../validators/coverLetters.validator.js';

const router = Router();
router.use(authenticate);

router.get('/',      ctrl.getAllCoverLetters);
router.post('/',     validate(createCoverLetterSchema), ctrl.createCoverLetter);
router.get('/:id',   ctrl.getCoverLetter);
router.put('/:id',   validate(updateCoverLetterSchema), ctrl.updateCoverLetter);
router.delete('/:id', ctrl.deleteCoverLetter);

export default router;
