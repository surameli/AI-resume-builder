/**
 * Profile Service — all profile business logic.
 * Covers: personal info, experiences, education, skills, projects, certifications.
 *
 * Key design decisions:
 * - Every sub-resource operation verifies ownership through the profile record
 *   (which is linked to userId), so no user can touch another user's data.
 * - getFullProfile is the single source of truth for returning profile data
 *   to the frontend — it always fetches all sub-sections ordered by displayOrder.
 * - Date strings from the frontend are converted to Date objects before Prisma writes.
 */
import prisma from '../config/database.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert a date string to a JS Date, or return null/undefined unchanged */
const toDate = (val) => (val ? new Date(val) : null);

/** Throw a 404 error — used when a record is not found */
const notFound = (label = 'Record') => {
  const e = new Error(`${label} not found`);
  e.statusCode = 404;
  throw e;
};

/** Throw a 403 error — used for ownership violations */
const forbidden = () => {
  const e = new Error('Access denied');
  e.statusCode = 403;
  throw e;
};

/**
 * Find the profile for a user and throw 404 if it doesn't exist.
 * Used as a guard before every sub-resource operation.
 */
const requireProfile = async (userId) => {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) notFound('Profile');
  return profile;
};

/**
 * Verify that a sub-resource (experience, education, etc.) belongs
 * to the authenticated user's profile before allowing mutation.
 */
const requireOwnership = async (model, id, profileId) => {
  const record = await prisma[model].findUnique({ where: { id } });
  if (!record) notFound();
  if (record.profileId !== profileId) forbidden();
  return record;
};

// ─── Profile (Personal Info) ──────────────────────────────────────────────────

/**
 * Returns the user's full profile including all sub-sections.
 * Creates a bare profile automatically if one doesn't exist yet
 * (happens for accounts created before Phase 2).
 */
export const getFullProfile = async (userId) => {
  let profile = await prisma.profile.findUnique({
    where: { userId },
    include: {
      experiences:    { orderBy: { displayOrder: 'asc' } },
      education:      { orderBy: { displayOrder: 'asc' } },
      skills:         { orderBy: { displayOrder: 'asc' } },
      projects:       { orderBy: { displayOrder: 'asc' } },
      certifications: { orderBy: { displayOrder: 'asc' } },
    },
  });

  // Auto-create a bare profile if the user doesn't have one yet
  if (!profile) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) notFound('User');

    profile = await prisma.profile.create({
      data: { userId, firstName: '', lastName: '' },
      include: {
        experiences:    true,
        education:      true,
        skills:         true,
        projects:       true,
        certifications: true,
      },
    });
  }

  return profile;
};

/**
 * Updates the personal information section of the profile.
 * Creates the profile record if it doesn't exist yet.
 */
export const updateProfile = async (userId, data) => {
  const updateData = {
    firstName:         data.firstName,
    lastName:          data.lastName,
    professionalTitle: data.professionalTitle ?? null,
    phone:             data.phone         ?? null,
    location:          data.location      ?? null,
    linkedinUrl:       data.linkedinUrl   ?? null,
    githubUrl:         data.githubUrl     ?? null,
    portfolioUrl:      data.portfolioUrl  ?? null,
    summary:           data.summary       ?? null,
  };

  const profile = await prisma.profile.upsert({
    where: { userId },
    update: updateData,
    create: { userId, ...updateData },
  });

  return profile;
};

/**
 * Updates only the profile photo URL (called after a file upload).
 */
export const updateProfilePhoto = async (userId, photoUrl) => {
  const profile = await prisma.profile.upsert({
    where: { userId },
    update: { photoUrl },
    create: { userId, firstName: '', lastName: '', photoUrl },
  });
  return profile;
};

// ─── Experiences ──────────────────────────────────────────────────────────────

export const createExperience = async (userId, data) => {
  const profile = await requireProfile(userId);

  // If this is the first entry, default displayOrder to 0;
  // otherwise put it at the end of the list
  const count = await prisma.experience.count({ where: { profileId: profile.id } });

  return prisma.experience.create({
    data: {
      profileId:       profile.id,
      company:         data.company,
      jobTitle:        data.jobTitle,
      employmentType:  data.employmentType ?? 'FULL_TIME',
      location:        data.location       ?? null,
      startDate:       toDate(data.startDate),
      endDate:         data.isCurrent ? null : toDate(data.endDate),
      isCurrent:       data.isCurrent      ?? false,
      responsibilities: data.responsibilities ?? null,
      achievements:    data.achievements   ?? null,
      displayOrder:    data.displayOrder   ?? count,
    },
  });
};

