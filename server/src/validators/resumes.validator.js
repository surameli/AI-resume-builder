/**
 * Zod validation schemas for resume endpoints.
 * Validates both the resume metadata (title, template, settings) and
 * the flexible content JSON structure (summary, skills, experiences, etc.).
 */
import { z } from 'zod';

// ─── Resume content sub-schemas ──────────────────────────────────────────────
// These validate the JSON stored in Resume.content.
// All fields are optional since a resume might not have every section.

const experienceItemSchema = z.object({
  company:       z.string().max(150).optional(),
  jobTitle:      z.string().max(150).optional(),
  location:      z.string().max(100).nullable().optional(),
  startDate:      z.string().nullable().optional(),
  endDate:        z.string().nullable().optional(),
  isCurrent:     z.boolean().optional(),
  bulletPoints:  z.array(z.string().max(500)).optional(),
}).passthrough();

const educationItemSchema = z.object({
  institution:    z.string().max(200).optional(),
  degree:         z.string().max(150).optional(),
  fieldOfStudy:   z.string().max(150).nullable().optional(),
  startDate:      z.string().nullable().optional(),
  graduationDate: z.string().nullable().optional(),
  description:    z.string().max(2000).nullable().optional(),
}).passthrough();

const projectItemSchema = z.object({
  name:         z.string().max(150).optional(),
  description:  z.string().max(3000).nullable().optional(),
  technologies: z.array(z.string()).optional(),
  projectUrl:   z.string().url().nullable().optional().or(z.literal('')),
}).passthrough();

const certificationItemSchema = z.object({
  name:          z.string().max(200).optional(),
  issuingOrg:    z.string().max(200).optional(),
  issueDate:     z.string().nullable().optional(),
  credentialUrl: z.string().url().nullable().optional().or(z.literal('')),
}).passthrough();

const customSectionSchema = z.object({
  title:   z.string().max(100),
  content: z.array(z.string()),
}).passthrough();

export const resumeContentSchema = z.object({
  summary:        z.string().max(2000).nullable().optional(),
  skills:         z.array(z.string().max(100)).optional(),
  experiences:    z.array(experienceItemSchema).optional(),
  education:      z.array(educationItemSchema).optional(),
  projects:       z.array(projectItemSchema).optional(),
  certifications: z.array(certificationItemSchema).optional(),
  customSections: z.array(customSectionSchema).optional(),
}).passthrough();

// ─── Resume settings schema ──────────────────────────────────────────────────

export const resumeSettingsSchema = z.object({
  font:           z.string().optional(),
  fontSize:       z.number().int().min(8).max(16).optional(),
  accentColor:    z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  margins:        z.object({ top: z.number(), bottom: z.number(), left: z.number(), right: z.number() }).optional(),
  sectionsOrder:  z.array(z.string()).optional(),
  templateSlug:   z.string().optional(),
}).passthrough();

// ─── Create resume ─────────────────────────────────────────────────────────────

export const createResumeSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .min(1, 'Title is required')
    .max(200, 'Title must be under 200 characters')
    .trim(),

  jobDescriptionId: z.string().uuid().optional().nullable(),
  templateId:       z.string().uuid().optional().nullable(),

  content: resumeContentSchema,

  settings: resumeSettingsSchema.optional().nullable(),

  language: z.string().max(5).default('en'),
  tone:     z.string().max(50).default('professional'),
});

// ─── Update resume ─────────────────────────────────────────────────────────────

export const updateResumeSchema = z.object({
  title:            z.string().min(1).max(200).trim().optional(),
  jobDescriptionId: z.string().uuid().optional().nullable(),
  templateId:       z.string().uuid().optional().nullable(),
  content:          resumeContentSchema.optional(),
  settings:         resumeSettingsSchema.optional().nullable(),
  language:         z.string().max(5).optional(),
  tone:             z.string().max(50).optional(),
});

// ─── AI generate resume ─────────────────────────────────────────────────────────

export const generateResumeSchema = z.object({
  jobDescriptionId: z.string().uuid().optional().nullable(),
  templateId:       z.string().uuid().optional().nullable(),

  preferences: z.object({
    tone:             z.enum(['professional', 'confident', 'friendly', 'concise']).default('professional'),
    language:         z.string().max(5).default('en'),
    length:           z.enum(['short', 'medium', 'full']).default('medium'),
    includeSections:  z.array(z.string()).optional(),
  }).default({}),

  // Optional: provide a custom title for the resume
  title: z.string().max(200).optional().nullable(),
});

// ─── AI improve content ────────────────────────────────────────────────────────

export const improveContentSchema = z.object({
  content: z
    .string({ required_error: 'Content is required' })
    .min(1, 'Content is required')
    .max(5000, 'Content is too long (max 5000 characters)'),

  instructions: z
    .string()
    .max(500)
    .optional()
    .default(''),
});
