/**
 * Cover Letters API service — wraps /api/cover-letters and /api/ai endpoints.
 */
import api from './api.js';

// ─── CRUD ─────────────────────────────────────────────────────────────────────
export const getCoverLetters   = ()           => api.get('/cover-letters');
export const getCoverLetter    = (id)         => api.get(`/cover-letters/${id}`);
export const createCoverLetter = (data)       => api.post('/cover-letters', data);
export const updateCoverLetter = (id, data)   => api.put(`/cover-letters/${id}`, data);
export const deleteCoverLetter = (id)         => api.delete(`/cover-letters/${id}`);

// ─── AI ───────────────────────────────────────────────────────────────────────
export const generateCoverLetter = (data) => api.post('/ai/generate-cover-letter', data);
export const rewriteCoverLetter  = (data) => api.post('/ai/rewrite-cover-letter', data);
