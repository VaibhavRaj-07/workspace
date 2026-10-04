import { Request, Response, NextFunction } from 'express';
import { notificationService } from './notification.service.js';
import { ApiResponse } from '../../utils/api-response.js';

export class NotificationController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const unreadOnly = req.query.unreadOnly === 'true';
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 30;

      const result = await notificationService.getUserNotifications(userId, {
        unreadOnly,
        page,
        limit,
      });

      return res.status(200).json({
        success: true,
        data: result.notifications,
        unreadCount: result.unreadCount,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      const notificationId = req.params.id;
      const userId = req.user!.id;
      const updated = await notificationService.markAsRead(notificationId, userId);
      return ApiResponse.success(res, updated);
    } catch (error) {
      next(error);
    }
  }

  async markAllRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const result = await notificationService.markAllAsRead(userId);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const notificationController = new NotificationController();
