/**
 * Server entry point.
 * Imports the Express app, connects to the database, and starts listening.
 */
import { env } from './config/env.js';
import app from './app.js';
import prisma from './config/database.js';

const startServer = async () => {
  try {
    // Verify database connection before starting
    await prisma.$connect();
    console.log('✅ Database connected');

    const server = app.listen(env.PORT, () => {
      console.log(`\n🚀 CareerCraft AI API`);
      console.log(`   Environment : ${env.NODE_ENV}`);
      console.log(`   Port        : ${env.PORT}`);
      console.log(`   URL         : http://localhost:${env.PORT}`);
      console.log(`   Health      : http://localhost:${env.PORT}/health\n`);
    });

    // ─── Graceful Shutdown ────────────────────────────────────────────────
    const shutdown = async (signal) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        await prisma.$disconnect();
        console.log('Database disconnected. Server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    console.error('\nMake sure PostgreSQL is running and DATABASE_URL in .env is correct.');
    console.error('Then run: npm run prisma:migrate\n');
    await prisma.$disconnect();
    process.exit(1);
  }
};

startServer();
