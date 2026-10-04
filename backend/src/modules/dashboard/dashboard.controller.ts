import { Request, Response, NextFunction } from 'express';
import { dashboardService } from './dashboard.service.js';
import { ApiResponse } from '../../utils/api-response.js';

export class DashboardController {
  async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const overview = await dashboardService.getUserOverview(userId);
      return ApiResponse.success(res, overview);
    } catch (error) {
      next(error);
    }
  }

  async getProjectProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.id;
      const progress = await dashboardService.getProjectProgress(projectId);
      return ApiResponse.success(res, progress);
    } catch (error) {
      next(error);
    }
  }

  async getProjectActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.id;
      const feed = await dashboardService.getProjectActivityFeed(projectId, req.query as any);
      return ApiResponse.success(res, feed.activities, 200, feed.pagination);
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
