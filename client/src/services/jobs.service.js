/**
 * Jobs API service — wraps all /api/jobs and /api/ai endpoints for job analysis.
 */
import api from './api.js';

// ─── Saved job descriptions CRUD ──────────────────────────────────────────────
export const getJobs    = ()         => api.get('/jobs');
export const getJob     = (id)       => api.get(`/jobs/${id}`);
export const createJob  = (data)     => api.post('/jobs', data);
export const updateJob  = (id, data) => api.put(`/jobs/${id}`, data);
export const deleteJob = (id)       => api.delete(`/jobs/${id}`);

// ─── AI job analysis ──────────────────────────────────────────────────────────

/**
 * Sends raw job text to the AI for analysis.
 * Returns extracted structured data (does NOT save to database).
 */
export const analyzeJob = (rawText) => api.post('/ai/analyze-job', { rawText });

/**
 * Saves a job description with AI-extracted data in one call.
 */
export const saveAnalyzedJob = (data) => api.post('/jobs/save-analyzed', data);