export const updateExperience = async (userId, experienceId, data) => {
  const profile = await requireProfile(userId);
  await requireOwnership('experience', experienceId, profile.id);

  return prisma.experience.update({
    where: { id: experienceId },
    data: {
      ...(data.company         !== undefined && { company: data.company }),
      ...(data.jobTitle        !== undefined && { jobTitle: data.jobTitle }),
      ...(data.employmentType  !== undefined && { employmentType: data.employmentType }),
      ...(data.location        !== undefined && { location: data.location }),
      ...(data.startDate       !== undefined && { startDate: toDate(data.startDate) }),
      ...(data.endDate         !== undefined && { endDate: data.isCurrent ? null : toDate(data.endDate) }),
      ...(data.isCurrent       !== undefined && { isCurrent: data.isCurrent }),
      ...(data.responsibilities !== undefined && { responsibilities: data.responsibilities }),
      ...(data.achievements    !== undefined && { achievements: data.achievements }),
      ...(data.displayOrder    !== undefined && { displayOrder: data.displayOrder }),
    },
  });
};

export const deleteExperience = async (userId, experienceId) => {
  const profile = await requireProfile(userId);
  await requireOwnership('experience', experienceId, profile.id);
  await prisma.experience.delete({ where: { id: experienceId } });
};

// ─── Education ────────────────────────────────────────────────────────────────

export const createEducation = async (userId, data) => {
  const profile = await requireProfile(userId);
  const count = await prisma.education.count({ where: { profileId: profile.id } });

  return prisma.education.create({
    data: {
      profileId:      profile.id,
      institution:    data.institution,
      degree:         data.degree,
      fieldOfStudy:   data.fieldOfStudy    ?? null,
      startDate:      toDate(data.startDate),
      graduationDate: toDate(data.graduationDate),
      gpa:            data.gpa             ?? null,
      description:    data.description     ?? null,
      displayOrder:   data.displayOrder    ?? count,
    },
  });
};

export const updateEducation = async (userId, educationId, data) => {
  const profile = await requireProfile(userId);
  await requireOwnership('education', educationId, profile.id);

  return prisma.education.update({
    where: { id: educationId },
    data: {
      ...(data.institution    !== undefined && { institution: data.institution }),
      ...(data.degree         !== undefined && { degree: data.degree }),
      ...(data.fieldOfStudy   !== undefined && { fieldOfStudy: data.fieldOfStudy }),
      ...(data.startDate      !== undefined && { startDate: toDate(data.startDate) }),
      ...(data.graduationDate !== undefined && { graduationDate: toDate(data.graduationDate) }),
      ...(data.gpa            !== undefined && { gpa: data.gpa }),
      ...(data.description    !== undefined && { description: data.description }),
      ...(data.displayOrder   !== undefined && { displayOrder: data.displayOrder }),
    },
  });
};

export const deleteEducation = async (userId, educationId) => {
  const profile = await requireProfile(userId);
  await requireOwnership('education', educationId, profile.id);
  await prisma.education.delete({ where: { id: educationId } });
};

// ─── Skills ───────────────────────────────────────────────────────────────────

export const createSkill = async (userId, data) => {
  const profile = await requireProfile(userId);
  const count = await prisma.skill.count({ where: { profileId: profile.id } });

  return prisma.skill.create({
    data: {
      profileId:        profile.id,
      name:             data.name,
      category:         data.category         ?? 'TECHNICAL',
      proficiencyLevel: data.proficiencyLevel  ?? null,
      displayOrder:     data.displayOrder      ?? count,
    },
  });
};

export const updateSkill = async (userId, skillId, data) => {
  const profile = await requireProfile(userId);
  await requireOwnership('skill', skillId, profile.id);

  return prisma.skill.update({
    where: { id: skillId },
    data: {
      ...(data.name             !== undefined && { name: data.name }),
      ...(data.category         !== undefined && { category: data.category }),
      ...(data.proficiencyLevel !== undefined && { proficiencyLevel: data.proficiencyLevel }),
      ...(data.displayOrder     !== undefined && { displayOrder: data.displayOrder }),
    },
  });
};

export const deleteSkill = async (userId, skillId) => {
  const profile = await requireProfile(userId);
  await requireOwnership('skill', skillId, profile.id);
  await prisma.skill.delete({ where: { id: skillId } });
};

// ─── Projects ─────────────────────────────────────────────────────────────────

export const createProject = async (userId, data) => {
  const profile = await requireProfile(userId);
  const count = await prisma.project.count({ where: { profileId: profile.id } });

  return prisma.project.create({
    data: {
      profileId:    profile.id,
      name:         data.name,
      description:  data.description  ?? null,
      technologies: data.technologies ?? [],
      projectUrl:   data.projectUrl   ?? null,
      startDate:    toDate(data.startDate),
      endDate:      toDate(data.endDate),
      displayOrder: data.displayOrder ?? count,
    },
  });
};

