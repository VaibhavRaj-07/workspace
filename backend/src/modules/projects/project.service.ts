import { prisma } from '../../db/prisma.js';
import { ApiError } from '../../utils/api-error.js';
import { ERROR_CODES } from '../../config/constants.js';
import { ProjectRole, ProjectStatus } from '@prisma/client';
import {
  CreateProjectInput,
  UpdateProjectInput,
  AddProjectMemberInput,
  UpdateProjectMemberInput,
} from './project.schema.js';
import { realtimeEmitter } from '../../realtime/event.emitter.js';

export class ProjectService {
  async createProject(userId: string, input: CreateProjectInput) {
    const project = await prisma.$transaction(async (tx) => {
      const newProj = await tx.project.create({
        data: {
          name: input.name,
          description: input.description || null,
          ownerId: userId,
          deadline: input.deadline ? new Date(input.deadline) : null,
          autoCompleteWhenAllDone: input.autoCompleteWhenAllDone ?? true,
          status: ProjectStatus.active,
        },
      });

      // Add creator as owner member
      await tx.projectMember.create({
        data: {
          projectId: newProj.id,
          userId,
          role: ProjectRole.owner,
        },
      });

      // Record activity log
      await tx.activityLog.create({
        data: {
          projectId: newProj.id,
          actorId: userId,
          action: 'PROJECT_CREATED',
          metadata: { projectName: newProj.name },
        },
      });

      return newProj;
    });

    return project;
  }

