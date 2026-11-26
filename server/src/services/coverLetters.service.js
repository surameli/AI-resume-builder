/**
 * Cover Letter Service — CRUD with userId ownership checks.
 */
import prisma from '../config/database.js';

const notFound = () => {
  const e = new Error('Cover letter not found');
  e.statusCode = 404;
  throw e;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const verifyOwnership = async (userId, id) => {
  const cl = await prisma.coverLetter.findUnique({ where: { id } });
  if (!cl) notFound();
  if (cl.userId !== userId) notFound(); // Don't expose existence
  return cl;
};

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const getAllCoverLetters = async (userId) =>
  prisma.coverLetter.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true, title: true, tone: true,
      createdAt: true, updatedAt: true,
      jobDescription: { select: { id: true, title: true, company: true } },
      resume:         { select: { id: true, title: true } },
    },
  });

export const getCoverLetterById = async (userId, id) => {
  const cl = await prisma.coverLetter.findUnique({
    where: { id },
    include: {
      jobDescription: { select: { id: true, title: true, company: true } },
      resume:         { select: { id: true, title: true } },
    },
  });
  if (!cl) notFound();
  if (cl.userId !== userId) notFound();
  return cl;
};

export const createCoverLetter = async (userId, data) => {
  // Verify cross-resource ownership if provided
  if (data.jobDescriptionId) {
    const job = await prisma.jobDescription.findUnique({ where: { id: data.jobDescriptionId } });
    if (!job || job.userId !== userId) {
      const e = new Error('Job description not found'); e.statusCode = 404; throw e;
    }
  }
  if (data.resumeId) {
    const r = await prisma.resume.findUnique({ where: { id: data.resumeId } });
    if (!r || r.userId !== userId) {
      const e = new Error('Resume not found'); e.statusCode = 404; throw e;
    }
  }

  return prisma.coverLetter.create({
    data: {
      userId,
      title:            data.title,
      content:          data.content,
      tone:             data.tone            ?? 'professional',
      jobDescriptionId: data.jobDescriptionId ?? null,
      resumeId:         data.resumeId         ?? null,
    },
  });
};

export const updateCoverLetter = async (userId, id, data) => {
  await verifyOwnership(userId, id);

  const patch = {};
  if (data.title   !== undefined) patch.title   = data.title;
  if (data.content !== undefined) patch.content = data.content;
  if (data.tone    !== undefined) patch.tone    = data.tone;
  if (data.jobDescriptionId !== undefined) patch.jobDescriptionId = data.jobDescriptionId;
  if (data.resumeId         !== undefined) patch.resumeId         = data.resumeId;

  return prisma.coverLetter.update({ where: { id }, data: patch });
};

export const deleteCoverLetter = async (userId, id) => {
  await verifyOwnership(userId, id);
  await prisma.coverLetter.delete({ where: { id } });
};

export const getCoverLetterCount = async (userId) =>
  prisma.coverLetter.count({ where: { userId } });
