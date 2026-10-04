import { Router } from 'express';
import { commentController } from './comment.controller.js';
import { authenticateJWT } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createCommentSchema, updateCommentSchema } from './comment.schema.js';

export const commentRouter = Router();

// Routes mounted at /comments/:id
commentRouter.use(authenticateJWT);
commentRouter.patch('/:id', validate(updateCommentSchema), commentController.update);
commentRouter.delete('/:id', commentController.delete);

// Routes mounted at /tasks/:id/comments
export const taskCommentsRouter = Router({ mergeParams: true });
taskCommentsRouter.use(authenticateJWT);
taskCommentsRouter.get('/', commentController.getByTaskId);
taskCommentsRouter.post('/', validate(createCommentSchema), commentController.create);
