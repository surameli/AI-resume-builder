/**
 * Zod validation schemas for cover letter endpoints.
 */
import { z } from 'zod';

export const createCoverLetterSchema = z.object({
  title:            z.string({ required_error: 'Title is required' }).min(1).max(200).trim(),
  content:          z.string({ required_error: 'Content is required' }).min(1).max(10000).trim(),
  jobDescriptionId: z.string().uuid().optional().nullable(),
  resumeId:         z.string().uuid().optional().nullable(),
  tone:             z.string().max(50).default('professional'),
});

export const updateCoverLetterSchema = z.object({
  title:            z.string().min(1).max(200).trim().optional(),
  content:          z.string().min(1).max(10000).trim().optional(),
  jobDescriptionId: z.string().uuid().optional().nullable(),
  resumeId:         z.string().uuid().optional().nullable(),
  tone:             z.string().max(50).optional(),
});

export const generateCoverLetterSchema = z.object({
  jobDescriptionId: z.string().uuid().optional().nullable(),
  resumeId:         z.string().uuid().optional().nullable(),
  preferences: z.object({
    tone:           z.enum(['professional', 'confident', 'enthusiastic', 'concise']).default('professional'),
    length:         z.enum(['short', 'standard']).default('standard'),
    recipientName:  z.string().max(100).optional().nullable(),
    recipientTitle: z.string().max(100).optional().nullable(),
  }).default({}),
  title: z.string().max(200).optional().nullable(),
});

export const rewriteCoverLetterSchema = z.object({
  body:         z.string().min(1).max(10000, 'Content too long'),
  instructions: z.string().min(1, 'Instructions are required').max(500),
});
