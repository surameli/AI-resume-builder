/**
 * AI Service — orchestrates Groq AI calls and records usage.
 *
 * Phase 3 implements: analyzeJobDescription
 * Future phases add: generateResume, generateCoverLetter, etc.
 *
 * Every AI call:
 * 1. Checks the user's usage limits (free tier caps).
 * 2. Calls Groq via the groq.js client.
 * 3. Records an AIUsage entry in the database (for quota tracking).
 */
import prisma from '../config/database.js';
import { callGroqJSON, GroqError } from '../utils/groq.js';
import { normalizeCoverLetterResponse } from '../utils/coverLetterResponse.js';
import {
  JOB_ANALYSIS_SYSTEM_PROMPT,
  buildJobAnalysisUserPrompt,
} from '../prompts/jobAnalysis.js';
import { normalizeExtractedData } from '../validators/jobs.validator.js';
import { env } from '../config/env.js';

// ─── AI usage limit checking ──────────────────────────────────────────────────

/**
 * Checks whether the user has remaining AI quota for a given action type.
 * Throws a 429 error if the limit has been reached.
 *
 * @param {string} userId
 * @param {string} actionType - One of: ANALYZE_JOB, GENERATE_RESUME, etc.
 */
export const checkUsageLimit = async (userId, actionType) => {
  // Map action types to their free-tier limits from env config
  const limits = {
    ANALYZE_JOB:           env.FREE_AI_ATS_LIMIT,      // reuse ATS limit
    GENERATE_RESUME:       env.FREE_AI_RESUME_LIMIT,
    GENERATE_COVER_LETTER: env.FREE_AI_COVER_LETTER_LIMIT,
    ATS_ANALYSIS:          env.FREE_AI_ATS_LIMIT,
    CAREER_ASSISTANT:      env.FREE_AI_ASSISTANT_LIMIT,
    IMPROVE_CONTENT:       env.FREE_AI_RESUME_LIMIT,
    SKILLS_GAP:            env.FREE_AI_ATS_LIMIT,
  };

  const limit = limits[actionType];
  if (!limit) return; // No limit configured — allow the request

  const count = await prisma.aIUsage.count({
    where: {
      userId,
      action: actionType,
      success: true,
      // Count only requests from the last 30 days
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
  });

  if (count >= limit) {
    const e = new Error(
      `You've reached your free plan limit for this AI action (${limit} per month). Upgrade to continue.`
    );
    e.statusCode = 429;
    throw e;
  }
};

/**
 * Records an AI usage entry in the database.
 * Called after every AI request, whether it succeeded or failed.
 */
export const recordAIUsage = async (userId, action, tokensUsed, success, metadata = null) => {
  try {
    await prisma.aIUsage.create({
      data: {
        userId,
        action,
        tokensUsed: tokensUsed ?? 0,
        success,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
      },
    });
  } catch (err) {
    // Don't let a logging failure break the user's request
    console.error('Failed to record AI usage:', err.message);
  }
};

// ─── Analyze Job Description ──────────────────────────────────────────────────

/**
 * Sends a job description to Groq for structured extraction.
 * Returns the normalized extracted data and AI usage info.
 *
 * @param {string} userId   - For usage tracking
 * @param {string} rawText  - The full job description text
 * @returns {Promise<{ extractedData: Object, usage: Object }>}
 */
export const analyzeJobDescription = async (userId, rawText) => {
  // 1. Check usage limit
  await checkUsageLimit(userId, 'ANALYZE_JOB');

  // 2. Call Groq with the job analysis prompt
  const { data, usage } = await callGroqJSON({
    messages: [
      { role: 'system', content: JOB_ANALYSIS_SYSTEM_PROMPT },
      { role: 'user',   content: buildJobAnalysisUserPrompt(rawText) },
    ],
    temperature: 0.3, // Low temperature for consistent extraction
    maxTokens: 3000,
  });

  // 3. Validate and normalize the extracted data
  const extractedData = normalizeExtractedData(data);

  // 4. Record usage (success)
  await recordAIUsage(userId, 'ANALYZE_JOB', usage.totalTokens, true, {
    jobTitle: extractedData.jobTitle,
  });

  return { extractedData, usage };
};


// ─── Generate Resume ──────────────────────────────────────────────────────────

import {
  RESUME_GENERATION_SYSTEM_PROMPT,
  buildResumeGenerationUserPrompt,
  IMPROVE_CONTENT_SYSTEM_PROMPT,
  buildImproveContentUserPrompt,
} from '../prompts/resumeGeneration.js';

/**
 * Generates a tailored resume using the user's profile and optionally
 * a target job description.
 *
 * @param {string} userId
 * @param {Object} options
 * @param {string|null} options.jobDescriptionId - ID of saved job description
 * @param {string|null} options.templateId - Template to use
 * @param {Object} options.preferences - { tone, language, length, includeSections }
 * @returns {Promise<{ content: Object, usage: Object }>}
 */
export const generateResume = async (userId, { jobDescriptionId, preferences = {} }) => {
  // 1. Check usage limit
  await checkUsageLimit(userId, 'GENERATE_RESUME');

  // 2. Fetch the user's full profile from the database
  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: {
      experiences:    { orderBy: { displayOrder: 'asc' } },
      education:      { orderBy: { displayOrder: 'asc' } },
      skills:         { orderBy: { displayOrder: 'asc' } },
      projects:       { orderBy: { displayOrder: 'asc' } },
      certifications: { orderBy: { displayOrder: 'asc' } },
    },
  });

  if (!profile) {
    const e = new Error('Please complete your profile first before generating a resume.');
    e.statusCode = 400;
    throw e;
  }

  // Check if the profile has enough data to generate a meaningful resume
  const hasExperience = profile.experiences.length > 0;
  const hasEducation   = profile.education.length > 0;
  const hasSkills      = profile.skills.length > 0;

  if (!hasExperience && !hasEducation && !hasSkills) {
    const e = new Error(
      'Your profile is too empty to generate a resume. Please add at least some experience, education, or skills first.'
    );
    e.statusCode = 400;
    throw e;
  }

  // 3. Fetch the job description if provided
  let jobDescription = null;
  if (jobDescriptionId) {
    jobDescription = await prisma.jobDescription.findUnique({
      where: { id: jobDescriptionId },
    });
    if (!jobDescription || jobDescription.userId !== userId) {
      const e = new Error('Job description not found');
      e.statusCode = 404;
      throw e;
    }
  }

  // 4. Build the prompt and call Groq
  const { data, usage } = await callGroqJSON({
    messages: [
      { role: 'system', content: RESUME_GENERATION_SYSTEM_PROMPT },
      { role: 'user',   content: buildResumeGenerationUserPrompt(profile, jobDescription, preferences) },
    ],
    temperature: 0.6, // Slightly higher for more natural writing
    maxTokens: 4000,
  });

  // 5. Validate the generated content has the expected structure
  const content = {
    summary:        data.summary        ?? '',
    skills:         data.skills         ?? [],
    experiences:    data.experiences    ?? [],
    education:      data.education      ?? [],
    projects:       data.projects       ?? [],
    certifications: data.certifications ?? [],
    customSections: data.customSections ?? [],
  };

  // 6. Record usage (success)
  await recordAIUsage(userId, 'GENERATE_RESUME', usage.totalTokens, true, {
    jobDescriptionId: jobDescriptionId || null,
    sections: Object.keys(content).filter(k => Array.isArray(content[k]) ? content[k].length > 0 : !!content[k]),
  });

  return { content, usage };
};

