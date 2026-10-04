import { prisma } from '../../db/prisma.js';
import { ApiError } from '../../utils/api-error.js';
import { ERROR_CODES } from '../../config/constants.js';
import { TaskStatus, TaskPriority } from '@prisma/client';
import {
  CreateTaskInput,
  UpdateTaskInput,
  TaskQueryParams,
  ResolveConflictInput,
} from './task.schema.js';
import { taskOccService } from './task.occ.service.js';
import { realtimeEmitter } from '../../realtime/event.emitter.js';
import { aiSimilarityService } from '../ai/ai.similarity.service.js';
import { aiRiskService } from '../ai/ai.risk.service.js';

export class TaskService {
  async createTask(projectId: string, createdById: string, input: CreateTaskInput) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new ApiError(404, 'Project not found', ERROR_CODES.NOT_FOUND);
    }

    // Determine position if not provided
    let position = input.position;
    if (position === undefined) {
      const lastTask = await prisma.task.findFirst({
        where: { projectId, status: input.status || TaskStatus.todo },
        orderBy: { position: 'desc' },
        select: { position: true },
      });
      position = (lastTask?.position ?? 0) + 65536.0;
    }

    const task = await prisma.$transaction(async (tx) => {
      const newTask = await tx.task.create({
        data: {
          projectId,
          title: input.title,
          description: input.description || null,
          status: input.status || TaskStatus.todo,
          priority: input.priority || TaskPriority.medium,
          assigneeId: input.assigneeId || null,
          createdById,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          position,
          version: 1,
        },
        include: {
          assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
          createdBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
          _count: {
            select: { comments: true, attachments: true },
          },
        },
      });

      // Initial field history
      await tx.taskFieldHistory.create({
        data: {
          taskId: newTask.id,
          fromVersion: 0,
          toVersion: 1,
          changedFields: ['title', 'description', 'status', 'priority', 'assigneeId', 'dueDate', 'position'],
          diff: { initial: { to: newTask } },
          actorId: createdById,
        },
      });

      // Activity log
      await tx.activityLog.create({
        data: {
          projectId,
          taskId: newTask.id,
          actorId: createdById,
          action: 'TASK_CREATED',
          metadata: { title: newTask.title, status: newTask.status },
        },
      });

      // If assigned to another user, send notification
      if (newTask.assigneeId && newTask.assigneeId !== createdById) {
        const notification = await tx.notification.create({
          data: {
            userId: newTask.assigneeId,
            type: 'TASK_ASSIGNED',
            payload: {
              taskId: newTask.id,
              taskTitle: newTask.title,
              projectId,
              assignedBy: createdById,
            },
          },
        });
        realtimeEmitter.emitUserEvent(newTask.assigneeId, 'notification:new', notification);
      }

      return newTask;
    });

    // Real-time broadcast
    realtimeEmitter.emitProjectEvent({
      projectId,
      eventType: 'task:created',
      entity: 'task',
      entityId: task.id,
      version: 1,
      data: task,
    });

    // Async AI background tasks (non-blocking)
    aiSimilarityService.updateTaskEmbedding(task.id, task.title, task.description).catch(() => {});
    aiRiskService.recomputeAndBroadcastRisk(task.id, projectId).catch(() => {});

    return task;
  }

  async getProjectTasks(projectId: string, query: TaskQueryParams) {
    const limit = query.limit || 50;
    const page = query.page || 1;
    const skip = (page - 1) * limit;

    const where: any = { projectId };

    if (query.status) {
      where.status = query.status;
    }
    if (query.priority) {
      where.priority = query.priority;
    }
    if (query.assigneeId) {
      where.assigneeId = query.assigneeId;
    }
    if (query.dueBefore) {
      where.dueDate = { lte: new Date(query.dueBefore) };
    }
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    orderBy[query.sortBy || 'position'] = query.sortOrder || 'asc';

    const [total, tasks] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        include: {
          assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
          createdBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
          _count: {
            select: { comments: true, attachments: true },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      tasks,
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

  async getTaskById(taskId: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
        createdBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
        comments: {
          include: {
            author: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        attachments: {
          include: {
            uploadedBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        activityLogs: {
          include: {
            actor: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
        fieldHistories: {
          orderBy: { toVersion: 'desc' },
          take: 10,
        },
      },
    });

    if (!task) {
      throw new ApiError(404, 'Task not found', ERROR_CODES.NOT_FOUND);
    }

    return task;
  }

  async updateTask(
    taskId: string,
    actorId: string,
    input: UpdateTaskInput,
    ifMatchHeader?: string
  ) {
    // Determine client version from body or If-Match header
    let clientVersion = input.version;
    if (clientVersion === undefined && ifMatchHeader) {
      const match = ifMatchHeader.replace(/"/g, '');
      const parsed = parseInt(match, 10);
      if (!isNaN(parsed)) {
        clientVersion = parsed;
      }
    }

    if (clientVersion === undefined) {
      // If version is omitted, fetch current version to allow non-OCC update,
      // but warn that OCC is recommended
      const current = await prisma.task.findUnique({
        where: { id: taskId },
        select: { version: true },
      });
      if (!current) throw new ApiError(404, 'Task not found', ERROR_CODES.NOT_FOUND);
      clientVersion = current.version;
    }

    const updateData: any = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.assigneeId !== undefined) updateData.assigneeId = input.assigneeId;
    if (input.dueDate !== undefined)
      updateData.dueDate = input.dueDate ? new Date(input.dueDate) : null;
    if (input.position !== undefined) updateData.position = input.position;

    const result = await taskOccService.updateTaskWithOcc(
      taskId,
      actorId,
      clientVersion,
      updateData,
      'task:updated',
      'TASK_UPDATED'
    );

    return result;
  }

  async updateTaskStatus(
    taskId: string,
    actorId: string,
    status: TaskStatus,
    version?: number,
    ifMatchHeader?: string
  ) {
    return this.updateTask(
      taskId,
      actorId,
      { status, version },
      ifMatchHeader
    );
  }

  async assignTask(
    taskId: string,
    actorId: string,
    assigneeId: string | null | undefined,
    version?: number,
    ifMatchHeader?: string
  ) {
    const result = await this.updateTask(
      taskId,
      actorId,
      { assigneeId, version },
      ifMatchHeader
    );

    // Notify newly assigned user
    if (assigneeId && assigneeId !== actorId) {
      const notification = await prisma.notification.create({
        data: {
          userId: assigneeId,
          type: 'TASK_ASSIGNED',
          payload: {
            taskId,
            taskTitle: result.task.title,
            projectId: result.task.projectId,
            assignedBy: actorId,
          },
        },
      });
      realtimeEmitter.emitUserEvent(assigneeId, 'notification:new', notification);
    }

    return result;
  }

  async moveTask(
    taskId: string,
    actorId: string,
    status?: TaskStatus,
    position?: number,
    version?: number,
    ifMatchHeader?: string
  ) {
    const updatePayload: UpdateTaskInput = { version };
    if (status !== undefined) updatePayload.status = status;
    if (position !== undefined) updatePayload.position = position;

    let clientVersion = version;
    if (clientVersion === undefined && ifMatchHeader) {
      const match = ifMatchHeader.replace(/"/g, '');
      const parsed = parseInt(match, 10);
      if (!isNaN(parsed)) clientVersion = parsed;
    }
    if (clientVersion === undefined) {
      const current = await prisma.task.findUnique({
        where: { id: taskId },
        select: { version: true },
      });
      if (!current) throw new ApiError(404, 'Task not found', ERROR_CODES.NOT_FOUND);
      clientVersion = current.version;
    }

    const result = await taskOccService.updateTaskWithOcc(
      taskId,
      actorId,
      clientVersion,
      updatePayload,
      'task:moved',
      'TASK_MOVED'
    );

    return result;
  }

  async resolveConflict(taskId: string, actorId: string, input: ResolveConflictInput) {
    const manualData: any = {};
    if (input.manualData) {
      if (input.manualData.title !== undefined) manualData.title = input.manualData.title;
      if (input.manualData.description !== undefined) manualData.description = input.manualData.description;
      if (input.manualData.status !== undefined) manualData.status = input.manualData.status;
      if (input.manualData.priority !== undefined) manualData.priority = input.manualData.priority;
      if (input.manualData.assigneeId !== undefined) manualData.assigneeId = input.manualData.assigneeId;
      if (input.manualData.dueDate !== undefined)
        manualData.dueDate = input.manualData.dueDate ? new Date(input.manualData.dueDate) : null;
      if (input.manualData.position !== undefined) manualData.position = input.manualData.position;
    }

    return await taskOccService.resolveConflict(
      taskId,
      actorId,
      input.strategy,
      input.baseVersion,
      manualData
    );
  }

  async deleteTask(taskId: string, actorId: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, projectId: true, title: true },
    });

    if (!task) {
      throw new ApiError(404, 'Task not found', ERROR_CODES.NOT_FOUND);
    }

    await prisma.$transaction(async (tx) => {
      await tx.activityLog.create({
        data: {
          projectId: task.projectId,
          actorId,
          action: 'TASK_DELETED',
          metadata: { taskId: task.id, title: task.title },
        },
      });

      await tx.task.delete({
        where: { id: taskId },
      });
    });

    realtimeEmitter.emitProjectEvent({
      projectId: task.projectId,
      eventType: 'task:deleted',
      entity: 'task',
      entityId: taskId,
      actorId,
      data: { taskId, projectId: task.projectId },
    });

    return { id: taskId, deleted: true };
  }
}

export const taskService = new TaskService();
