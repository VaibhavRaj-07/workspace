import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import pinoHttp from 'pino-http';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler } from './middleware/error.middleware.js';
import { handleIdempotency } from './middleware/idempotency.middleware.js';
import { swaggerDocument } from './docs/swagger.js';
import { prisma } from './db/prisma.js';

// Route imports
import authRoutes from './modules/auth/auth.routes.js';
import projectRoutes from './modules/projects/project.routes.js';
import { taskRouter, projectTasksRouter } from './modules/tasks/task.routes.js';
import { commentRouter, taskCommentsRouter } from './modules/comments/comment.routes.js';
import { attachmentRouter, taskAttachmentsRouter } from './modules/attachments/attachment.routes.js';
import { dashboardRouter, projectAnalyticsRouter } from './modules/dashboard/dashboard.routes.js';
import notificationRoutes from './modules/notifications/notification.routes.js';
import { taskAiRouter, projectAiRouter, globalAiRouter } from './modules/ai/ai.routes.js';

export const app = express();

// Security & Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false, // For Swagger UI
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
    credentials: true,
  })
);

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Pino HTTP logger
if (env.NODE_ENV !== 'test') {
  app.use(
    (pinoHttp as any)({
      logger,
      autoLogging: {
        ignore: (req: Request) => req.url === '/health' || req.url?.startsWith('/docs'),
      },
    })
  );
}

// Rate Limiter
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests from this IP, please try again later.',
    },
  },
});
app.use('/api/', limiter);

// Idempotency Handler for POST requests
app.use(handleIdempotency);

// Static uploads serving
const uploadsDir = path.resolve(process.cwd(), env.UPLOAD_DIR);
app.use('/uploads', express.static(uploadsDir));

// Swagger documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  let dbStatus = 'healthy';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    dbStatus = 'unreachable';
  }

  return res.status(200).json({
    status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptimeSeconds: process.uptime(),
    database: dbStatus,
    version: '1.0.0',
    environment: env.NODE_ENV,
  });
});

// API Routes
const apiV1 = express.Router();

apiV1.use('/ai', globalAiRouter);
apiV1.use('/auth', authRoutes);
apiV1.use('/projects', projectRoutes);
apiV1.use('/projects/:id/tasks', projectTasksRouter);
apiV1.use('/projects/:id', projectAnalyticsRouter);
apiV1.use('/projects/:id', projectAiRouter);
apiV1.use('/tasks', taskRouter);
apiV1.use('/tasks', taskAiRouter);
apiV1.use('/tasks/:id/comments', taskCommentsRouter);
apiV1.use('/tasks/:id/attachments', taskAttachmentsRouter);
apiV1.use('/comments', commentRouter);
apiV1.use('/attachments', attachmentRouter);
apiV1.use('/dashboard', dashboardRouter);
apiV1.use('/notifications', notificationRoutes);

app.use('/api/v1', apiV1);

// 404 Handler for unmatched routes
app.use((_req: Request, res: Response) => {
  return res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Requested route does not exist',
    },
  });
});

// Centralized Error Handler
app.use(errorHandler);
