import { prisma } from '../../db/prisma.js';
import { ApiError } from '../../utils/api-error.js';
import { ERROR_CODES } from '../../config/constants.js';
import { TaskStatus } from '@prisma/client';

export class DashboardService {
  async getUserOverview(userId: string) {
    const now = new Date();
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);

    // Get all tasks assigned to the user
    const [statusCounts, overdueCount, dueThisWeekCount, totalProjects, recentTasks] =
      await Promise.all([
        prisma.task.groupBy({
          by: ['status'],
          where: { assigneeId: userId },
          _count: { id: true },
        }),
        prisma.task.count({
          where: {
            assigneeId: userId,
            status: { not: TaskStatus.done },
            dueDate: { lt: now },
          },
        }),
        prisma.task.count({
          where: {
            assigneeId: userId,
            status: { not: TaskStatus.done },
            dueDate: {
              gte: now,
              lte: endOfWeek,
            },
          },
        }),
        prisma.projectMember.count({
          where: { userId },
        }),
        prisma.task.findMany({
          where: { assigneeId: userId },
          include: {
            project: { select: { id: true, name: true } },
          },
          orderBy: { updatedAt: 'desc' },
          take: 5,
        }),
      ]);

    const statusMap = {
      todo: 0,
      in_progress: 0,
      in_review: 0,
      done: 0,
    };

    let totalAssignedTasks = 0;
    for (const item of statusCounts) {
      if (item.status in statusMap) {
        statusMap[item.status as keyof typeof statusMap] = item._count.id;
        totalAssignedTasks += item._count.id;
      }
    }

    return {
      totalAssignedTasks,
      tasksByStatus: statusMap,
      overdueTasksCount: overdueCount,
      dueThisWeekCount,
      totalProjectsCount: totalProjects,
      recentAssignedTasks: recentTasks,
    };
  }

  async getProjectProgress(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!project) {
      throw new ApiError(404, 'Project not found', ERROR_CODES.NOT_FOUND);
    }

    const now = new Date();

    const [tasks, overdueCount] = await Promise.all([
      prisma.task.findMany({
        where: { projectId },
        select: {
          id: true,
          status: true,
          priority: true,
          assigneeId: true,
          dueDate: true,
          completedAt: true,
        },
      }),
      prisma.task.count({
        where: {
          projectId,
          status: { not: TaskStatus.done },
          dueDate: { lt: now },
        },
      }),
    ]);

    const totalTasks = tasks.length;
    const doneTasks = tasks.filter((t) => t.status === TaskStatus.done).length;
    const completionPercentage = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

    // Status distribution
    const statusDistribution = {
      todo: tasks.filter((t) => t.status === TaskStatus.todo).length,
      in_progress: tasks.filter((t) => t.status === TaskStatus.in_progress).length,
      in_review: tasks.filter((t) => t.status === TaskStatus.in_review).length,
      done: doneTasks,
    };

    // Priority distribution
    const priorityDistribution = {
      low: tasks.filter((t) => t.priority === 'low').length,
      medium: tasks.filter((t) => t.priority === 'medium').length,
      high: tasks.filter((t) => t.priority === 'high').length,
      urgent: tasks.filter((t) => t.priority === 'urgent').length,
    };

    // Tasks per assignee
    const assigneeMap = new Map<string, { user: any; total: number; done: number }>();

    for (const member of project.members) {
      assigneeMap.set(member.userId, {
        user: member.user,
        total: 0,
        done: 0,
      });
    }

    let unassignedCount = 0;
    for (const t of tasks) {
      if (!t.assigneeId) {
        unassignedCount++;
      } else {
        const item = assigneeMap.get(t.assigneeId);
        if (item) {
          item.total++;
          if (t.status === TaskStatus.done) {
            item.done++;
          }
        }
      }
    }

    const tasksPerAssignee = Array.from(assigneeMap.values()).map((val) => ({
      ...val,
      completionPercentage: val.total === 0 ? 0 : Math.round((val.done / val.total) * 100),
    }));

    // Days to deadline
    let daysToDeadline: number | null = null;
    let isDeadlineOverdue = false;
    if (project.deadline) {
      const diffTime = project.deadline.getTime() - now.getTime();
      daysToDeadline = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffTime < 0) {
        isDeadlineOverdue = true;
      }
    }

    return {
      projectId: project.id,
      projectName: project.name,
      status: project.status,
      totalTasks,
      doneTasks,
      completionPercentage,
      overdueTasksCount: overdueCount,
      unassignedTasksCount: unassignedCount,
      deadline: project.deadline,
      daysToDeadline,
      isDeadlineOverdue,
      statusDistribution,
      priorityDistribution,
      tasksPerAssignee,
    };
  }

  async getProjectActivityFeed(
    projectId: string,
    query: { page?: number; limit?: number; cursor?: string }
  ) {
    const limit = query.limit || 25;
    const page = query.page || 1;
    const skip = (page - 1) * limit;

    const [total, activities] = await Promise.all([
      prisma.activityLog.count({ where: { projectId } }),
      prisma.activityLog.findMany({
        where: { projectId },
        include: {
          actor: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          task: {
            select: { id: true, title: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      activities,
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
}

export const dashboardService = new DashboardService();
