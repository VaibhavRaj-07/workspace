import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service.js';
import { ApiResponse } from '../../utils/api-response.js';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body);
      return ApiResponse.created(res, result);
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.login(req.body);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refresh(refreshToken);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const user = await authService.getCurrentUser(userId);
      return ApiResponse.success(res, user);
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
