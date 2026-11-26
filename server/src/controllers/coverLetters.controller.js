/**
 * Cover Letters Controller — thin HTTP layer over coverLetters.service.js
 * and the AI generateCoverLetter / rewriteCoverLetter functions.
 */
import * as clService from '../services/coverLetters.service.js';
import { generateCoverLetter, rewriteCoverLetter, recordAIUsage } from '../services/ai.service.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const getAllCoverLetters = async (req, res, next) => {
  try {
    const coverLetters = await clService.getAllCoverLetters(req.user.id);
    return sendSuccess(res, { coverLetters });
  } catch (err) { next(err); }
};

export const getCoverLetter = async (req, res, next) => {
  try {
    const coverLetter = await clService.getCoverLetterById(req.user.id, req.params.id);
    return sendSuccess(res, { coverLetter });
  } catch (err) { next(err); }
};

export const createCoverLetter = async (req, res, next) => {
  try {
    const coverLetter = await clService.createCoverLetter(req.user.id, req.body);
    return sendCreated(res, { coverLetter }, 'Cover letter created');
  } catch (err) { next(err); }
};

export const updateCoverLetter = async (req, res, next) => {
  try {
    const coverLetter = await clService.updateCoverLetter(req.user.id, req.params.id, req.body);
    return sendSuccess(res, { coverLetter }, 'Cover letter updated');
  } catch (err) { next(err); }
};

export const deleteCoverLetter = async (req, res, next) => {
  try {
    await clService.deleteCoverLetter(req.user.id, req.params.id);
    return sendSuccess(res, null, 'Cover letter deleted');
  } catch (err) { next(err); }
};

// ─── AI Generation ─────────────────────────────────────────────────────────────

/**
 * POST /api/ai/generate-cover-letter
 * Returns generated content — does NOT save to DB.
 * The frontend shows it for review, then saves via POST /api/cover-letters.
 */
export const generateCoverLetterHandler = async (req, res, next) => {
  try {
    const { jobDescriptionId, resumeId, preferences } = req.body;
    const result = await generateCoverLetter(req.user.id, { jobDescriptionId, resumeId, preferences });
    return sendSuccess(res, result, 'Cover letter generated');
  } catch (err) {
    if (err.statusCode !== 429 && err.statusCode !== 400) {
      await recordAIUsage(req.user.id, 'GENERATE_COVER_LETTER', 0, false, { error: err.message });
    }
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    next(err);
  }
};

/**
 * POST /api/ai/rewrite-cover-letter
 * Rewrites existing cover letter content per instructions.
 */
export const rewriteCoverLetterHandler = async (req, res, next) => {
  try {
    const { body, instructions } = req.body;
    const result = await rewriteCoverLetter(req.user.id, body, instructions);
    return sendSuccess(res, result, 'Cover letter rewritten');
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    next(err);
  }
};
