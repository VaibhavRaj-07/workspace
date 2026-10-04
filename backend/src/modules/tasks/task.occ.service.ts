import { prisma } from '../../db/prisma.js';
import { ApiError } from '../../utils/api-error.js';
import { ERROR_CODES } from '../../config/constants.js';
import { computeDiff, findConflictingFields } from '../../utils/diff.js';
import { realtimeEmitter } from '../../realtime/event.emitter.js';
import { Task, TaskStatus } from '@prisma/client';
import { logger } from '../../config/logger.js';
import { env } from '../../config/env.js';
import { aiSimilarityService } from '../ai/ai.similarity.service.js';
import { aiRiskService } from '../ai/ai.risk.service.js';

export interface TaskUpdateData {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: any;
  assigneeId?: string | null;
  dueDate?: Date | string | null;
  position?: number;
}

export class TaskOccService {
  /**
   * Applies an OCC update to a task.
   * If version matches: performs atomic update.
   * If version < currentVersion: checks field history for non-overlapping changes.
   *   If non-overlapping: merges cleanly and bumps version.
   *   If overlapping: throws 409 VERSION_CONFLICT with full conflict details.
   */
  async updateTaskWithOcc(
    taskId: string,
    actorId: string,
    clientVersion: number,
    updateData: TaskUpdateData,
    eventType: string = 'task:updated',
    actionName: string = 'TASK_UPDATED'
  ) {
    const result = await prisma.$transaction(async (tx) => {
      // Lock row to serialize concurrent OCC evaluations
      await tx.$queryRaw`SELECT id FROM "tasks" WHERE id = ${taskId} FOR UPDATE`;

      // 1. Fetch current task state
      const currentTask = await tx.task.findUnique({
        where: { id: taskId },
        include: {
          assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
          createdBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
          project: { select: { id: true, name: true, autoCompleteWhenAllDone: true } },
        },
      });

      if (!currentTask) {
        throw new ApiError(404, 'Task not found', ERROR_CODES.NOT_FOUND);
      }

      // 2. Identify fields being updated by client
      const { changedFields: incomingChangedFields, diff: incomingDiff } = computeDiff(
        currentTask,
        updateData
      );

      // If no actual changes detected, return existing task
      if (incomingChangedFields.length === 0) {
        return { task: currentTask, autoMerged: false, conflictingFields: [] };
      }

      let isAutoMerged = false;

      // 3. Version Check
      if (currentTask.version !== clientVersion) {
        if (clientVersion > currentTask.version) {
          throw new ApiError(
            400,
            `Client version ${clientVersion} is ahead of database version ${currentTask.version}`,
            ERROR_CODES.BAD_REQUEST
          );
        }

        // Version is behind! Client is trying to update based on an older snapshot.
        // Fetch all field changes that occurred between clientVersion and currentTask.version
        const histories = await tx.taskFieldHistory.findMany({
          where: {
            taskId,
            toVersion: {
              gt: clientVersion,
              lte: currentTask.version,
            },
          },
          orderBy: { toVersion: 'asc' },
        });

        const historicalChangedFields: string[] = [];
        for (const h of histories) {
          historicalChangedFields.push(...h.changedFields);
        }

        const conflictingFields = findConflictingFields(
          incomingChangedFields,
          historicalChangedFields
        );

        if (conflictingFields.length > 0) {
          // Hard conflict: both users touched the same field(s)
          logger.warn(
            `[OCC Conflict] Task ${taskId} conflict on fields: [${conflictingFields.join(
              ', '
            )}]. Client v${clientVersion}, DB v${currentTask.version}`
          );

          throw new ApiError(
            409,
            `Task has conflicting concurrent changes on field(s): ${conflictingFields.join(', ')}`,
            ERROR_CODES.VERSION_CONFLICT,
            {
              code: 'VERSION_CONFLICT',
              currentVersion: currentTask.version,
              currentTask: {
                id: currentTask.id,
                title: currentTask.title,
                description: currentTask.description,
                status: currentTask.status,
                priority: currentTask.priority,
                assigneeId: currentTask.assigneeId,
                dueDate: currentTask.dueDate,
                position: currentTask.position,
                version: currentTask.version,
                updatedAt: currentTask.updatedAt,
              },
              yourChanges: updateData,
              conflictingFields,
              aiSuggestionAvailable: env.AI_FEATURES_ENABLED,
            }
          );
        }

        // Clean auto-merge! Fields do not overlap
        isAutoMerged = true;
        logger.info(
          `[OCC Auto-Merge] Task ${taskId} safely merged. Incoming fields: [${incomingChangedFields.join(
            ', '
          )}], Historical fields: [${historicalChangedFields.join(', ')}]`
        );
      }

      // 4. Perform Atomic Update
      const newVersion = currentTask.version + 1;
      const completedAt =
        updateData.status !== undefined
          ? updateData.status === TaskStatus.done
            ? currentTask.completedAt || new Date()
            : null
          : currentTask.completedAt;

      const normalizedData: any = { ...updateData };
      if (typeof normalizedData.dueDate === 'string') {
        normalizedData.dueDate = new Date(normalizedData.dueDate);
      }

      const updatedTask = await tx.task.update({
        where: { id: taskId },
        data: {
          ...normalizedData,
          completedAt,
          version: newVersion,
        },
        include: {
          assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
          createdBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
          project: { select: { id: true, name: true, autoCompleteWhenAllDone: true } },
        },
      });

      // 5. Record Task Field History for future merges
      await tx.taskFieldHistory.create({
        data: {
          taskId,
          fromVersion: currentTask.version,
          toVersion: newVersion,
          changedFields: incomingChangedFields,
          diff: incomingDiff,
          actorId,
        },
      });

      // 6. Record Activity Log
      await tx.activityLog.create({
        data: {
          projectId: currentTask.projectId,
          taskId,
          actorId,
          action: isAutoMerged ? `${actionName}_AUTO_MERGED` : actionName,
          metadata: {
            fromVersion: clientVersion,
            toVersion: newVersion,
            changedFields: incomingChangedFields,
            diff: incomingDiff,
            autoMerged: isAutoMerged,
          },
        },
      });

      // 7. Check if project should be auto-completed (if status became done)
      if (
        updateData.status === TaskStatus.done &&
        updatedTask.project.autoCompleteWhenAllDone
      ) {
        const remainingIncomplete = await tx.task.count({
          where: {
            projectId: currentTask.projectId,
            id: { not: taskId },
            status: { not: TaskStatus.done },
          },
        });

        if (remainingIncomplete === 0) {
          await tx.project.update({
            where: { id: currentTask.projectId },
            data: { status: 'completed' },
          });

          realtimeEmitter.emitProjectEvent({
            projectId: currentTask.projectId,
            eventType: 'project:updated',
            entity: 'project',
            entityId: currentTask.projectId,
            actorId,
            data: { id: currentTask.projectId, status: 'completed', autoCompleted: true },
          });
        }
      }

      // 8. Emit Real-time Socket Event
      realtimeEmitter.emitProjectEvent({
        projectId: currentTask.projectId,
        eventType,
        entity: 'task',
        entityId: taskId,
        version: newVersion,
        actorId,
        data: {
          task: updatedTask,
          changedFields: incomingChangedFields,
          diff: incomingDiff,
          autoMerged: isAutoMerged,
          previousVersion: currentTask.version,
        },
      });

      return {
        task: updatedTask,
        autoMerged: isAutoMerged,
        conflictingFields: [],
      };
    }, { maxWait: 15000, timeout: 20000 });

    // Async AI background updates (non-blocking)
    aiSimilarityService
      .updateTaskEmbedding(result.task.id, result.task.title, result.task.description)
      .catch(() => {});
    aiRiskService
      .recomputeAndBroadcastRisk(result.task.id, result.task.projectId)
      .catch(() => {});

    return result;
  }

