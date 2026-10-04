import http from 'http';
import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDB, disconnectDB } from './db/prisma.js';
import { initializeSocketServer } from './realtime/socket.server.js';
import { startScheduler, stopScheduler } from './jobs/scheduler.js';

const server = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocketServer(server);

async function start() {
  try {
    // 1. Connect to PostgreSQL
    await connectDB();

    // 2. Start Background Scheduler
    startScheduler();

    // 3. Listen on PORT
    server.listen(env.PORT, () => {
      logger.info(`🚀 Collaborative Workspace Backend running on http://localhost:${env.PORT}`);
      logger.info(`📚 Swagger OpenAPI Documentation available at http://localhost:${env.PORT}/docs`);
      logger.info(`⚡ Socket.IO listening on ws://localhost:${env.PORT}`);
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start application server');
    process.exit(1);
  }
}

// Graceful shutdown handling
async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  stopScheduler();

  io.close(() => {
    logger.info('Socket.IO server closed');
  });

  server.close(async () => {
    logger.info('HTTP server closed');
    await disconnectDB();
    process.exit(0);
  });

  // Force exit after 10s if graceful fails
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

if (process.env.NODE_ENV !== 'test') {
  start();
}

export { server, io };
