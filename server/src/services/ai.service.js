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
