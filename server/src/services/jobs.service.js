/**
 * Jobs Service — business logic for job description CRUD.
 * All operations verify userId ownership so no user can read or modify
 * another user's saved job descriptions.
 */
import prisma from '../config/database.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const notFound = () => {
  const e = new Error('Job description not found');
  e.statusCode = 404;
  throw e;
};

// ─── Get all job descriptions for a user ──────────────────────────────────────

export const getAllJobs = async (userId) => {
  return prisma.jobDescription.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      company: true,
      isAnalyzed: true,
      createdAt: true,
      updatedAt: true,
      // Include a preview of the raw text (first 200 chars) for list display
      // but don't send the full text for every item
    },
  });
};

// ─── Get a single job description with full data ──────────────────────────────

export const getJobById = async (userId, jobId) => {
  const job = await prisma.jobDescription.findUnique({
    where: { id: jobId },
  });

  if (!job) notFound();
  if (job.userId !== userId) {
    // Don't reveal that the record exists — return 404 to prevent enumeration
    notFound();
  }

  return job;
};

// ─── Create a new job description ─────────────────────────────────────────────

export const createJob = async (userId, data) => {
  return prisma.jobDescription.create({
    data: {
      userId,
      title:        data.title,
      company:      data.company    ?? null,
      rawText:      data.rawText,
      extractedData: data.extractedData ?? undefined,
      isAnalyzed:   data.isAnalyzed ?? false,
    },
  });
};

// ─── Update a job description ──────────────────────────────────────────────────

export const updateJob = async (userId, jobId, data) => {
  // First verify ownership
  await getJobById(userId, jobId);

  const updateData = {};
  if (data.title        !== undefined) updateData.title         = data.title;
  if (data.company      !== undefined) updateData.company       = data.company;
  if (data.rawText      !== undefined) updateData.rawText       = data.rawText;
  if (data.extractedData !== undefined) updateData.extractedData = data.extractedData;
  if (data.isAnalyzed   !== undefined) updateData.isAnalyzed   = data.isAnalyzed;

  return prisma.jobDescription.update({
    where: { id: jobId },
    data: updateData,
  });
};

// ─── Delete a job description ──────────────────────────────────────────────────

export const deleteJob = async (userId, jobId) => {
  // Verify ownership first — throws 404 if not found or not owned
  await getJobById(userId, jobId);
  await prisma.jobDescription.delete({ where: { id: jobId } });
};

// ─── Get job description count (for dashboard) ─────────────────────────────────

export const getJobCount = async (userId) => {
  return prisma.jobDescription.count({ where: { userId } });
};
