import { prisma } from '../db/prisma.js';
import { logger } from '../config/logger.js';
import { realtimeEmitter } from '../realtime/event.emitter.js';
import { TaskStatus } from '@prisma/client';

export async function checkDeadlinesAndAlerts() {
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  try {
    // 1. Check tasks due within next 24 hours (that have an assignee and are not done)
    const upcomingTasks = await prisma.task.findMany({
      where: {
        status: { not: TaskStatus.done },
        assigneeId: { not: null },
        dueDate: {
          gte: now,
          lte: in24Hours,
        },
      },
      include: {
        project: { select: { id: true, name: true } },
      },
    });

    for (const task of upcomingTasks) {
      if (!task.assigneeId) continue;

      // Avoid creating duplicate notification in the last 12 hours
      const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
      const existingNotification = await prisma.notification.findFirst({
        where: {
          userId: task.assigneeId,
          type: 'TASK_DUE_SOON',
          createdAt: { gte: twelveHoursAgo },
          payload: {
            path: ['taskId'],
            equals: task.id,
          },
        },
      });

      if (!existingNotification) {
        const notification = await prisma.notification.create({
          data: {
            userId: task.assigneeId,
            type: 'TASK_DUE_SOON',
            payload: {
              taskId: task.id,
              taskTitle: task.title,
              projectId: task.projectId,
              projectName: task.project.name,
              dueDate: task.dueDate,
              message: `Task "${task.title}" is due within 24 hours!`,
            },
          },
        });

        realtimeEmitter.emitUserEvent(task.assigneeId, 'notification:new', notification);
      }
    }

    // 2. Check overdue tasks (dueDate < now, status != done)
    const overdueTasks = await prisma.task.findMany({
      where: {
        status: { not: TaskStatus.done },
        assigneeId: { not: null },
        dueDate: {
          lt: now,
        },
      },
      include: {
        project: { select: { id: true, name: true } },
      },
    });

    for (const task of overdueTasks) {
      if (!task.assigneeId) continue;

      // Check if notified in the last 24 hours
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const existingNotification = await prisma.notification.findFirst({
        where: {
          userId: task.assigneeId,
          type: 'TASK_OVERDUE',
          createdAt: { gte: twentyFourHoursAgo },
          payload: {
            path: ['taskId'],
            equals: task.id,
          },
        },
      });

      if (!existingNotification) {
        const notification = await prisma.notification.create({
          data: {
            userId: task.assigneeId,
            type: 'TASK_OVERDUE',
            payload: {
              taskId: task.id,
              taskTitle: task.title,
              projectId: task.projectId,
              projectName: task.project.name,
              dueDate: task.dueDate,
              message: `Task "${task.title}" is overdue!`,
            },
          },
        });

        realtimeEmitter.emitUserEvent(task.assigneeId, 'notification:new', notification);
      }
    }

    logger.debug(
      `[DeadlineJob] Checked deadlines: ${upcomingTasks.length} upcoming, ${overdueTasks.length} overdue`
    );
  } catch (error) {
    logger.error({ error }, '[DeadlineJob] Error checking deadlines and alerts');
  }
}
