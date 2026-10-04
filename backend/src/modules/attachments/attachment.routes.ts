import { Router } from 'express';
import { attachmentController } from './attachment.controller.js';
import { authenticateJWT } from '../../middleware/auth.middleware.js';
import { upload } from '../../middleware/upload.middleware.js';

export const attachmentRouter = Router();

// Routes mounted at /attachments/:id
attachmentRouter.use(authenticateJWT);
attachmentRouter.delete('/:id', attachmentController.delete);

// Routes mounted at /tasks/:id/attachments
export const taskAttachmentsRouter = Router({ mergeParams: true });
taskAttachmentsRouter.use(authenticateJWT);
taskAttachmentsRouter.get('/', attachmentController.getByTaskId);
taskAttachmentsRouter.post('/', upload.single('file'), attachmentController.upload);
