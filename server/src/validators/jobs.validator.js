/**
 * Zod validation schemas for job description endpoints.
 */
import { z } from 'zod';

// ─── Create job description ──────────────────────────────────────────────────

export const createJobSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .min(1, 'Title is required')
    .max(200, 'Title must be under 200 characters')
    .trim(),

  company: z
    .string()
    .max(200, 'Company name must be under 200 characters')
    .trim()
    .optional()
    .nullable(),

  rawText: z
    .string({ required_error: 'Job description text is required' })
    .min(50, 'Job description is too short — please paste the full text')
    .max(50000, 'Job description is too long — maximum 50,000 characters')
    .trim(),

  // AI-extracted structured data (optional — can be saved without analysis)
  extractedData: z
    .record(z.any())
    .optional()
    .nullable(),

  isAnalyzed: z.boolean().default(false),
});

// ─── Update job description ───────────────────────────────────────────────────

export const updateJobSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200)
    .trim()
    .optional(),

  company: z
    .string()
    .max(200)
    .trim()
    .optional()
    .nullable(),

  rawText: z
    .string()
    .min(50, 'Job description is too short')
    .max(50000)
    .trim()
    .optional(),

  extractedData: z
    .record(z.any())
    .optional()
    .nullable(),

  isAnalyzed: z.boolean().optional(),
});

// ─── Analyze job (AI endpoint) ─────────────────────────────────────────────────

export const analyzeJobSchema = z.object({
  rawText: z
    .string({ required_error: 'Job description text is required' })
    .min(50, 'Job description is too short — please paste the full text')
    .max(50000, 'Job description is too long — maximum 50,000 characters')
    .trim(),
});

// ─── Validate AI-extracted data structure ─────────────────────────────────────
// Used after Groq returns a response — ensures the shape is correct before saving.

export const extractedDataSchema = z.object({
  jobTitle:                 z.string().nullable().optional(),
  company:                  z.string().nullable().optional(),
  location:                 z.string().nullable().optional(),
  employmentType:            z.string().nullable().optional(),
  remote:                    z.boolean().nullable().optional(),
  yearsOfExperience:         z.string().nullable().optional(),
  educationRequirements:    z.array(z.string()).optional().default([]),
  technicalSkills:           z.array(z.string()).optional().default([]),
  softSkills:                z.array(z.string()).optional().default([]),
  responsibilities:          z.array(z.string()).optional().default([]),
  requiredQualifications:   z.array(z.string()).optional().default([]),
  preferredQualifications:  z.array(z.string()).optional().default([]),
  atsKeywords:               z.array(z.string()).optional().default([]),
  salaryRange:               z.string().nullable().optional(),
  summary:                   z.string().nullable().optional(),
}).passthrough(); // Allow extra fields from AI — we just validate the known ones

/**
 * Sanitizes and normalizes the AI-extracted data.
 * Fills in empty arrays for missing list fields so the frontend
 * always gets a consistent shape.
 */
export const normalizeExtractedData = (data) => {
  const result = extractedDataSchema.safeParse(data);
  if (!result.success) {
    // If validation fails, return the raw data with defaults filled in
    return {
      jobTitle: null,
      company: null,
      location: null,
      employmentType: null,
      remote: null,
      yearsOfExperience: null,
      educationRequirements: [],
      technicalSkills: [],
      softSkills: [],
      responsibilities: [],
      requiredQualifications: [],
      preferredQualifications: [],
      atsKeywords: [],
      salaryRange: null,
      summary: null,
      ...data,
    };
  }
  return result.data;
};
