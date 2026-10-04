import { prisma } from '../../db/prisma.js';
import { aiClient, RiskPredictionResponse } from './ai.client.js';
import { aiCache } from './ai.cache.js';
import { realtimeEmitter } from '../../realtime/event.emitter.js';
import { TaskStatus, TaskPriority } from '@prisma/client';
import { logger } from '../../config/logger.js';

export interface TaskRiskDetails extends RiskPredictionResponse {
  taskId: string;
  taskTitle: string;
  dueDate: Date | null;
  status: string;
  priority: string;
  assignee: { id: string; name: string } | null;
}

export interface ProjectRiskSummary {
  projectId: string;
  overallProjectRiskScore: number; // 0 - 100
  projectRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  totalOpenTasks: number;
  atRiskTasksCount: number;
  criticalTasksCount: number;
  topAtRiskTasks: TaskRiskDetails[];
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

export class AiRiskService {
  /**
   * Builds feature vector for a task and queries the ML risk predictor
   */
  async getTaskRisk(taskId: string): Promise<TaskRiskDetails> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, deadline: true } },
        _count: { select: { comments: true } },
      },
    });

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Check cache
    const cacheKey = aiCache.generateKey(taskId, task.version, 'task_risk');
    const cached = aiCache.get<TaskRiskDetails>(cacheKey);
    if (cached) {
      return cached;
    }

    const now = new Date();

    // 1. Task age
    const taskAgeDays = (now.getTime() - task.createdAt.getTime()) / (1000 * 60 * 60 * 24);

    // 2. Encoded priority & status
    const priorityMap: Record<TaskPriority, number> = {
      [TaskPriority.low]: 0,
      [TaskPriority.medium]: 1,
      [TaskPriority.high]: 2,
      [TaskPriority.urgent]: 3,
    };

    const statusMap: Record<TaskStatus, number> = {
      [TaskStatus.todo]: 0,
      [TaskStatus.in_progress]: 1,
      [TaskStatus.in_review]: 2,
      [TaskStatus.done]: 3,
    };

    // 3. Status changes & time in current status from activity log
    const statusLogs = await prisma.activityLog.findMany({
      where: {
        taskId,
        action: { in: ['TASK_CREATED', 'TASK_MOVED', 'TASK_STATUS_UPDATED', 'TASK_UPDATED'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const statusChangesCount = Math.max(0, statusLogs.length - 1);
    const lastStatusChangeDate = statusLogs.length > 0 ? statusLogs[0].createdAt : task.updatedAt;
    const hoursInCurrentStatus =
      (now.getTime() - lastStatusChangeDate.getTime()) / (1000 * 60 * 60);

    // 4. Assignee workload & on-time reliability
    let assigneeOpenTasks = 0;
    let assigneeOnTimeRate = 0.85;

    if (task.assigneeId) {
      const [openCount, completedWithDates] = await Promise.all([
        prisma.task.count({
          where: {
            assigneeId: task.assigneeId,
            status: { not: TaskStatus.done },
          },
        }),
        prisma.task.findMany({
          where: {
            assigneeId: task.assigneeId,
            status: TaskStatus.done,
            dueDate: { not: null },
            completedAt: { not: null },
          },
          select: { dueDate: true, completedAt: true },
          take: 20,
        }),
      ]);

      assigneeOpenTasks = openCount;

      if (completedWithDates.length > 0) {
        let onTime = 0;
        for (const ct of completedWithDates) {
          if (ct.completedAt!.getTime() <= ct.dueDate!.getTime() + 1000 * 60 * 60 * 2) {
            onTime++;
          }
        }
        assigneeOnTimeRate = onTime / completedWithDates.length;
      }
    }

    // 5. Days to due date
    let daysToDueDate = 14;
    if (task.dueDate) {
      daysToDueDate = (task.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    }

    // 6. Project completion %
    const [projTotal, projDone] = await Promise.all([
      prisma.task.count({ where: { projectId: task.projectId } }),
      prisma.task.count({ where: { projectId: task.projectId, status: TaskStatus.done } }),
    ]);
    const projectCompletionRate = projTotal > 0 ? projDone / projTotal : 0;

    // Feature payload for ML XGBoost model
    const features = {
      task_age_days: Math.round(taskAgeDays * 10) / 10,
      priority_encoded: priorityMap[task.priority] ?? 1,
      status_encoded: statusMap[task.status] ?? 0,
      hours_in_current_status: Math.round(hoursInCurrentStatus * 10) / 10,
      status_changes_count: statusChangesCount,
      assignee_open_tasks: assigneeOpenTasks,
      assignee_ontime_rate: Math.round(assigneeOnTimeRate * 100) / 100,
      comment_count: task._count.comments,
      days_to_due_date: Math.round(daysToDueDate * 10) / 10,
      project_completion_rate: Math.round(projectCompletionRate * 100) / 100,
      description_length: (task.description || '').length,
    };

    // Predict risk
    const prediction = await aiClient.predictTaskRisk(features);

    // If task is already done, risk is 0
    if (task.status === TaskStatus.done) {
      prediction.riskProbability = 0;
      prediction.riskScore = 0;
      prediction.riskLevel = 'low';
      prediction.topFactors = [
        {
          feature: 'status',
          importance: 1.0,
          impact: 'decreases_risk',
          reason: 'Task has already been completed successfully',
        },
      ];
    }

    const result: TaskRiskDetails = {
      taskId: task.id,
      taskTitle: task.title,
      dueDate: task.dueDate,
      status: task.status,
      priority: task.priority,
      assignee: task.assignee,
      ...prediction,
    };

    aiCache.set(cacheKey, result, 120); // 2 minutes cache
    return result;
  }

  /**
   * Calculates aggregated risk metrics across an entire project
   */
  async getProjectRisk(projectId: string): Promise<ProjectRiskSummary> {
    const openTasks = await prisma.task.findMany({
      where: {
        projectId,
        status: { not: TaskStatus.done },
      },
      select: { id: true },
    });

    if (openTasks.length === 0) {
      return {
        projectId,
        overallProjectRiskScore: 0,
        projectRiskLevel: 'low',
        totalOpenTasks: 0,
        atRiskTasksCount: 0,
        criticalTasksCount: 0,
        topAtRiskTasks: [],
        riskDistribution: { low: 0, medium: 0, high: 0, critical: 0 },
      };
    }

    // Evaluate risk for all open tasks
    const taskRisks: TaskRiskDetails[] = [];
    for (const t of openTasks) {
      try {
        const r = await this.getTaskRisk(t.id);
        taskRisks.push(r);
      } catch (err) {
        logger.warn({ err }, `Failed to compute risk for task ${t.id}`);
      }
    }

    taskRisks.sort((a, b) => b.riskScore - a.riskScore);

    const distribution = { low: 0, medium: 0, high: 0, critical: 0 };
    let totalScore = 0;
    let criticalCount = 0;
    let atRiskCount = 0;

    for (const r of taskRisks) {
      distribution[r.riskLevel]++;
      totalScore += r.riskScore;
      if (r.riskLevel === 'high' || r.riskLevel === 'critical') {
        atRiskCount++;
      }
      if (r.riskLevel === 'critical') {
        criticalCount++;
      }
    }

    const avgScore = taskRisks.length > 0 ? Math.round(totalScore / taskRisks.length) : 0;
    const projectRiskLevel: 'low' | 'medium' | 'high' | 'critical' =
      criticalCount > 0 || avgScore >= 70
        ? 'critical'
        : atRiskCount > 1 || avgScore >= 45
        ? 'high'
        : avgScore >= 25
        ? 'medium'
        : 'low';

    return {
      projectId,
      overallProjectRiskScore: avgScore,
      projectRiskLevel,
      totalOpenTasks: openTasks.length,
      atRiskTasksCount: atRiskCount,
      criticalTasksCount: criticalCount,
      topAtRiskTasks: taskRisks.slice(0, 5),
      riskDistribution: distribution,
    };
  }

  /**
   * Recomputes task risk and emits `task:risk_updated` over Socket.IO
   */
  async recomputeAndBroadcastRisk(taskId: string, projectId: string) {
    try {
      const risk = await this.getTaskRisk(taskId);
      realtimeEmitter.emitProjectEvent({
        projectId,
        eventType: 'task:risk_updated',
        entity: 'task',
        entityId: taskId,
        data: risk,
      });
    } catch (err) {
      logger.warn({ err, taskId }, 'Failed to recompute and broadcast task risk');
    }
  }
}

export const aiRiskService = new AiRiskService();
