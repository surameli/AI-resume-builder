/**
 * Profile API Tests
 * Covers: validation, ownership protection, and CRUD operations.
 * Integration tests auto-skip when PostgreSQL is unavailable.
 */
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/database.js';

let dbAvailable = false;
let authCookies  = [];
let authCookies2 = []; // second user for ownership tests
let profileCreated = false;

const user1 = {
  firstName: 'Alice',
  lastName:  'Profile',
  email:     `alice_${Date.now()}@test.careercraft`,
  password:  'TestPass123',
};
const user2 = {
  firstName: 'Bob',
  lastName:  'Other',
  email:     `bob_${Date.now()}@test.careercraft`,
  password:  'TestPass123',
};

beforeAll(async () => {
  try {
    await prisma.$connect();
    dbAvailable = true;

    // Register + login user 1
    await request(app).post('/api/auth/register').send(user1);
    const r1 = await request(app).post('/api/auth/login').send({ email: user1.email, password: user1.password });
    authCookies = r1.headers['set-cookie'] || [];

    // Register + login user 2
    await request(app).post('/api/auth/register').send(user2);
    const r2 = await request(app).post('/api/auth/login').send({ email: user2.email, password: user2.password });
    authCookies2 = r2.headers['set-cookie'] || [];
  } catch {
    console.warn('⚠️  No database — profile integration tests will be skipped.');
  }
}, 30000);

afterAll(async () => {
  if (dbAvailable) {
    await prisma.user.deleteMany({ where: { email: { contains: '@test.careercraft' } } });
  }
  await prisma.$disconnect();
});

// ─── Validation tests (no DB required) ───────────────────────────────────────

describe('Profile validation', () => {
  test('PUT /api/profile rejects missing firstName', async () => {
    // We need a cookie for auth middleware to pass; with no DB it will 401
    // but validation happens after auth — so just check field-level errors
    // when we have a session
    if (!dbAvailable || !authCookies.length) return;

    const res = await request(app)
      .put('/api/profile')
      .set('Cookie', authCookies)
      .send({ lastName: 'Test' });
    expect(res.status).toBe(400);
    expect(res.body.errors?.some((e) => e.field === 'firstName')).toBe(true);
  });

  test('POST /api/profile/experiences rejects missing company', async () => {
    if (!dbAvailable || !authCookies.length) return;

    const res = await request(app)
      .post('/api/profile/experiences')
      .set('Cookie', authCookies)
      .send({ jobTitle: 'Engineer', startDate: '2022-01-01' });
    expect(res.status).toBe(400);
    expect(res.body.errors?.some((e) => e.field === 'company')).toBe(true);
  });

  test('POST /api/profile/education rejects missing institution', async () => {
    if (!dbAvailable || !authCookies.length) return;

    const res = await request(app)
      .post('/api/profile/education')
      .set('Cookie', authCookies)
      .send({ degree: 'BSc', startDate: '2018-09-01' });
    expect(res.status).toBe(400);
    expect(res.body.errors?.some((e) => e.field === 'institution')).toBe(true);
  });

  test('POST /api/profile/skills rejects missing name', async () => {
    if (!dbAvailable || !authCookies.length) return;

    const res = await request(app)
      .post('/api/profile/skills')
      .set('Cookie', authCookies)
      .send({ category: 'TECHNICAL' });
    expect(res.status).toBe(400);
  });

  test('POST /api/profile/certifications rejects missing issuingOrg', async () => {
    if (!dbAvailable || !authCookies.length) return;

    const res = await request(app)
      .post('/api/profile/certifications')
      .set('Cookie', authCookies)
      .send({ name: 'AWS Solutions Architect' });
    expect(res.status).toBe(400);
    expect(res.body.errors?.some((e) => e.field === 'issuingOrg')).toBe(true);
  });
});

// ─── Auth guard tests (no DB required) ───────────────────────────────────────

describe('Profile endpoints require authentication', () => {
  test('GET /api/profile returns 401 without cookie', async () => {
    const res = await request(app).get('/api/profile');
    expect(res.status).toBe(401);
  });

  test('PUT /api/profile returns 401 without cookie', async () => {
    const res = await request(app).put('/api/profile').send({ firstName: 'X', lastName: 'Y' });
    expect(res.status).toBe(401);
  });

  test('POST /api/profile/experiences returns 401 without cookie', async () => {
    const res = await request(app).post('/api/profile/experiences').send({});
    expect(res.status).toBe(401);
  });
});

// ─── Integration tests (require DB) ──────────────────────────────────────────

