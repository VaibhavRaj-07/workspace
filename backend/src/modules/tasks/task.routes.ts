import { Router } from 'express';
import { taskController } from './task.controller.js';
import { authenticateJWT } from '../../middleware/auth.middleware.js';
import { requireProjectRole } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  assignTaskSchema,
  moveTaskSchema,
  resolveConflictSchema,
  taskQuerySchema,
} from './task.schema.js';
import { ProjectRole } from '@prisma/client';

export const taskRouter = Router();

// All task routes require authentication
taskRouter.use(authenticateJWT);

// Specific task routes under /tasks/:id
taskRouter.get('/:id', taskController.getById);

taskRouter.patch(
  '/:id',
  validate(updateTaskSchema),
  taskController.update
);

taskRouter.patch(
  '/:id/status',
  validate(updateTaskStatusSchema),
  taskController.updateStatus
);

taskRouter.patch(
  '/:id/assign',
  validate(assignTaskSchema),
  taskController.assign
);

taskRouter.patch(
  '/:id/move',
  validate(moveTaskSchema),
  taskController.move
);

taskRouter.post(
  '/:id/resolve-conflict',
  validate(resolveConflictSchema),
  taskController.resolveConflict
);

taskRouter.delete(
  '/:id',
  taskController.delete
);

// Project-nested routes router to mount at /projects/:id/tasks
export const projectTasksRouter = Router({ mergeParams: true });

projectTasksRouter.use(authenticateJWT);

projectTasksRouter.post(
  '/',
  requireProjectRole(ProjectRole.member),
  validate(createTaskSchema),
  taskController.create
);

projectTasksRouter.get(
  '/',
  requireProjectRole(ProjectRole.viewer),
  validate(taskQuerySchema),
  taskController.list
);
