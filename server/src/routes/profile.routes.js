/**
 * Profile routes
 * All routes require authentication (authenticate middleware).
 *
 * Route map:
 *   GET    /api/profile                          → getProfile
 *   PUT    /api/profile                          → updateProfile
 *   POST   /api/profile/photo                    → updatePhoto (multer)
 *
 *   POST   /api/profile/experiences              → createExperience
 *   PUT    /api/profile/experiences/:id          → updateExperience
 *   DELETE /api/profile/experiences/:id          → deleteExperience
 *   PUT    /api/profile/experiences/reorder      → reorderItems
 *
 *   POST   /api/profile/education                → createEducation
 *   PUT    /api/profile/education/:id            → updateEducation
 *   DELETE /api/profile/education/:id            → deleteEducation
 *   PUT    /api/profile/education/reorder        → reorderItems
 *
 *   POST   /api/profile/skills                   → createSkill
 *   PUT    /api/profile/skills/:id               → updateSkill
 *   DELETE /api/profile/skills/:id               → deleteSkill
 *   PUT    /api/profile/skills/reorder           → reorderItems
 *
 *   POST   /api/profile/projects                 → createProject
 *   PUT    /api/profile/projects/:id             → updateProject
 *   DELETE /api/profile/projects/:id             → deleteProject
 *   PUT    /api/profile/projects/reorder         → reorderItems
 *
 *   POST   /api/profile/certifications           → createCertification
 *   PUT    /api/profile/certifications/:id       → updateCertification
 *   DELETE /api/profile/certifications/:id       → deleteCertification
 *   PUT    /api/profile/certifications/reorder   → reorderItems
 */
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import * as profileController from '../controllers/profile.controller.js';
import {
  updateProfileSchema,
  createExperienceSchema,
  updateExperienceSchema,
  createEducationSchema,
  updateEducationSchema,
  createSkillSchema,
  updateSkillSchema,
  reorderItemsSchema,
  createProjectSchema,
  updateProjectSchema,
  createCertificationSchema,
  updateCertificationSchema,
} from '../validators/profile.validator.js';

const router = Router();

// All profile routes require a valid session
router.use(authenticate);

// ─── File upload (profile photo) ──────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `photo_${req.user.id}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase()) &&
               allowed.test(file.mimetype);
    ok ? cb(null, true) : cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
  },
});

// ─── Personal Info ────────────────────────────────────────────────────────────
router.get('/',      profileController.getProfile);
router.put('/',      validate(updateProfileSchema), profileController.updateProfile);
router.post('/photo', upload.single('photo'),       profileController.updatePhoto);

// ─── Reorder middleware factory ───────────────────────────────────────────────
// Sets req.resourceModel so the shared reorderItems controller knows which table to update
const setModel = (model) => (req, res, next) => {
  req.resourceModel = model;
  next();
};

// ─── Experiences ──────────────────────────────────────────────────────────────
// IMPORTANT: /reorder must come BEFORE /:id so Express doesn't treat "reorder" as an id param
router.put('/experiences/reorder', setModel('experience'), validate(reorderItemsSchema), profileController.reorderItems);
router.post('/experiences',        validate(createExperienceSchema), profileController.createExperience);
router.put('/experiences/:id',     validate(updateExperienceSchema), profileController.updateExperience);
router.delete('/experiences/:id',  profileController.deleteExperience);

// ─── Education ────────────────────────────────────────────────────────────────
router.put('/education/reorder', setModel('education'), validate(reorderItemsSchema), profileController.reorderItems);
router.post('/education',        validate(createEducationSchema),  profileController.createEducation);
router.put('/education/:id',     validate(updateEducationSchema),  profileController.updateEducation);
router.delete('/education/:id',  profileController.deleteEducation);

// ─── Skills ───────────────────────────────────────────────────────────────────
router.put('/skills/reorder', setModel('skill'), validate(reorderItemsSchema), profileController.reorderItems);
router.post('/skills',        validate(createSkillSchema),  profileController.createSkill);
router.put('/skills/:id',     validate(updateSkillSchema),  profileController.updateSkill);
router.delete('/skills/:id',  profileController.deleteSkill);

// ─── Projects ─────────────────────────────────────────────────────────────────
router.put('/projects/reorder', setModel('project'), validate(reorderItemsSchema), profileController.reorderItems);
router.post('/projects',        validate(createProjectSchema),  profileController.createProject);
router.put('/projects/:id',     validate(updateProjectSchema),  profileController.updateProject);
router.delete('/projects/:id',  profileController.deleteProject);

// ─── Certifications ───────────────────────────────────────────────────────────
router.put('/certifications/reorder', setModel('certification'), validate(reorderItemsSchema), profileController.reorderItems);
router.post('/certifications',        validate(createCertificationSchema),  profileController.createCertification);
router.put('/certifications/:id',     validate(updateCertificationSchema),  profileController.updateCertification);
router.delete('/certifications/:id',  profileController.deleteCertification);

export default router;