// ─── Improve Content ────────────────────────────────────────────────────────────

/**
 * Uses AI to improve a piece of resume content (e.g., a summary or bullet point).
 *
 * @param {string} userId
 * @param {string} content - The text to improve
 * @param {string} instructions - Optional specific instructions
 * @returns {Promise<{ improvedContent: string, usage: Object }>}
 */
export const improveContent = async (userId, content, instructions = '') => {
  // 1. Check usage limit
  await checkUsageLimit(userId, 'IMPROVE_CONTENT');

  // 2. Call Groq with the improvement prompt
  const { data, usage } = await callGroqJSON({
    messages: [
      { role: 'system', content: IMPROVE_CONTENT_SYSTEM_PROMPT },
      { role: 'user',   content: buildImproveContentUserPrompt(content, instructions) },
    ],
    temperature: 0.5,
    maxTokens: 1500,
  });

  // 3. Extract improved content
  const improvedContent = data.improvedContent ?? content;

  // 4. Record usage
  await recordAIUsage(userId, 'IMPROVE_CONTENT', usage.totalTokens, true);

  return { improvedContent, usage };
};

// ─── Generate Cover Letter ────────────────────────────────────────────────────

import {
  COVER_LETTER_SYSTEM_PROMPT,
  COVER_LETTER_RESPONSE_SCHEMA,
  buildCoverLetterUserPrompt,
  REWRITE_COVER_LETTER_SYSTEM_PROMPT,
  buildRewritePrompt,
} from '../prompts/coverLetterGeneration.js';

