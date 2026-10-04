import { prisma } from '../../db/prisma.js';
import { ApiError } from '../../utils/api-error.js';
import { ERROR_CODES } from '../../config/constants.js';
import { storageProvider } from './storage.service.js';
import { realtimeEmitter } from '../../realtime/event.emitter.js';

export class AttachmentService {
  async getAttachmentsByTaskId(taskId: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new ApiError(404, 'Task not found', ERROR_CODES.NOT_FOUND);
    }

    const attachments = await prisma.attachment.findMany({
      where: { taskId },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return attachments;
  }

  async uploadAttachment(taskId: string, userId: string, file: Express.Multer.File) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new ApiError(404, 'Task not found', ERROR_CODES.NOT_FOUND);
    }

    const storedResult = await storageProvider.saveFile(file);

    const attachment = await prisma.$transaction(async (tx) => {
      const newAttachment = await tx.attachment.create({
        data: {
          taskId,
          uploadedById: userId,
          fileName: storedResult.fileName,
          fileUrl: storedResult.fileUrl,
          mimeType: storedResult.mimeType,
          sizeBytes: storedResult.sizeBytes,
        },
        include: {
          uploadedBy: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      });

      await tx.activityLog.create({
        data: {
          projectId: task.projectId,
          taskId,
          actorId: userId,
          action: 'ATTACHMENT_ADDED',
          metadata: {
            fileName: newAttachment.fileName,
            sizeBytes: newAttachment.sizeBytes,
          },
        },
      });

      return newAttachment;
    });

    // Realtime broadcast
    realtimeEmitter.emitProjectEvent({
      projectId: task.projectId,
      eventType: 'attachment:added',
      entity: 'attachment',
      entityId: attachment.id,
      actorId: userId,
      data: {
        attachment,
        taskId,
      },
    });

    return attachment;
  }

  async deleteAttachment(attachmentId: string, userId: string) {
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        task: true,
      },
    });

    if (!attachment) {
      throw new ApiError(404, 'Attachment not found', ERROR_CODES.NOT_FOUND);
    }

    // Check permission: uploader or project admin/owner
    if (attachment.uploadedById !== userId) {
      const membership = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: attachment.task.projectId,
            userId,
          },
        },
      });

      if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) {
        throw new ApiError(403, 'Unauthorized to delete this attachment', ERROR_CODES.FORBIDDEN);
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.activityLog.create({
        data: {
          projectId: attachment.task.projectId,
          taskId: attachment.taskId,
          actorId: userId,
          action: 'ATTACHMENT_REMOVED',
          metadata: { fileName: attachment.fileName },
        },
      });

      await tx.attachment.delete({
        where: { id: attachmentId },
      });
    });

    // Delete file from disk / storage
    await storageProvider.deleteFile(attachment.fileUrl);

    realtimeEmitter.emitProjectEvent({
      projectId: attachment.task.projectId,
      eventType: 'attachment:removed',
      entity: 'attachment',
      entityId: attachmentId,
      actorId: userId,
      data: {
        attachmentId,
        taskId: attachment.taskId,
      },
    });

    return { id: attachmentId, deleted: true };
  }
}

export const attachmentService = new AttachmentService();
