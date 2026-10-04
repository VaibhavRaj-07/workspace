import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger.js';

export const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === 'development'
      ? [
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'warn' },
        ]
      : ['error'],
});

prisma.$on('error' as never, (e: any) => {
  logger.error(e, 'Prisma Client error');
});

export async function connectDB() {
  try {
    await prisma.$connect();
    logger.info(' Connected to PostgreSQL database');
  } catch (error) {
    logger.error(error, '❌ Failed to connect to PostgreSQL');
    // In test environment, allow continuing or mock if needed
  }
}

export async function disconnectDB() {
  await prisma.$disconnect();
  logger.info(' Disconnected from PostgreSQL database');
}
