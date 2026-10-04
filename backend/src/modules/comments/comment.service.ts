import { prisma } from '../../db/prisma.js';
import { ApiError } from '../../utils/api-error.js';
import { ERROR_CODES } from '../../config/constants.js';
import { CreateCommentInput, UpdateCommentInput } from './comment.schema.js';
import { realtimeEmitter } from '../../realtime/event.emitter.js';

export class CommentService {
  async getCommentsByTaskId(taskId: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new ApiError(404, 'Task not found', ERROR_CODES.NOT_FOUND);
    }

    const comments = await prisma.comment.findMany({
      where: { taskId },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return comments;
  }

  async createComment(taskId: string, authorId: string, input: CreateCommentInput) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: true,
      },
    });

    if (!task) {
      throw new ApiError(404, 'Task not found', ERROR_CODES.NOT_FOUND);
    }

    const comment = await prisma.$transaction(async (tx) => {
      const newComment = await tx.comment.create({
        data: {
          taskId,
          authorId,
          body: input.body,
          version: 1,
        },
        include: {
          author: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      });

      await tx.activityLog.create({
        data: {
          projectId: task.projectId,
          taskId,
          actorId: authorId,
          action: 'COMMENT_ADDED',
          metadata: { commentId: newComment.id },
        },
      });

      // Send notification to task assignee or creator (if not the author)
      const recipientIds = new Set<string>();
      if (task.assigneeId && task.assigneeId !== authorId) {
        recipientIds.add(task.assigneeId);
      }
      if (task.createdById && task.createdById !== authorId) {
        recipientIds.add(task.createdById);
      }

      for (const recipientId of recipientIds) {
        const notification = await tx.notification.create({
          data: {
            userId: recipientId,
            type: 'COMMENT_ADDED',
            payload: {
              taskId,
              taskTitle: task.title,
              projectId: task.projectId,
              authorId,
              commentId: newComment.id,
            },
          },
        });
        realtimeEmitter.emitUserEvent(recipientId, 'notification:new', notification);
      }

      return newComment;
    });

    // Real-time broadcast
    realtimeEmitter.emitProjectEvent({
      projectId: task.projectId,
      eventType: 'comment:created',
      entity: 'comment',
      entityId: comment.id,
      version: 1,
      actorId: authorId,
      data: {
        comment,
        taskId,
      },
    });

    return comment;
  }

  async updateComment(commentId: string, authorId: string, input: UpdateCommentInput) {
    const existing = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        task: true,
      },
    });

    if (!existing) {
      throw new ApiError(404, 'Comment not found', ERROR_CODES.NOT_FOUND);
    }

    if (existing.authorId !== authorId) {
      throw new ApiError(403, 'You can only edit your own comments', ERROR_CODES.FORBIDDEN);
    }

    if (input.version !== undefined && input.version !== existing.version) {
      throw new ApiError(
        409,
        'Comment was modified by another session',
        ERROR_CODES.VERSION_CONFLICT,
        {
          currentVersion: existing.version,
          currentComment: existing,
        }
      );
    }

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: {
        body: input.body,
        version: existing.version + 1,
        editedAt: new Date(),
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    realtimeEmitter.emitProjectEvent({
      projectId: existing.task.projectId,
      eventType: 'comment:updated',
      entity: 'comment',
      entityId: commentId,
      version: updated.version,
      actorId: authorId,
      data: {
        comment: updated,
        taskId: existing.taskId,
      },
    });

    return updated;
  }

  async deleteComment(commentId: string, actorId: string) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        task: true,
      },
    });

    if (!comment) {
      throw new ApiError(404, 'Comment not found', ERROR_CODES.NOT_FOUND);
    }

    // Must be author or project admin/owner
    if (comment.authorId !== actorId) {
      const membership = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: comment.task.projectId,
            userId: actorId,
          },
        },
      });

      if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) {
        throw new ApiError(403, 'Unauthorized to delete this comment', ERROR_CODES.FORBIDDEN);
      }
    }

    await prisma.comment.delete({
      where: { id: commentId },
    });

    realtimeEmitter.emitProjectEvent({
      projectId: comment.task.projectId,
      eventType: 'comment:deleted',
      entity: 'comment',
      entityId: commentId,
      actorId,
      data: {
        commentId,
        taskId: comment.taskId,
      },
    });

    return { id: commentId, deleted: true };
  }
}

export const commentService = new CommentService();
