/**
 * Resume API service — wraps all /api/resumes and resume-related /api/ai endpoints.
 */
import api from './api.js';

// ─── Resume CRUD ────────────────────────────────────────────────────────────────
export const getResumes   = ()           => api.get('/resumes');
export const getResume    = (id)         => api.get(`/resumes/${id}`);
export const createResume = (data)       => api.post('/resumes', data);
export const updateResume = (id, data)   => api.put(`/resumes/${id}`, data);
export const deleteResume = (id)         => api.delete(`/resumes/${id}`);
export const duplicateResume = (id)      => api.post(`/resumes/${id}/duplicate`);

// ─── Version History ──────────────────────────────────────────────────────────
export const getVersions    = (id)                      => api.get(`/resumes/${id}/versions`);
export const restoreVersion = (id, versionId)           => api.post(`/resumes/${id}/restore/${versionId}`);

// ─── AI Generation ──────────────────────────────────────────────────────────────
export const generateResume = (data)   => api.post('/ai/generate-resume', data);
export const improveContent = (data)   => api.post('/ai/improve-content', data);
