import { Router } from 'express';
import { aiController } from './ai.controller.js';
import { authenticateJWT } from '../../middleware/auth.middleware.js';
import { requireProjectRole } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  aiMergeSuggestionSchema,
  checkDuplicatesSchema,
  suggestAssigneeSchema,
  taskRiskSchema,
  projectRiskSchema,
} from './ai.schema.js';
import { ProjectRole } from '@prisma/client';

// Global AI status router (/ai/...)
export const globalAiRouter = Router();
globalAiRouter.get('/status', (req, res, next) => aiController.getAiStatus(req, res, next));

// Router for task-scoped AI operations (/tasks/:id/...)
export const taskAiRouter = Router({ mergeParams: true });
taskAiRouter.use(authenticateJWT);

taskAiRouter.post(
  '/:id/ai-merge-suggestion',
  validate(aiMergeSuggestionSchema),
  (req, res, next) => aiController.getMergeSuggestion(req, res, next)
);

taskAiRouter.get(
  '/:id/risk',
  validate(taskRiskSchema),
  (req, res, next) => aiController.getTaskRisk(req, res, next)
);

// Router for project-scoped AI operations (/projects/:id/...)
export const projectAiRouter = Router({ mergeParams: true });
projectAiRouter.use(authenticateJWT);

projectAiRouter.post(
  '/tasks/check-duplicates',
  requireProjectRole(ProjectRole.viewer),
  validate(checkDuplicatesSchema),
  (req, res, next) => aiController.checkDuplicates(req, res, next)
);

projectAiRouter.get(
  '/tasks/suggest-assignee',
  requireProjectRole(ProjectRole.viewer),
  validate(suggestAssigneeSchema),
  (req, res, next) => aiController.suggestAssignee(req, res, next)
);

projectAiRouter.get(
  '/risk',
  requireProjectRole(ProjectRole.viewer),
  validate(projectRiskSchema),
  (req, res, next) => aiController.getProjectRisk(req, res, next)
);