describe('Profile CRUD integration', () => {
  let experienceId, educationId, skillId, projectId, certId;

  test('GET /api/profile returns a profile (auto-created)', async () => {
    if (!dbAvailable || !authCookies.length) return;

    const res = await request(app).get('/api/profile').set('Cookie', authCookies);
    expect(res.status).toBe(200);
    expect(res.body.data.profile).toBeDefined();
    expect(res.body.data.completion).toBeGreaterThanOrEqual(0);
    profileCreated = true;
  });

  test('PUT /api/profile updates personal information', async () => {
    if (!dbAvailable || !authCookies.length) return;

    const res = await request(app)
      .put('/api/profile')
      .set('Cookie', authCookies)
      .send({
        firstName: 'Alice',
        lastName:  'Smith',
        professionalTitle: 'Senior Engineer',
        summary: 'Experienced software engineer.',
        location: 'San Francisco, CA',
      });
    expect(res.status).toBe(200);
    expect(res.body.data.profile.firstName).toBe('Alice');
    expect(res.body.data.profile.professionalTitle).toBe('Senior Engineer');
    expect(res.body.data.completion).toBeGreaterThan(0);
  });

  test('POST /api/profile/experiences creates an experience', async () => {
    if (!dbAvailable || !authCookies.length) return;

    const res = await request(app)
      .post('/api/profile/experiences')
      .set('Cookie', authCookies)
      .send({
        company:  'Acme Corp',
        jobTitle: 'Software Engineer',
        employmentType: 'FULL_TIME',
        startDate: '2021-06-01',
        isCurrent: true,
        responsibilities: 'Built scalable APIs.',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.experience.company).toBe('Acme Corp');
    experienceId = res.body.data.experience.id;
  });

  test('PUT /api/profile/experiences/:id updates the experience', async () => {
    if (!dbAvailable || !experienceId) return;

    const res = await request(app)
      .put(`/api/profile/experiences/${experienceId}`)
      .set('Cookie', authCookies)
      .send({ jobTitle: 'Lead Engineer' });
    expect(res.status).toBe(200);
    expect(res.body.data.experience.jobTitle).toBe('Lead Engineer');
  });

  test('POST /api/profile/education creates an education record', async () => {
    if (!dbAvailable || !authCookies.length) return;

    const res = await request(app)
      .post('/api/profile/education')
      .set('Cookie', authCookies)
      .send({
        institution:  'State University',
        degree:       'Bachelor of Science',
        fieldOfStudy: 'Computer Science',
        startDate:    '2017-09-01',
        graduationDate: '2021-05-01',
      });
    expect(res.status).toBe(201);
    educationId = res.body.data.education.id;
  });

  test('POST /api/profile/skills creates a skill', async () => {
    if (!dbAvailable || !authCookies.length) return;

    const res = await request(app)
      .post('/api/profile/skills')
      .set('Cookie', authCookies)
      .send({ name: 'Node.js', category: 'FRAMEWORK', proficiencyLevel: 5 });
    expect(res.status).toBe(201);
    skillId = res.body.data.skill.id;
  });

  test('POST /api/profile/projects creates a project', async () => {
    if (!dbAvailable || !authCookies.length) return;

    const res = await request(app)
      .post('/api/profile/projects')
      .set('Cookie', authCookies)
      .send({
        name: 'CareerCraft AI',
        description: 'AI-powered resume builder',
        technologies: ['React', 'Node.js', 'PostgreSQL'],
      });
    expect(res.status).toBe(201);
    projectId = res.body.data.project.id;
  });

  test('POST /api/profile/certifications creates a certification', async () => {
    if (!dbAvailable || !authCookies.length) return;

    const res = await request(app)
      .post('/api/profile/certifications')
      .set('Cookie', authCookies)
      .send({
        name: 'AWS Solutions Architect',
        issuingOrg: 'Amazon Web Services',
        issueDate: '2023-01-15',
      });
    expect(res.status).toBe(201);
    certId = res.body.data.certification.id;
  });

  test('GET /api/profile now shows all added sub-records', async () => {
    if (!dbAvailable || !authCookies.length) return;

    const res = await request(app).get('/api/profile').set('Cookie', authCookies);
    expect(res.status).toBe(200);
    expect(res.body.data.profile.experiences.length).toBeGreaterThan(0);
    expect(res.body.data.profile.education.length).toBeGreaterThan(0);
    expect(res.body.data.profile.skills.length).toBeGreaterThan(0);
    expect(res.body.data.profile.projects.length).toBeGreaterThan(0);
    expect(res.body.data.profile.certifications.length).toBeGreaterThan(0);
    // Completion should now be much higher
    expect(res.body.data.completion).toBeGreaterThan(30);
  });

  // ─── Ownership tests ────────────────────────────────────────────────────────

  test('User 2 cannot update User 1 experience', async () => {
    if (!dbAvailable || !experienceId || !authCookies2.length) return;

    const res = await request(app)
      .put(`/api/profile/experiences/${experienceId}`)
      .set('Cookie', authCookies2)
      .send({ jobTitle: 'Hacked' });
    // Should be 404 (profile not found for user 2 to even look up) or 403
    expect([403, 404]).toContain(res.status);
  });

  test('User 2 cannot delete User 1 skill', async () => {
    if (!dbAvailable || !skillId || !authCookies2.length) return;

    const res = await request(app)
      .delete(`/api/profile/skills/${skillId}`)
      .set('Cookie', authCookies2);
    expect([403, 404]).toContain(res.status);
  });

  // ─── Delete tests ───────────────────────────────────────────────────────────

  test('DELETE /api/profile/certifications/:id removes certification', async () => {
    if (!dbAvailable || !certId) return;

    const res = await request(app)
      .delete(`/api/profile/certifications/${certId}`)
      .set('Cookie', authCookies);
    expect(res.status).toBe(200);
  });

  test('DELETE /api/profile/skills/:id removes skill', async () => {
    if (!dbAvailable || !skillId) return;

    const res = await request(app)
      .delete(`/api/profile/skills/${skillId}`)
      .set('Cookie', authCookies);
    expect(res.status).toBe(200);
  });
});
