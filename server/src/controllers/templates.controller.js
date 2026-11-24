/**
 * Templates Controller — public endpoint for browsing resume templates.
 */
import prisma from '../config/database.js';
import { sendSuccess } from '../utils/apiResponse.js';

/** GET /api/templates — list all active templates (public, no auth required) */
export const getAllTemplates = async (req, res, next) => {
  try {
    const templates = await prisma.template.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        category: true,
        description: true,
        isPremium: true,
        displayOrder: true,
      },
    });
    return sendSuccess(res, { templates });
  } catch (err) {
    next(err);
  }
};
