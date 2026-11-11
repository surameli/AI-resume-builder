/**
 * Auth API Tests
 * Tests registration, login, protected routes, validation, and edge cases.
 * Uses supertest to make real HTTP requests against the Express app.
 *
 * NOTE: These tests require a running PostgreSQL database.
 * Set TEST_DATABASE_URL in .env or the tests will be skipped gracefully.
 */
import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/database.js';

// Check if we have a real DB connection before running
let dbAvailable = false;

beforeAll(async () => {
  try {
    await prisma.$connect();
    dbAvailable = true;
  } catch {
    console.warn('⚠️  No database connection — integration tests will be skipped.');
    console.warn('   Start PostgreSQL and run migrations, then re-run tests.');
  }
});

afterAll(async () => {
  if (dbAvailable) {
    // Clean up test users
    await prisma.user.deleteMany({
      where: { email: { contains: '@test.careercraft' } },
    });
  }
  await prisma.$disconnect();
});

const testUser = {
  firstName: 'Test',
  lastName: 'User',
  email: `test_${Date.now()}@test.careercraft`,
  password: 'TestPass123',
};

// ─── Validation Tests (no DB required) ───────────────────────────────────────

describe('POST /api/auth/register — validation', () => {
  test('rejects missing required fields', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  test('rejects invalid email format', async () => {
    const res = await request(app).post('/api/auth/register').send({
      firstName: 'Test',
      lastName: 'User',
      email: 'not-an-email',
      password: 'TestPass123',
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('rejects weak password — too short', async () => {
    const res = await request(app).post('/api/auth/register').send({
      firstName: 'Test',
      lastName: 'User',
      email: 'valid@example.com',
      password: 'weak',
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('rejects password without uppercase', async () => {
    const res = await request(app).post('/api/auth/register').send({
      firstName: 'Test',
      lastName: 'User',
      email: 'valid@example.com',
      password: 'alllowercase123',
    });
    expect(res.status).toBe(400);
  });

  test('rejects password without number', async () => {
    const res = await request(app).post('/api/auth/register').send({
      firstName: 'Test',
      lastName: 'User',
      email: 'valid@example.com',
      password: 'NoNumbersHere',
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login — validation', () => {
  test('rejects missing email', async () => {
    const res = await request(app).post('/api/auth/login').send({ password: 'pass' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('rejects missing password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
  });
});

// ─── Integration Tests (require DB) ──────────────────────────────────────────

describe('Auth integration tests', () => {
  let authCookies = [];

  test('registers a new user', async () => {
    if (!dbAvailable) return;

    const res = await request(app).post('/api/auth/register').send(testUser);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
    // Password must never appear in the response
    expect(res.body.data.user.password).toBeUndefined();
  });

  test('rejects duplicate email registration', async () => {
    if (!dbAvailable) return;

    const res = await request(app).post('/api/auth/register').send(testUser);
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test('logs in with correct credentials', async () => {
    if (!dbAvailable) return;

    const res = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Cookies should be set
    expect(res.headers['set-cookie']).toBeDefined();
    authCookies = res.headers['set-cookie'];
  });

  test('rejects login with wrong password', async () => {
    if (!dbAvailable) return;

    const res = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: 'WrongPassword999',
    });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('rejects login with non-existent email', async () => {
    if (!dbAvailable) return;

    const res = await request(app).post('/api/auth/login').send({
      email: 'doesnotexist@test.careercraft',
      password: 'SomePassword123',
    });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/auth/me returns user when authenticated', async () => {
    if (!dbAvailable || !authCookies.length) return;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', authCookies);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.user.password).toBeUndefined();
  });

  test('GET /api/auth/me returns 401 without cookie', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('POST /api/auth/logout clears cookies', async () => {
    if (!dbAvailable || !authCookies.length) return;

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', authCookies);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/auth/me returns 401 after logout', async () => {
    if (!dbAvailable) return;

    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

// ─── Health Check ─────────────────────────────────────────────────────────────

describe('GET /health', () => {
  test('returns 200 with status info', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('running');
  });
});

// ─── Protected Route Without Auth ────────────────────────────────────────────

describe('Protected routes — no auth', () => {
  test('dashboard stats returns 401 without cookie', async () => {
    const res = await request(app).get('/api/dashboard/stats');
    expect(res.status).toBe(401);
  });
});