/**
 * Generates a cover letter using the user's profile + optional job + resume.
 * Returns structured JSON — does NOT save to DB.
 *
 * @param {string} userId
 * @param {{ jobDescriptionId, resumeId, preferences }} options
 * @returns {Promise<{ subject, salutation, body, closing, wordCount, usage }>}
 */
export const generateCoverLetter = async (userId, { jobDescriptionId, resumeId, preferences = {} }) => {
  await checkUsageLimit(userId, 'GENERATE_COVER_LETTER');

  // Fetch the user's profile
  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: {
      experiences:    { orderBy: { displayOrder: 'asc' } },
      education:      { orderBy: { displayOrder: 'asc' } },
      skills:         { orderBy: { displayOrder: 'asc' } },
      projects:       { orderBy: { displayOrder: 'asc' } },
      certifications: { orderBy: { displayOrder: 'asc' } },
    },
  });

  if (!profile || (!profile.firstName && !profile.experiences?.length)) {
    const e = new Error('Please complete your profile before generating a cover letter.');
    e.statusCode = 400;
    throw e;
  }

  // Fetch job description if provided
  let job = null;
  if (jobDescriptionId) {
    job = await prisma.jobDescription.findUnique({ where: { id: jobDescriptionId } });
    if (!job || job.userId !== userId) {
      const e = new Error('Job description not found'); e.statusCode = 404; throw e;
    }
  }

  // Fetch resume if provided (for the summary)
  let resume = null;
  if (resumeId) {
    resume = await prisma.resume.findUnique({ where: { id: resumeId } });
    if (!resume || resume.userId !== userId) {
      const e = new Error('Resume not found'); e.statusCode = 404; throw e;
    }
  }

  const { data, usage } = await callGroqJSON({
    messages: [
      { role: 'system', content: COVER_LETTER_SYSTEM_PROMPT },
      { role: 'user',   content: buildCoverLetterUserPrompt(profile, job, resume, preferences) },
    ],
    temperature: 0.7,
    maxTokens:   4000,
    jsonSchema: COVER_LETTER_RESPONSE_SCHEMA,
  });

  const result = normalizeCoverLetterResponse(data);

  await recordAIUsage(userId, 'GENERATE_COVER_LETTER', usage.totalTokens, true, {
    jobDescriptionId: jobDescriptionId ?? null,
  });

  return { ...result, usage };
};

// ─── Rewrite Cover Letter ─────────────────────────────────────────────────────

/**
 * Rewrites a cover letter body per the user's instructions.
 * @param {string} userId
 * @param {string} body         - Existing cover letter body
 * @param {string} instructions - What to change
 * @returns {Promise<{ body: string, usage: Object }>}
 */
export const rewriteCoverLetter = async (userId, body, instructions) => {
  await checkUsageLimit(userId, 'IMPROVE_CONTENT');

  const { data, usage } = await callGroqJSON({
    messages: [
      { role: 'system', content: REWRITE_COVER_LETTER_SYSTEM_PROMPT },
      { role: 'user',   content: buildRewritePrompt(body, instructions) },
    ],
    temperature: 0.6,
    maxTokens:   1500,
  });

  await recordAIUsage(userId, 'IMPROVE_CONTENT', usage.totalTokens, true);

  return { body: data.body ?? body, usage };
};
