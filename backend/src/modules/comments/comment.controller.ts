import { Request, Response, NextFunction } from 'express';
import { commentService } from './comment.service.js';
import { ApiResponse } from '../../utils/api-response.js';

export class CommentController {
  async getByTaskId(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.id;
      const comments = await commentService.getCommentsByTaskId(taskId);
      return ApiResponse.success(res, comments);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.id;
      const authorId = req.user!.id;
      const comment = await commentService.createComment(taskId, authorId, req.body);
      return ApiResponse.created(res, comment);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const commentId = req.params.id;
      const authorId = req.user!.id;
      const updated = await commentService.updateComment(commentId, authorId, req.body);
      return ApiResponse.success(res, updated);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const commentId = req.params.id;
      const actorId = req.user!.id;
      const result = await commentService.deleteComment(commentId, actorId);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const commentController = new CommentController();
