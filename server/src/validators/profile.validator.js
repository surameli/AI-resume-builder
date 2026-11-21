/**
 * Zod validation schemas for all profile endpoints.
 * Matches the Prisma schema field names exactly.
 */
import { z } from 'zod';

// ─── Reusable helpers ─────────────────────────────────────────────────────────

/** Accepts ISO date strings (YYYY-MM-DD) or full ISO timestamps */
const dateString = (label) =>
  z
    .string({ required_error: `${label} is required` })
    .refine((v) => !isNaN(Date.parse(v)), { message: `${label} must be a valid date` });

const optionalDateString = z
  .string()
  .refine((v) => !v || !isNaN(Date.parse(v)), { message: 'Must be a valid date' })
  .optional()
  .nullable();

const urlField = z
  .string()
  .url('Must be a valid URL (e.g. https://example.com)')
  .optional()
  .nullable()
  .or(z.literal(''));

// ─── Personal Info (PUT /api/profile) ─────────────────────────────────────────

export const updateProfileSchema = z.object({
  firstName: z
    .string({ required_error: 'First name is required' })
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be under 50 characters')
    .trim(),

  lastName: z
    .string({ required_error: 'Last name is required' })
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be under 50 characters')
    .trim(),

  professionalTitle: z
    .string()
    .max(100, 'Title must be under 100 characters')
    .trim()
    .optional()
    .nullable(),

  phone: z
    .string()
    .max(30, 'Phone number must be under 30 characters')
    .trim()
    .optional()
    .nullable(),

  location: z
    .string()
    .max(100, 'Location must be under 100 characters')
    .trim()
    .optional()
    .nullable(),

  linkedinUrl: urlField,
  githubUrl:   urlField,
  portfolioUrl: urlField,

  summary: z
    .string()
    .max(2000, 'Summary must be under 2000 characters')
    .trim()
    .optional()
    .nullable(),
});

// ─── Experience (POST/PUT /api/profile/experiences) ───────────────────────────

const EMPLOYMENT_TYPES = [
  'FULL_TIME', 'PART_TIME', 'CONTRACT',
  'FREELANCE', 'INTERNSHIP', 'VOLUNTEER', 'OTHER',
];

// Base object (no refines) so .partial() works on it for updates
const experienceBaseSchema = z.object({
  company: z
    .string({ required_error: 'Company name is required' })
    .min(1, 'Company name is required')
    .max(150, 'Company name must be under 150 characters')
    .trim(),

  jobTitle: z
    .string({ required_error: 'Job title is required' })
    .min(1, 'Job title is required')
    .max(150, 'Job title must be under 150 characters')
    .trim(),

  employmentType: z
    .enum(EMPLOYMENT_TYPES, {
      errorMap: () => ({ message: 'Invalid employment type' }),
    })
    .default('FULL_TIME'),

  location: z
    .string()
    .max(100, 'Location must be under 100 characters')
    .trim()
    .optional()
    .nullable(),

  startDate: dateString('Start date'),
  endDate:   optionalDateString,
  isCurrent: z.boolean().default(false),

  responsibilities: z
    .string()
    .max(5000, 'Responsibilities must be under 5000 characters')
    .trim()
    .optional()
    .nullable(),

  achievements: z
    .string()
    .max(3000, 'Achievements must be under 3000 characters')
    .trim()
    .optional()
    .nullable(),

  displayOrder: z.number().int().min(0).default(0),
});

export const createExperienceSchema = experienceBaseSchema
  .refine(
    (d) => {
      if (!d.endDate) return true;
      return new Date(d.endDate) >= new Date(d.startDate);
    },
    { message: 'End date must be after start date', path: ['endDate'] }
  );

export const updateExperienceSchema = experienceBaseSchema.partial();

// ─── Education ────────────────────────────────────────────────────────────────

