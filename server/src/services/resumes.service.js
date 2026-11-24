/**
 * Resume Service — business logic for resume CRUD, duplication, and version history.
 *
 * Key design:
 * - Every resume has a `content` JSON field (summary, skills, experiences, etc.)
 *   that is independent of the visual template — users can switch templates
 *   without losing content.
 * - Every create and update saves a snapshot to ResumeVersion for undo/restore.
 * - All operations verify userId ownership.
 */
import prisma from '../config/database.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const notFound = () => {
  const e = new Error('Resume not found');
  e.statusCode = 404;
  throw e;
};

// ─── Get all resumes for a user ────────────────────────────────────────────────

export const getAllResumes = async (userId) => {
  return prisma.resume.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      language: true,
      tone: true,
      templateId: true,
      jobDescriptionId: true,
      createdAt: true,
      updatedAt: true,
      template: { select: { id: true, name: true, slug: true, category: true } },
      jobDescription: { select: { id: true, title: true, company: true } },
      _count: {
        select: {
          versions: true,
          coverLetters: true,
          applications: true,
        },
      },
    },
  });
};

// ─── Get a single resume by ID (with ownership check) ─────────────────────────

export const getResumeById = async (userId, resumeId) => {
  const resume = await prisma.resume.findUnique({
    where: { id: resumeId },
    include: {
      template: { select: { id: true, name: true, slug: true, category: true } },
      jobDescription: { select: { id: true, title: true, company: true } },
    },
  });

  if (!resume) notFound();
  if (resume.userId !== userId) notFound(); // Don't reveal existence to other users

  return resume;
};

// ─── Create a new resume ──────────────────────────────────────────────────────

export const createResume = async (userId, data) => {
  // If jobDescriptionId is provided, verify it belongs to the user
  if (data.jobDescriptionId) {
    const job = await prisma.jobDescription.findUnique({ where: { id: data.jobDescriptionId } });
    if (!job || job.userId !== userId) {
      const e = new Error('Job description not found');
      e.statusCode = 404;
      throw e;
    }
  }

  // If templateId is provided, verify it exists and is active
  if (data.templateId) {
    const template = await prisma.template.findUnique({ where: { id: data.templateId } });
    if (!template || !template.isActive) {
      const e = new Error('Template not found or inactive');
      e.statusCode = 404;
      throw e;
    }
  }

  const resume = await prisma.resume.create({
    data: {
      userId,
      title:           data.title,
      jobDescriptionId: data.jobDescriptionId ?? null,
      templateId:      data.templateId    ?? null,
      content:         data.content       ?? {},
      settings:        data.settings      ?? undefined,
      language:        data.language      ?? 'en',
      tone:            data.tone          ?? 'professional',
    },
  });

  // Save initial version snapshot
  await prisma.resumeVersion.create({
    data: {
      resumeId:   resume.id,
      versionNum: 1,
      content:    resume.content,
      settings:   resume.settings,
    },
  });

  return resume;
};

// ─── Update a resume ──────────────────────────────────────────────────────────

export const updateResume = async (userId, resumeId, data) => {
  const resume = await getResumeById(userId, resumeId);

  // Verify jobDescriptionId ownership if being changed
  if (data.jobDescriptionId) {
    const job = await prisma.jobDescription.findUnique({ where: { id: data.jobDescriptionId } });
    if (!job || job.userId !== userId) {
      const e = new Error('Job description not found');
      e.statusCode = 404;
      throw e;
    }
  }

  const updateData = {};
  if (data.title            !== undefined) updateData.title           = data.title;
  if (data.jobDescriptionId !== undefined) updateData.jobDescriptionId = data.jobDescriptionId;
  if (data.templateId       !== undefined) updateData.templateId      = data.templateId;
  if (data.content          !== undefined) updateData.content         = data.content;
  if (data.settings         !== undefined) updateData.settings        = data.settings;
  if (data.language         !== undefined) updateData.language        = data.language;
  if (data.tone             !== undefined) updateData.tone            = data.tone;

  const updated = await prisma.resume.update({
    where: { id: resumeId },
    data: updateData,
  });

  // If content or settings changed, save a new version snapshot
  if (data.content !== undefined || data.settings !== undefined) {
    const versionCount = await prisma.resumeVersion.count({ where: { resumeId } });
    await prisma.resumeVersion.create({
      data: {
        resumeId,
        versionNum: versionCount + 1,
        content:  updated.content,
        settings: updated.settings,
      },
    });
  }

  return updated;
};

// ─── Delete a resume ──────────────────────────────────────────────────────────

export const deleteResume = async (userId, resumeId) => {
  await getResumeById(userId, resumeId); // ownership check
  await prisma.resume.delete({ where: { id: resumeId } });
};

// ─── Duplicate a resume ────────────────────────────────────────────────────────

export const duplicateResume = async (userId, resumeId) => {
  const original = await getResumeById(userId, resumeId);

  const duplicate = await prisma.resume.create({
    data: {
      userId,
      title:           `${original.title} (Copy)`,
      jobDescriptionId: original.jobDescriptionId,
      templateId:      original.templateId,
      content:         original.content,
      settings:        original.settings,
      language:        original.language,
      tone:            original.tone,
    },
  });

  // Save initial version for the duplicate
  await prisma.resumeVersion.create({
    data: {
      resumeId:   duplicate.id,
      versionNum: 1,
      content:    duplicate.content,
      settings:   duplicate.settings,
    },
  });

  return duplicate;
};

// ─── Get version history ─────────────────────────────────────────────────────

export const getVersions = async (userId, resumeId) => {
  await getResumeById(userId, resumeId); // ownership check

  return prisma.resumeVersion.findMany({
    where: { resumeId },
    orderBy: { versionNum: 'desc' },
    select: {
      id: true,
      versionNum: true,
      createdAt: true,
    },
  });
};

// ─── Restore a previous version ───────────────────────────────────────────────

export const restoreVersion = async (userId, resumeId, versionId) => {
  const resume = await getResumeById(userId, resumeId);

  const version = await prisma.resumeVersion.findFirst({
    where: { id: versionId, resumeId },
  });

  if (!version) {
    const e = new Error('Version not found');
    e.statusCode = 404;
    throw e;
  }

  // Restore content and settings from the version
  const updated = await prisma.resume.update({
    where: { id: resumeId },
    data: {
      content: version.content,
      settings: version.settings,
    },
  });

  // Save the restore as a new version
  const versionCount = await prisma.resumeVersion.count({ where: { resumeId } });
  await prisma.resumeVersion.create({
    data: {
      resumeId,
      versionNum: versionCount + 1,
      content:  updated.content,
      settings: updated.settings,
    },
  });

  return updated;
};

// ─── Get resume count (for dashboard) ──────────────────────────────────────────

export const getResumeCount = async (userId) => {
  return prisma.resume.count({ where: { userId } });
};