  async getUserProjects(
    userId: string,
    query: {
      status?: ProjectStatus;
      page?: number;
      limit?: number;
      search?: string;
      cursor?: string;
    }
  ) {
    const limit = query.limit || 20;
    const page = query.page || 1;
    const skip = (page - 1) * limit;

    const where: any = {
      members: {
        some: {
          userId,
        },
      },
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, projects] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        include: {
          owner: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, avatarUrl: true },
              },
            },
          },
          _count: {
            select: { tasks: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      projects,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async getProjectById(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        _count: {
          select: { tasks: true },
        },
      },
    });

    if (!project) {
      throw new ApiError(404, 'Project not found', ERROR_CODES.NOT_FOUND);
    }

    return project;
  }

  async updateProject(
    projectId: string,
    actorId: string,
    input: UpdateProjectInput
  ) {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.project.findUnique({
        where: { id: projectId },
      });

      if (!existing) {
        throw new ApiError(404, 'Project not found', ERROR_CODES.NOT_FOUND);
      }

      // Check OCC version if provided
      if (input.version !== undefined && input.version !== existing.version) {
        throw new ApiError(
          409,
          'Project was modified by another user',
          ERROR_CODES.VERSION_CONFLICT,
          {
            currentVersion: existing.version,
            currentProject: existing,
          }
        );
      }

      const updated = await tx.project.update({
        where: { id: projectId },
        data: {
          name: input.name ?? existing.name,
          description: input.description !== undefined ? input.description : existing.description,
          deadline: input.deadline !== undefined ? (input.deadline ? new Date(input.deadline) : null) : existing.deadline,
          status: input.status ?? existing.status,
          autoCompleteWhenAllDone: input.autoCompleteWhenAllDone ?? existing.autoCompleteWhenAllDone,
          version: existing.version + 1,
        },
      });

      await tx.activityLog.create({
        data: {
          projectId,
          actorId,
          action: 'PROJECT_UPDATED',
          metadata: { changes: input },
        },
      });

      // Emit real-time event after transaction commit
      realtimeEmitter.emitProjectEvent({
        projectId,
        eventType: 'project:updated',
        entity: 'project',
        entityId: projectId,
        version: updated.version,
        actorId,
        data: updated,
      });

      return updated;
    });
  }

  async deleteProject(projectId: string, actorId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new ApiError(404, 'Project not found', ERROR_CODES.NOT_FOUND);
    }

    if (project.ownerId !== actorId) {
      throw new ApiError(403, 'Only the project owner can delete the project', ERROR_CODES.FORBIDDEN);
    }

    await prisma.project.delete({
      where: { id: projectId },
    });

    return { id: projectId, deleted: true };
  }

  async addMember(projectId: string, actorId: string, input: AddProjectMemberInput) {
    let targetUserId = input.userId;

    if (!targetUserId && input.email) {
      const user = await prisma.user.findUnique({
        where: { email: input.email.toLowerCase() },
      });
      if (!user) {
        throw new ApiError(404, `User with email ${input.email} not found`, ERROR_CODES.NOT_FOUND);
      }
      targetUserId = user.id;
    }

    if (!targetUserId) {
      throw new ApiError(400, 'User ID or valid email is required', ERROR_CODES.BAD_REQUEST);
    }

    const existingMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId,
        },
      },
    });

    if (existingMember) {
      throw new ApiError(409, 'User is already a member of this project', ERROR_CODES.ALREADY_EXISTS);
    }

    const member = await prisma.projectMember.create({
      data: {
        projectId,
        userId: targetUserId,
        role: input.role || ProjectRole.member,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    });

    // Record activity
    await prisma.activityLog.create({
      data: {
        projectId,
        actorId,
        action: 'MEMBER_ADDED',
        metadata: { addedUserId: targetUserId, role: member.role },
      },
    });

    // Create notification for added user
    const notification = await prisma.notification.create({
      data: {
        userId: targetUserId,
        type: 'PROJECT_INVITATION',
        payload: {
          projectId,
          projectName: member.project.name,
          role: member.role,
          addedBy: actorId,
        },
      },
    });

    // Emit real-time notification
    realtimeEmitter.emitUserEvent(targetUserId, 'notification:new', notification);

    // Emit project event
    realtimeEmitter.emitProjectEvent({
      projectId,
      eventType: 'member:added',
      entity: 'project_member',
      entityId: member.id,
      actorId,
      data: member,
    });

    return member;
  }

  async updateMemberRole(
    projectId: string,
    targetUserId: string,
    actorId: string,
    input: UpdateProjectMemberInput
  ) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new ApiError(404, 'Project not found', ERROR_CODES.NOT_FOUND);
    }

    // Owner role cannot be changed through this endpoint
    if (project.ownerId === targetUserId) {
      throw new ApiError(400, 'Cannot change role of project owner', ERROR_CODES.BAD_REQUEST);
    }

    const member = await prisma.projectMember.update({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId,
        },
      },
      data: {
        role: input.role,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    await prisma.activityLog.create({
      data: {
        projectId,
        actorId,
        action: 'MEMBER_ROLE_UPDATED',
        metadata: { targetUserId, newRole: input.role },
      },
    });

    realtimeEmitter.emitProjectEvent({
      projectId,
      eventType: 'member:updated',
      entity: 'project_member',
      entityId: member.id,
      actorId,
      data: member,
    });

    return member;
  }

  async removeMember(projectId: string, targetUserId: string, actorId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new ApiError(404, 'Project not found', ERROR_CODES.NOT_FOUND);
    }

    if (project.ownerId === targetUserId) {
      throw new ApiError(400, 'Cannot remove the project owner', ERROR_CODES.BAD_REQUEST);
    }

    await prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId,
        },
      },
    });

    await prisma.activityLog.create({
      data: {
        projectId,
        actorId,
        action: 'MEMBER_REMOVED',
        metadata: { removedUserId: targetUserId },
      },
    });

    realtimeEmitter.emitProjectEvent({
      projectId,
      eventType: 'member:removed',
      entity: 'project_member',
      entityId: `${projectId}:${targetUserId}`,
      actorId,
      data: { projectId, userId: targetUserId },
    });

    return { projectId, userId: targetUserId, removed: true };
  }
}

export const projectService = new ProjectService();
