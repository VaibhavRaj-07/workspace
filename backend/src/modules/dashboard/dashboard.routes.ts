import { Router } from 'express';
import { dashboardController } from './dashboard.controller.js';
import { authenticateJWT } from '../../middleware/auth.middleware.js';
import { requireProjectRole } from '../../middleware/rbac.middleware.js';
import { ProjectRole } from '@prisma/client';

export const dashboardRouter = Router();
dashboardRouter.use(authenticateJWT);
dashboardRouter.get('/overview', dashboardController.getOverview);

export const projectAnalyticsRouter = Router({ mergeParams: true });
projectAnalyticsRouter.use(authenticateJWT);
projectAnalyticsRouter.get(
  '/progress',
  requireProjectRole(ProjectRole.viewer),
  dashboardController.getProjectProgress
);
projectAnalyticsRouter.get(
  '/activity',
  requireProjectRole(ProjectRole.viewer),
  dashboardController.getProjectActivity
);
