import { Request, Response, NextFunction } from 'express';
import { attachmentService } from './attachment.service.js';
import { ApiResponse } from '../../utils/api-response.js';
import { ApiError } from '../../utils/api-error.js';

export class AttachmentController {
  async getByTaskId(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.id;
      const attachments = await attachmentService.getAttachmentsByTaskId(taskId);
      return ApiResponse.success(res, attachments);
    } catch (error) {
      next(error);
    }
  }

  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.id;
      const userId = req.user!.id;
      if (!req.file) {
        throw ApiError.badRequest('No file uploaded');
      }
      const attachment = await attachmentService.uploadAttachment(taskId, userId, req.file);
      return ApiResponse.created(res, attachment);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const attachmentId = req.params.id;
      const userId = req.user!.id;
      const result = await attachmentService.deleteAttachment(attachmentId, userId);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const attachmentController = new AttachmentController();
