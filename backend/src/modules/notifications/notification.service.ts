import { prisma } from '../../db/prisma.js';
import { ApiError } from '../../utils/api-error.js';
import { ERROR_CODES } from '../../config/constants.js';

export class NotificationService {
  async getUserNotifications(
    userId: string,
    query: { unreadOnly?: boolean; page?: number; limit?: number }
  ) {
    const limit = query.limit || 30;
    const page = query.page || 1;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (query.unreadOnly) {
      where.readAt = null;
    }

    const [total, unreadCount, notifications] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, readAt: null } }),
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      notifications,
      unreadCount,
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

  async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new ApiError(404, 'Notification not found', ERROR_CODES.NOT_FOUND);
    }

    if (notification.userId !== userId) {
      throw new ApiError(403, 'Unauthorized to update this notification', ERROR_CODES.FORBIDDEN);
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });

    return updated;
  }

  async markAllAsRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return { updatedCount: result.count };
  }
}

export const notificationService = new NotificationService();
