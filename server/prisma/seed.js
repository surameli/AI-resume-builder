/**
 * Prisma Seed Script
 * Seeds the database with initial data: resume templates and an admin account.
 * Run with: npm run prisma:seed
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Resume Templates ────────────────────────────────────────────────────
  const templates = [
    {
      name: 'Professional',
      slug: 'professional',
      category: 'professional',
      description: 'A clean, ATS-friendly single-column template ideal for corporate roles.',
      displayOrder: 1,
      isActive: true,
      isPremium: false,
    },
    {
      name: 'Modern',
      slug: 'modern',
      category: 'modern',
      description: 'Contemporary design with a subtle accent bar. Great for tech companies.',
      displayOrder: 2,
      isActive: true,
      isPremium: false,
    },
    {
      name: 'Minimalist',
      slug: 'minimalist',
      category: 'minimalist',
      description: 'Stripped-back layout with maximum white space. Highly ATS-compatible.',
      displayOrder: 3,
      isActive: true,
      isPremium: false,
    },
    {
      name: 'Creative',
      slug: 'creative',
      category: 'creative',
      description: 'A bold, expressive layout for design, marketing, and creative roles.',
      displayOrder: 4,
      isActive: true,
      isPremium: true,
    },
    {
      name: 'Technical',
      slug: 'technical',
      category: 'technical',
      description: 'Developer-focused with skills matrix and project highlights.',
      displayOrder: 5,
      isActive: true,
      isPremium: false,
    },
    {
      name: 'Executive',
      slug: 'executive',
      category: 'executive',
      description: 'Sophisticated layout for senior leadership and C-suite candidates.',
      displayOrder: 6,
      isActive: true,
      isPremium: true,
    },
    {
      name: 'Graduate',
      slug: 'graduate',
      category: 'graduate',
      description: 'Perfect for students and recent graduates entering the workforce.',
      displayOrder: 7,
      isActive: true,
      isPremium: false,
    },
    {
      name: 'Academic',
      slug: 'academic',
      category: 'academic',
      description: 'Curriculum vitae style for academic, research, and teaching positions.',
      displayOrder: 8,
      isActive: true,
      isPremium: false,
    },
  ];

  for (const template of templates) {
    await prisma.template.upsert({
      where: { slug: template.slug },
      update: template,
      create: template,
    });
  }
  console.log(`✅ ${templates.length} templates seeded`);

  // ─── Admin Account ───────────────────────────────────────────────────────
  const adminEmail = 'admin@careercraft.ai';
  const adminPassword = await bcrypt.hash('Admin@CareerCraft2024!', 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: adminPassword,
      role: 'ADMIN',
      isEmailVerified: true,
      subscription: {
        create: {
          plan: 'PRO',
          status: 'ACTIVE',
        },
      },
    },
  });

  console.log(`✅ Admin account ready: ${admin.email}`);
  console.log('   Password: Admin@CareerCraft2024!');
  console.log('   ⚠️  Change this password immediately in production!');

  console.log('\n🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