const educationBaseSchema = z.object({
  institution: z
    .string({ required_error: 'Institution name is required' })
    .min(1, 'Institution name is required')
    .max(200, 'Institution name must be under 200 characters')
    .trim(),

  degree: z
    .string({ required_error: 'Degree is required' })
    .min(1, 'Degree is required')
    .max(150, 'Degree must be under 150 characters')
    .trim(),

  fieldOfStudy: z
    .string()
    .max(150, 'Field of study must be under 150 characters')
    .trim()
    .optional()
    .nullable(),

  startDate: dateString('Start date'),
  graduationDate: optionalDateString,

  gpa: z
    .string()
    .max(10, 'GPA must be under 10 characters')
    .trim()
    .optional()
    .nullable(),

  description: z
    .string()
    .max(2000, 'Description must be under 2000 characters')
    .trim()
    .optional()
    .nullable(),

  displayOrder: z.number().int().min(0).default(0),
});

export const createEducationSchema = educationBaseSchema
  .refine(
    (d) => {
      if (!d.graduationDate) return true;
      return new Date(d.graduationDate) >= new Date(d.startDate);
    },
    { message: 'Graduation date must be after start date', path: ['graduationDate'] }
  );

export const updateEducationSchema = educationBaseSchema.partial();

// ─── Skills ───────────────────────────────────────────────────────────────────

const SKILL_CATEGORIES = [
  'TECHNICAL', 'PROGRAMMING_LANGUAGE', 'FRAMEWORK',
  'DATABASE', 'TOOL', 'SOFT_SKILL', 'OTHER',
];

export const createSkillSchema = z.object({
  name: z
    .string({ required_error: 'Skill name is required' })
    .min(1, 'Skill name is required')
    .max(100, 'Skill name must be under 100 characters')
    .trim(),

  category: z
    .enum(SKILL_CATEGORIES, {
      errorMap: () => ({ message: 'Invalid skill category' }),
    })
    .default('TECHNICAL'),

  proficiencyLevel: z
    .number()
    .int()
    .min(1, 'Level must be between 1 and 5')
    .max(5, 'Level must be between 1 and 5')
    .optional()
    .nullable(),

  displayOrder: z.number().int().min(0).default(0),
});

export const updateSkillSchema = createSkillSchema.partial();

/** Bulk-update display order for multiple skills */
export const reorderItemsSchema = z.object({
  items: z
    .array(
      z.object({
        id:           z.string().uuid('Invalid item ID'),
        displayOrder: z.number().int().min(0),
      })
    )
    .min(1, 'At least one item is required'),
});

// ─── Projects ─────────────────────────────────────────────────────────────────

const projectBaseSchema = z.object({
  name: z
    .string({ required_error: 'Project name is required' })
    .min(1, 'Project name is required')
    .max(150, 'Project name must be under 150 characters')
    .trim(),

  description: z
    .string()
    .max(3000, 'Description must be under 3000 characters')
    .trim()
    .optional()
    .nullable(),

  technologies: z
    .array(z.string().min(1).max(60).trim())
    .max(30, 'Maximum 30 technologies')
    .default([]),

  projectUrl: urlField,

  startDate: optionalDateString,
  endDate:   optionalDateString,

  displayOrder: z.number().int().min(0).default(0),
});

export const createProjectSchema = projectBaseSchema
  .refine(
    (d) => {
      if (!d.startDate || !d.endDate) return true;
      return new Date(d.endDate) >= new Date(d.startDate);
    },
    { message: 'End date must be after start date', path: ['endDate'] }
  );

export const updateProjectSchema = projectBaseSchema.partial();

// ─── Certifications ───────────────────────────────────────────────────────────

const certificationBaseSchema = z.object({
  name: z
    .string({ required_error: 'Certification name is required' })
    .min(1, 'Certification name is required')
    .max(200, 'Certification name must be under 200 characters')
    .trim(),

  issuingOrg: z
    .string({ required_error: 'Issuing organization is required' })
    .min(1, 'Issuing organization is required')
    .max(200, 'Organization name must be under 200 characters')
    .trim(),

  issueDate:      optionalDateString,
  expirationDate: optionalDateString,

  credentialUrl: urlField,

  displayOrder: z.number().int().min(0).default(0),
});

export const createCertificationSchema = certificationBaseSchema
  .refine(
    (d) => {
      if (!d.issueDate || !d.expirationDate) return true;
      return new Date(d.expirationDate) >= new Date(d.issueDate);
    },
    { message: 'Expiration date must be after issue date', path: ['expirationDate'] }
  );

export const updateCertificationSchema = certificationBaseSchema.partial();
