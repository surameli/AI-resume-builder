/**
 * Resume Controller — thin HTTP layer over resumes.service.js and ai.service.js.
 */
import * as resumeService from '../services/resumes.service.js';
import {
  generateResume as aiGenerateResume,
  improveContent as aiImproveContent,
  recordAIUsage,
} from '../services/ai.service.js';
import {
  sendSuccess,
  sendCreated,
} from '../utils/apiResponse.js';

// ─── CRUD ──────────────────────────────────────────────────────────────────────

/** GET /api/resumes */
export const getAllResumes = async (req, res, next) => {
  try {
    const resumes = await resumeService.getAllResumes(req.user.id);
    return sendSuccess(res, { resumes });
  } catch (err) {
    next(err);
  }
};

/** GET /api/resumes/:id */
export const getResume = async (req, res, next) => {
  try {
    const resume = await resumeService.getResumeById(req.user.id, req.params.id);
    return sendSuccess(res, { resume });
  } catch (err) {
    next(err);
  }
};

/** POST /api/resumes */
export const createResume = async (req, res, next) => {
  try {
    const resume = await resumeService.createResume(req.user.id, req.body);
    return sendCreated(res, { resume }, 'Resume created');
  } catch (err) {
    next(err);
  }
};

/** PUT /api/resumes/:id */
export const updateResume = async (req, res, next) => {
  try {
    const resume = await resumeService.updateResume(req.user.id, req.params.id, req.body);
    return sendSuccess(res, { resume }, 'Resume updated');
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/resumes/:id */
export const deleteResume = async (req, res, next) => {
  try {
    await resumeService.deleteResume(req.user.id, req.params.id);
    return sendSuccess(res, null, 'Resume deleted');
  } catch (err) {
    next(err);
  }
};

// ─── Duplicate ─────────────────────────────────────────────────────────────────

/** POST /api/resumes/:id/duplicate */
export const duplicateResume = async (req, res, next) => {
  try {
    const resume = await resumeService.duplicateResume(req.user.id, req.params.id);
    return sendCreated(res, { resume }, 'Resume duplicated');
  } catch (err) {
    next(err);
  }
};

// ─── Version History ───────────────────────────────────────────────────────────

/** GET /api/resumes/:id/versions */
export const getVersions = async (req, res, next) => {
  try {
    const versions = await resumeService.getVersions(req.user.id, req.params.id);
    return sendSuccess(res, { versions });
  } catch (err) {
    next(err);
  }
};

/** POST /api/resumes/:id/restore/:versionId */
export const restoreVersion = async (req, res, next) => {
  try {
    const resume = await resumeService.restoreVersion(
      req.user.id,
      req.params.id,
      req.params.versionId
    );
    return sendSuccess(res, { resume }, 'Version restored');
  } catch (err) {
    next(err);
  }
};

// ─── AI Generation ─────────────────────────────────────────────────────────────

/**
 * POST /api/ai/generate-resume
 * Generates a resume using AI based on the user's profile and optionally
 * a target job description. Returns the generated content — does NOT save it.
 * The frontend displays it for review, then the user saves via POST /api/resumes.
 */
export const generateResume = async (req, res, next) => {
  try {
    const { jobDescriptionId, preferences, title } = req.body;
    const { content, usage } = await aiGenerateResume(req.user.id, {
      jobDescriptionId,
      preferences,
    });

    return sendSuccess(res, { content, usage }, 'Resume generated successfully');
  } catch (err) {
    // Record failed AI usage for tracking (unless it's a usage limit error)
    if (err.statusCode !== 429 && err.statusCode !== 400) {
      await recordAIUsage(req.user.id, 'GENERATE_RESUME', 0, false, { error: err.message });
    }

    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
      });
    }

    next(err);
  }
};

/**
 * POST /api/ai/improve-content
 * Improves a piece of resume content using AI.
 * Returns the improved text — does NOT save it.
 */
export const improveContent = async (req, res, next) => {
  try {
    const { content, instructions } = req.body;
    const { improvedContent, usage } = await aiImproveContent(
      req.user.id,
      content,
      instructions
    );

    return sendSuccess(res, { improvedContent, usage }, 'Content improved');
  } catch (err) {
    if (err.statusCode !== 429) {
      await recordAIUsage(req.user.id, 'IMPROVE_CONTENT', 0, false, { error: err.message });
    }

    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
      });
    }

    next(err);
  }
};
