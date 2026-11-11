/**
 * Prisma client singleton
 * Exports a single PrismaClient instance to be used throughout the app.
 * This prevents creating too many database connections.
 */
import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

const prisma = new PrismaClient({
  log: env.isDev ? ['query', 'info', 'warn', 'error'] : ['error'],
});

export default prisma;
