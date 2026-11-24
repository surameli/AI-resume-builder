/**
 * Templates API service — fetches available resume templates.
 */
import api from './api.js';

export const DEFAULT_TEMPLATES = [
  { id: 'professional', name: 'Professional', slug: 'professional', category: 'professional', description: 'Clean, ATS-friendly single-column layout ideal for corporate roles.', isPremium: false, displayOrder: 1 },
  { id: 'modern', name: 'Modern', slug: 'modern', category: 'modern', description: 'Contemporary design with a subtle accent bar. Great for tech companies.', isPremium: false, displayOrder: 2 },
  { id: 'minimalist', name: 'Minimalist', slug: 'minimalist', category: 'minimalist', description: 'Stripped-back layout with maximum white space. Highly ATS-compatible.', isPremium: false, displayOrder: 3 },
  { id: 'creative', name: 'Creative', slug: 'creative', category: 'creative', description: 'Bold, expressive layout for design, marketing, and creative roles.', isPremium: true, displayOrder: 4 },
  { id: 'technical', name: 'Technical', slug: 'technical', category: 'technical', description: 'Developer-focused with skills matrix and project highlights.', isPremium: false, displayOrder: 5 },
  { id: 'executive', name: 'Executive', slug: 'executive', category: 'executive', description: 'Sophisticated layout for senior leadership and C-suite candidates.', isPremium: true, displayOrder: 6 },
  { id: 'graduate', name: 'Graduate', slug: 'graduate', category: 'graduate', description: 'Perfect for students and recent graduates entering the workforce.', isPremium: false, displayOrder: 7 },
  { id: 'academic', name: 'Academic', slug: 'academic', category: 'academic', description: 'Curriculum vitae style for academic, research, and teaching positions.', isPremium: false, displayOrder: 8 },
];

export const getTemplates = () => api.get('/templates');
