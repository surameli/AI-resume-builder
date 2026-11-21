/**
 * Profile Controller — thin HTTP layer over profile.service.js.
 * Each function reads from req, calls a service function, and sends a response.
 */
import * as profileService from '../services/profile.service.js';
import {
  sendSuccess,
  sendCreated,
  sendNotFound,
} from '../utils/apiResponse.js';

// ─── Personal Info ────────────────────────────────────────────────────────────

/** GET /api/profile */
export const getProfile = async (req, res, next) => {
  try {
    const profile = await profileService.getFullProfile(req.user.id);
    const completion = profileService.calculateCompletion(profile);
    return sendSuccess(res, { profile, completion });
  } catch (err) {
    next(err);
  }
};

/** PUT /api/profile */
export const updateProfile = async (req, res, next) => {
  try {
    const profile = await profileService.updateProfile(req.user.id, req.body);
    const completion = profileService.calculateCompletion(profile);
    return sendSuccess(res, { profile, completion }, 'Profile updated');
  } catch (err) {
    next(err);
  }
};

/** POST /api/profile/photo — handled by multer before this controller */
export const updatePhoto = async (req, res, next) => {
  try {
    // multer has already saved the file; req.file contains the info
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // In production you would upload to S3/Cloudinary and store the URL.
    // For now we store a local path that the frontend can reference via the
    // static file serving middleware added in app.js.
    const photoUrl = `/uploads/${req.file.filename}`;
    const profile = await profileService.updateProfilePhoto(req.user.id, photoUrl);
    return sendSuccess(res, { photoUrl: profile.photoUrl }, 'Photo updated');
  } catch (err) {
    next(err);
  }
};

// ─── Experiences ──────────────────────────────────────────────────────────────

/** POST /api/profile/experiences */
export const createExperience = async (req, res, next) => {
  try {
    const experience = await profileService.createExperience(req.user.id, req.body);
    return sendCreated(res, { experience }, 'Experience added');
  } catch (err) {
    next(err);
  }
};

/** PUT /api/profile/experiences/:id */
export const updateExperience = async (req, res, next) => {
  try {
    const experience = await profileService.updateExperience(
      req.user.id,
      req.params.id,
      req.body
    );
    return sendSuccess(res, { experience }, 'Experience updated');
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/profile/experiences/:id */
export const deleteExperience = async (req, res, next) => {
  try {
    await profileService.deleteExperience(req.user.id, req.params.id);
    return sendSuccess(res, null, 'Experience deleted');
  } catch (err) {
    next(err);
  }
};

// ─── Education ────────────────────────────────────────────────────────────────

/** POST /api/profile/education */
export const createEducation = async (req, res, next) => {
  try {
    const education = await profileService.createEducation(req.user.id, req.body);
    return sendCreated(res, { education }, 'Education added');
  } catch (err) {
    next(err);
  }
};

/** PUT /api/profile/education/:id */
export const updateEducation = async (req, res, next) => {
  try {
    const education = await profileService.updateEducation(
      req.user.id,
      req.params.id,
      req.body
    );
    return sendSuccess(res, { education }, 'Education updated');
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/profile/education/:id */
export const deleteEducation = async (req, res, next) => {
  try {
    await profileService.deleteEducation(req.user.id, req.params.id);
    return sendSuccess(res, null, 'Education record deleted');
  } catch (err) {
    next(err);
  }
};

// ─── Skills ───────────────────────────────────────────────────────────────────

/** POST /api/profile/skills */
export const createSkill = async (req, res, next) => {
  try {
    const skill = await profileService.createSkill(req.user.id, req.body);
    return sendCreated(res, { skill }, 'Skill added');
  } catch (err) {
    next(err);
  }
};

/** PUT /api/profile/skills/:id */
export const updateSkill = async (req, res, next) => {
  try {
    const skill = await profileService.updateSkill(req.user.id, req.params.id, req.body);
    return sendSuccess(res, { skill }, 'Skill updated');
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/profile/skills/:id */
export const deleteSkill = async (req, res, next) => {
  try {
    await profileService.deleteSkill(req.user.id, req.params.id);
    return sendSuccess(res, null, 'Skill deleted');
  } catch (err) {
    next(err);
  }
};

// ─── Projects ─────────────────────────────────────────────────────────────────

/** POST /api/profile/projects */
export const createProject = async (req, res, next) => {
  try {
    const project = await profileService.createProject(req.user.id, req.body);
    return sendCreated(res, { project }, 'Project added');
  } catch (err) {
    next(err);
  }
};

/** PUT /api/profile/projects/:id */
export const updateProject = async (req, res, next) => {
  try {
    const project = await profileService.updateProject(
      req.user.id,
      req.params.id,
      req.body
    );
    return sendSuccess(res, { project }, 'Project updated');
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/profile/projects/:id */
export const deleteProject = async (req, res, next) => {
  try {
    await profileService.deleteProject(req.user.id, req.params.id);
    return sendSuccess(res, null, 'Project deleted');
  } catch (err) {
    next(err);
  }
};

// ─── Certifications ───────────────────────────────────────────────────────────

/** POST /api/profile/certifications */
export const createCertification = async (req, res, next) => {
  try {
    const certification = await profileService.createCertification(req.user.id, req.body);
    return sendCreated(res, { certification }, 'Certification added');
  } catch (err) {
    next(err);
  }
};

/** PUT /api/profile/certifications/:id */
export const updateCertification = async (req, res, next) => {
  try {
    const certification = await profileService.updateCertification(
      req.user.id,
      req.params.id,
      req.body
    );
    return sendSuccess(res, { certification }, 'Certification updated');
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/profile/certifications/:id */
export const deleteCertification = async (req, res, next) => {
  try {
    await profileService.deleteCertification(req.user.id, req.params.id);
    return sendSuccess(res, null, 'Certification deleted');
  } catch (err) {
    next(err);
  }
};

// ─── Reorder (shared handler) ─────────────────────────────────────────────────

/**
 * PUT /api/profile/experiences/reorder
 * PUT /api/profile/education/reorder
 * PUT /api/profile/skills/reorder
 * PUT /api/profile/projects/reorder
 * PUT /api/profile/certifications/reorder
 *
 * req.resourceModel is set by the route definition
 */
export const reorderItems = async (req, res, next) => {
  try {
    await profileService.reorderItems(req.user.id, req.resourceModel, req.body.items);
    return sendSuccess(res, null, 'Order updated');
  } catch (err) {
    next(err);
  }
};
