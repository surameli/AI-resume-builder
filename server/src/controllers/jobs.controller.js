/**
 * Jobs Controller — thin HTTP layer over jobs.service.js and ai.service.js.
 * Each function reads from req, calls a service function, and sends a response.
 */
import * as jobsService  from '../services/jobs.service.js';
import { analyzeJobDescription, recordAIUsage } from '../services/ai.service.js';
import { normalizeExtractedData } from '../validators/jobs.validator.js';
import {
  sendSuccess,
  sendCreated,
} from '../utils/apiResponse.js';

// ─── GET /api/jobs — list all saved job descriptions ──────────────────────────

export const getAllJobs = async (req, res, next) => {
  try {
    const jobs = await jobsService.getAllJobs(req.user.id);
    return sendSuccess(res, { jobs });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/jobs/:id — get a single job description ──────────────────────────

export const getJob = async (req, res, next) => {
  try {
    const job = await jobsService.getJobById(req.user.id, req.params.id);
    return sendSuccess(res, { job });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/jobs — save a new job description ───────────────────────────────

export const createJob = async (req, res, next) => {
  try {
    const job = await jobsService.createJob(req.user.id, req.body);
    return sendCreated(res, { job }, 'Job description saved');
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/jobs/:id — update a saved job description ────────────────────────

export const updateJob = async (req, res, next) => {
  try {
    const job = await jobsService.updateJob(req.user.id, req.params.id, req.body);
    return sendSuccess(res, { job }, 'Job description updated');
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/jobs/:id — delete a saved job description ──────────────────────

export const deleteJob = async (req, res, next) => {
  try {
    await jobsService.deleteJob(req.user.id, req.params.id);
    return sendSuccess(res, null, 'Job description deleted');
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/jobs/analyze — analyze raw job text with Groq AI ──────────────────
// Does NOT save to the database — returns the extracted data so the frontend
// can display it for editing before the user saves.

export const analyzeJob = async (req, res, next) => {
  try {
    const { rawText } = req.body;
    const { extractedData, usage } = await analyzeJobDescription(req.user.id, rawText);
    return sendSuccess(res, { extractedData, usage }, 'Analysis complete');
  } catch (err) {
    // Record failed AI usage for tracking
    if (err.statusCode !== 429) {
      await recordAIUsage(req.user.id, 'ANALYZE_JOB', 0, false, { error: err.message });
    }

    // Forward Groq-specific errors with their status codes
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
      });
    }

    next(err);
  }
};

// ─── POST /api/jobs/save-analyzed — save a job with extracted data ──────────────
// Convenience endpoint: saves the job description AND the AI-extracted data
// in one call, so the frontend doesn't need two separate requests.

export const saveAnalyzedJob = async (req, res, next) => {
  try {
    // Normalize the extracted data before saving
    const normalizedData = normalizeExtractedData(req.body.extractedData);

    const job = await jobsService.createJob(req.user.id, {
      title:        req.body.title,
      company:      req.body.company,
      rawText:      req.body.rawText,
      extractedData: normalizedData,
      isAnalyzed:   true,
    });

    return sendCreated(res, { job }, 'Job description saved with AI analysis');
  } catch (err) {
    next(err);
  }
};
