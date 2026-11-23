import { describe, expect, test } from '@jest/globals';
import { loginSchema } from '../src/validators/auth.validator.js';

describe('login email validation', () => {
  test('trims and lowercases email before validating it', () => {
    expect(loginSchema.parse({
      email: '  USER@example.com  ',
      password: 'pass',
    }).email).toBe('user@example.com');
  });
});
