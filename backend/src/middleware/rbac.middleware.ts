import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma.js';
import { ApiError } from '../utils/api-error.js';
import { ROLES, ERROR_CODES } from '../config/constants.js';
import { ProjectRole } from '@prisma/client';

export const ROLE_HIERARCHY: Record<ProjectRole, number> = {
  [ProjectRole.viewer]: 1,
  [ProjectRole.member]: 2,
  [ProjectRole.admin]: 3,
  [ProjectRole.owner]: 4,
};

declare global {
  namespace Express {
    interface Request {
      projectMembership?: {
        projectId: string;
        userId: string;
        role: ProjectRole;
      };
    }
  }
}

/**
 * Middleware to check if user has access to a project with at least the required role
 */
export function requireProjectRole(minRole: ProjectRole = ProjectRole.viewer) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(new ApiError(401, 'Unauthorized', ERROR_CODES.UNAUTHORIZED));
      }

      // Determine project ID from params (projectId or id) or body
      let projectId = req.params.projectId || req.params.id;

      // If task ID is provided in params, fetch project ID from task
      if (!projectId && req.params.taskId) {
        const task = await prisma.task.findUnique({
          where: { id: req.params.taskId },
          select: { projectId: true },
        });
        if (!task) {
          return next(new ApiError(404, 'Task not found', ERROR_CODES.NOT_FOUND));
        }
        projectId = task.projectId;
      }

      // If comment ID is provided in params, fetch project ID from comment -> task
      if (!projectId && req.params.commentId) {
        const comment = await prisma.comment.findUnique({
          where: { id: req.params.commentId },
          select: { task: { select: { projectId: true } } },
        });
        if (!comment) {
          return next(new ApiError(404, 'Comment not found', ERROR_CODES.NOT_FOUND));
        }
        projectId = comment.task.projectId;
      }

      if (!projectId) {
        return next(new ApiError(400, 'Project context is required', ERROR_CODES.BAD_REQUEST));
      }

      const membership = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId,
          },
        },
      });

      if (!membership) {
        return next(
          new ApiError(403, 'You are not a member of this project', ERROR_CODES.FORBIDDEN)
        );
      }

      const userRoleRank = ROLE_HIERARCHY[membership.role];
      const requiredRoleRank = ROLE_HIERARCHY[minRole];

      if (userRoleRank < requiredRoleRank) {
        return next(
          new ApiError(
            403,
            `Requires at least '${minRole}' role. Your role is '${membership.role}'`,
            ERROR_CODES.FORBIDDEN
          )
        );
      }

      req.projectMembership = {
        projectId: membership.projectId,
        userId: membership.userId,
        role: membership.role,
      };

      next();
    } catch (error) {
      next(error);
    }
  };
}
