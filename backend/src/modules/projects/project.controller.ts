import { Request, Response, NextFunction } from 'express';
import { projectService } from './project.service.js';
import { ApiResponse } from '../../utils/api-response.js';

export class ProjectController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const project = await projectService.createProject(userId, req.body);
      return ApiResponse.created(res, project);
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const result = await projectService.getUserProjects(userId, req.query as any);
      return ApiResponse.success(res, result.projects, 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const project = await projectService.getProjectById(req.params.id);
      return ApiResponse.success(res, project);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.id;
      const actorId = req.user!.id;
      const project = await projectService.updateProject(projectId, actorId, req.body);
      return ApiResponse.success(res, project);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.id;
      const actorId = req.user!.id;
      const result = await projectService.deleteProject(projectId, actorId);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async addMember(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.id;
      const actorId = req.user!.id;
      const member = await projectService.addMember(projectId, actorId, req.body);
      return ApiResponse.created(res, member);
    } catch (error) {
      next(error);
    }
  }

  async updateMemberRole(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.id;
      const targetUserId = req.params.userId;
      const actorId = req.user!.id;
      const member = await projectService.updateMemberRole(projectId, targetUserId, actorId, req.body);
      return ApiResponse.success(res, member);
    } catch (error) {
      next(error);
    }
  }

  async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.id;
      const targetUserId = req.params.userId;
      const actorId = req.user!.id;
      const result = await projectService.removeMember(projectId, targetUserId, actorId);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const projectController = new ProjectController();
