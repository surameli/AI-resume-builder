/**
 * Dashboard Controller
 * Returns real statistics from the database for the user's dashboard.
 */
import prisma from '../config/database.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

export const getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Run all queries in parallel for performance
    const [
      totalResumes,
      totalCoverLetters,
      totalApplications,
      totalAiUsage,
      recentResumes,
      recentApplications,
      applicationsByStatus,
      profile,
    ] = await Promise.all([
      prisma.resume.count({ where: { userId } }),
      prisma.coverLetter.count({ where: { userId } }),
      prisma.application.count({ where: { userId } }),
      prisma.aIUsage.count({ where: { userId } }),

      prisma.resume.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          updatedAt: true,
          template: { select: { name: true, slug: true } },
        },
      }),

      prisma.application.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          company: true,
          jobTitle: true,
          status: true,
          applicationDate: true,
          updatedAt: true,
        },
      }),

      prisma.application.groupBy({
        by: ['status'],
        where: { userId },
        _count: { status: true },
      }),

      prisma.profile.findUnique({
        where: { userId },
        select: {
          firstName: true,
          lastName: true,
          professionalTitle: true,
          photoUrl: true,
          summary: true,
          _count: {
            select: {
              experiences: true,
              education: true,
              skills: true,
              projects: true,
              certifications: true,
            },
          },
        },
      }),
    ]);

    // Calculate profile completion percentage
    const completionScore = calculateProfileCompletion(profile);

    return sendSuccess(res, {
      stats: {
        totalResumes,
        totalCoverLetters,
        totalApplications,
        totalAiUsage,
      },
      applicationsByStatus: applicationsByStatus.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {}),
      recentResumes,
      recentApplications,
      profileCompletion: completionScore,
      profile: profile
        ? {
            firstName: profile.firstName,
            lastName: profile.lastName,
            professionalTitle: profile.professionalTitle,
            photoUrl: profile.photoUrl,
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Calculates a profile completion percentage (0-100).
 * Encourages users to fill out their full profile.
 */
const calculateProfileCompletion = (profile) => {
  if (!profile) return 0;

  const checks = [
    !!profile.firstName && !!profile.lastName,   // 10%
    !!profile.professionalTitle,                  // 10%
    !!profile.summary,                            // 15%
    !!profile.photoUrl,                           // 5%
    (profile._count?.experiences || 0) > 0,      // 20%
    (profile._count?.education || 0) > 0,        // 15%
    (profile._count?.skills || 0) >= 3,          // 15%
    (profile._count?.projects || 0) > 0,         // 5%
    (profile._count?.certifications || 0) > 0,   // 5%
  ];

  const weights = [10, 10, 15, 5, 20, 15, 15, 5, 5];
  const score = checks.reduce((total, pass, i) => total + (pass ? weights[i] : 0), 0);
  return score;
};