export const updateProject = async (userId, projectId, data) => {
  const profile = await requireProfile(userId);
  await requireOwnership('project', projectId, profile.id);

  return prisma.project.update({
    where: { id: projectId },
    data: {
      ...(data.name         !== undefined && { name: data.name }),
      ...(data.description  !== undefined && { description: data.description }),
      ...(data.technologies !== undefined && { technologies: data.technologies }),
      ...(data.projectUrl   !== undefined && { projectUrl: data.projectUrl }),
      ...(data.startDate    !== undefined && { startDate: toDate(data.startDate) }),
      ...(data.endDate      !== undefined && { endDate: toDate(data.endDate) }),
      ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder }),
    },
  });
};

export const deleteProject = async (userId, projectId) => {
  const profile = await requireProfile(userId);
  await requireOwnership('project', projectId, profile.id);
  await prisma.project.delete({ where: { id: projectId } });
};

// ─── Certifications ───────────────────────────────────────────────────────────

export const createCertification = async (userId, data) => {
  const profile = await requireProfile(userId);
  const count = await prisma.certification.count({ where: { profileId: profile.id } });

  return prisma.certification.create({
    data: {
      profileId:      profile.id,
      name:           data.name,
      issuingOrg:     data.issuingOrg,
      issueDate:      toDate(data.issueDate),
      expirationDate: toDate(data.expirationDate),
      credentialUrl:  data.credentialUrl  ?? null,
      displayOrder:   data.displayOrder   ?? count,
    },
  });
};

export const updateCertification = async (userId, certId, data) => {
  const profile = await requireProfile(userId);
  await requireOwnership('certification', certId, profile.id);

  return prisma.certification.update({
    where: { id: certId },
    data: {
      ...(data.name           !== undefined && { name: data.name }),
      ...(data.issuingOrg     !== undefined && { issuingOrg: data.issuingOrg }),
      ...(data.issueDate      !== undefined && { issueDate: toDate(data.issueDate) }),
      ...(data.expirationDate !== undefined && { expirationDate: toDate(data.expirationDate) }),
      ...(data.credentialUrl  !== undefined && { credentialUrl: data.credentialUrl }),
      ...(data.displayOrder   !== undefined && { displayOrder: data.displayOrder }),
    },
  });
};

export const deleteCertification = async (userId, certId) => {
  const profile = await requireProfile(userId);
  await requireOwnership('certification', certId, profile.id);
  await prisma.certification.delete({ where: { id: certId } });
};

// ─── Reorder (shared for all sub-sections) ───────────────────────────────────

/**
 * Bulk-updates displayOrder for multiple items in one transaction.
 * The frontend sends the new order after a drag-and-drop.
 * Each item is verified to belong to the authenticated user's profile.
 *
 * @param {string} userId
 * @param {'experience'|'education'|'skill'|'project'|'certification'} model
 * @param {{ id: string, displayOrder: number }[]} items
 */
export const reorderItems = async (userId, model, items) => {
  const profile = await requireProfile(userId);

  // Verify all items belong to this profile before writing anything
  const ids = items.map((i) => i.id);
  const records = await prisma[model].findMany({
    where: { id: { in: ids }, profileId: profile.id },
    select: { id: true },
  });

  if (records.length !== ids.length) {
    const e = new Error('One or more items were not found or do not belong to your profile');
    e.statusCode = 403;
    throw e;
  }

  // Run all updates in a single transaction
  await prisma.$transaction(
    items.map((item) =>
      prisma[model].update({
        where: { id: item.id },
        data:  { displayOrder: item.displayOrder },
      })
    )
  );
};

// ─── Profile completion score ─────────────────────────────────────────────────

/**
 * Calculates a 0-100 profile completion percentage.
 * Shared with the dashboard stats endpoint.
 */
export const calculateCompletion = (profile) => {
  if (!profile) return 0;

  const checks = [
    !!(profile.firstName && profile.lastName),
    !!profile.professionalTitle,
    !!profile.summary,
    !!profile.photoUrl,
    (profile.experiences?.length    ?? profile._count?.experiences    ?? 0) > 0,
    (profile.education?.length      ?? profile._count?.education      ?? 0) > 0,
    (profile.skills?.length         ?? profile._count?.skills         ?? 0) >= 3,
    (profile.projects?.length       ?? profile._count?.projects       ?? 0) > 0,
    (profile.certifications?.length ?? profile._count?.certifications ?? 0) > 0,
  ];

  const weights = [10, 10, 15, 5, 20, 15, 15, 5, 5];
  return checks.reduce((total, pass, i) => total + (pass ? weights[i] : 0), 0);
};
