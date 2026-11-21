/**
 * Profile API service — wraps all /api/profile endpoints.
 * Imported by profile section components and the profile page.
 */
import api from './api.js';

// ─── Personal Info ────────────────────────────────────────────────────────────
export const getProfile         = ()         => api.get('/profile');
export const updateProfile      = (data)     => api.put('/profile', data);
export const updateProfilePhoto = (formData) =>
  api.post('/profile/photo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

// ─── Experiences ──────────────────────────────────────────────────────────────
export const createExperience  = (data) => api.post('/profile/experiences', data);
export const updateExperience  = (id, data) => api.put(`/profile/experiences/${id}`, data);
export const deleteExperience  = (id)   => api.delete(`/profile/experiences/${id}`);
export const reorderExperiences = (items) => api.put('/profile/experiences/reorder', { items });

// ─── Education ────────────────────────────────────────────────────────────────
export const createEducation  = (data)      => api.post('/profile/education', data);
export const updateEducation  = (id, data)  => api.put(`/profile/education/${id}`, data);
export const deleteEducation  = (id)        => api.delete(`/profile/education/${id}`);
export const reorderEducation = (items)     => api.put('/profile/education/reorder', { items });

// ─── Skills ───────────────────────────────────────────────────────────────────
export const createSkill  = (data)     => api.post('/profile/skills', data);
export const updateSkill  = (id, data) => api.put(`/profile/skills/${id}`, data);
export const deleteSkill  = (id)       => api.delete(`/profile/skills/${id}`);
export const reorderSkills = (items)   => api.put('/profile/skills/reorder', { items });

// ─── Projects ─────────────────────────────────────────────────────────────────
export const createProject  = (data)     => api.post('/profile/projects', data);
export const updateProject  = (id, data) => api.put(`/profile/projects/${id}`, data);
export const deleteProject  = (id)       => api.delete(`/profile/projects/${id}`);
export const reorderProjects = (items)   => api.put('/profile/projects/reorder', { items });

// ─── Certifications ───────────────────────────────────────────────────────────
export const createCertification  = (data)     => api.post('/profile/certifications', data);
export const updateCertification  = (id, data) => api.put(`/profile/certifications/${id}`, data);
export const deleteCertification  = (id)       => api.delete(`/profile/certifications/${id}`);
export const reorderCertifications = (items)   => api.put('/profile/certifications/reorder', { items });