  /**
   * Resolves a version conflict when the client explicitly sends a resolution strategy:
   * - "keep_mine": forces the client's version of changes on top of current task
   * - "keep_theirs": accepts the server's current state as the authoritative state
   * - "manual": applies custom manual merged data
   */
  async resolveConflict(
    taskId: string,
    actorId: string,
    strategy: 'keep_mine' | 'keep_theirs' | 'manual',
    baseVersion: number,
    manualData?: TaskUpdateData
  ) {
    return await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "tasks" WHERE id = ${taskId} FOR UPDATE`;
      const currentTask = await tx.task.findUnique({
        where: { id: taskId },
        include: {
          assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
          createdBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
          project: { select: { id: true, name: true, autoCompleteWhenAllDone: true } },
        },
      });

      if (!currentTask) {
        throw new ApiError(404, 'Task not found', ERROR_CODES.NOT_FOUND);
      }

      if (strategy === 'keep_theirs') {
        // Return latest server task state
        return currentTask;
      }

      const resolutionData = manualData || {};
      const { changedFields, diff } = computeDiff(currentTask, resolutionData);

      const newVersion = currentTask.version + 1;
      const completedAt =
        resolutionData.status !== undefined
          ? resolutionData.status === TaskStatus.done
            ? currentTask.completedAt || new Date()
            : null
          : currentTask.completedAt;

      const normalizedResolution: any = { ...resolutionData };
      if (typeof normalizedResolution.dueDate === 'string') {
        normalizedResolution.dueDate = new Date(normalizedResolution.dueDate);
      }

      const updatedTask = await tx.task.update({
        where: { id: taskId },
        data: {
          ...normalizedResolution,
          completedAt,
          version: newVersion,
        },
        include: {
          assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
          createdBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
          project: { select: { id: true, name: true, autoCompleteWhenAllDone: true } },
        },
      });

      await tx.taskFieldHistory.create({
        data: {
          taskId,
          fromVersion: currentTask.version,
          toVersion: newVersion,
          changedFields,
          diff,
          actorId,
        },
      });

      await tx.activityLog.create({
        data: {
          projectId: currentTask.projectId,
          taskId,
          actorId,
          action: 'TASK_CONFLICT_RESOLVED',
          metadata: {
            strategy,
            baseVersion,
            resolvedVersion: newVersion,
            changedFields,
            diff,
          },
        },
      });

      realtimeEmitter.emitProjectEvent({
        projectId: currentTask.projectId,
        eventType: 'task:updated',
        entity: 'task',
        entityId: taskId,
        version: newVersion,
        actorId,
        data: {
          task: updatedTask,
          strategy,
          conflictResolved: true,
        },
      });

      return updatedTask;
    }, { maxWait: 15000, timeout: 20000 });
  }
}

export const taskOccService = new TaskOccService();
