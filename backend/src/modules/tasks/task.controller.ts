import { Request, Response, NextFunction } from 'express';
import { taskService } from './task.service.js';
import { ApiResponse } from '../../utils/api-response.js';

export class TaskController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId || req.params.id || req.body.projectId;
      const createdById = req.user!.id;
      const task = await taskService.createTask(projectId, createdById, req.body);
      return ApiResponse.created(res, task);
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId || req.params.id;
      const result = await taskService.getProjectTasks(projectId, req.query as any);
      return ApiResponse.success(res, result.tasks, 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const task = await taskService.getTaskById(req.params.id);
      return ApiResponse.success(res, task);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.id;
      const actorId = req.user!.id;
      const ifMatchHeader = req.header('If-Match');
      const result = await taskService.updateTask(taskId, actorId, req.body, ifMatchHeader);
      return ApiResponse.success(res, result.task);
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.id;
      const actorId = req.user!.id;
      const ifMatchHeader = req.header('If-Match');
      const { status, version } = req.body;
      const result = await taskService.updateTaskStatus(
        taskId,
        actorId,
        status,
        version,
        ifMatchHeader
      );
      return ApiResponse.success(res, result.task);
    } catch (error) {
      next(error);
    }
  }

  async assign(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.id;
      const actorId = req.user!.id;
      const ifMatchHeader = req.header('If-Match');
      const { assigneeId, version } = req.body;
      const result = await taskService.assignTask(
        taskId,
        actorId,
        assigneeId,
        version,
        ifMatchHeader
      );
      return ApiResponse.success(res, result.task);
    } catch (error) {
      next(error);
    }
  }

  async move(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.id;
      const actorId = req.user!.id;
      const ifMatchHeader = req.header('If-Match');
      const { status, position, version } = req.body;
      const result = await taskService.moveTask(
        taskId,
        actorId,
        status,
        position,
        version,
        ifMatchHeader
      );
      return ApiResponse.success(res, result.task);
    } catch (error) {
      next(error);
    }
  }

  async resolveConflict(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.id;
      const actorId = req.user!.id;
      const resolved = await taskService.resolveConflict(taskId, actorId, req.body);
      return ApiResponse.success(res, resolved);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.id;
      const actorId = req.user!.id;
      const result = await taskService.deleteTask(taskId, actorId);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const taskController = new TaskController();

