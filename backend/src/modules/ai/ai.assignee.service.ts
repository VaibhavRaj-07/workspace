import { prisma } from '../../db/prisma.js';
import { aiSimilarityService } from './ai.similarity.service.js';
import { aiClient } from './ai.client.js';
import { TaskStatus } from '@prisma/client';

export interface AssigneeSuggestion {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  overallScore: number; // 0 - 100
  confidence: number;
  reason: string;
  metrics: {
    domainFitScore: number;       // 0 - 100
    workloadScore: number;        // 0 - 100 (higher = lighter load)
    onTimeRateScore: number;      // 0 - 100
    currentOpenTasks: number;
    historicalCompletedTasks: number;
    historicalOnTimeRate: number; // 0.0 - 1.0
  };
}

export interface SuggestAssigneeResponse {
  source?: 'ml' | 'fallback';
  projectId: string;
  taskContext: {
    title: string;
    description?: string | null;
    priority?: string;
  };
  suggestions: AssigneeSuggestion[];
  algorithm: 'ml_semantic_hybrid' | 'workload_fallback';
}

export class AiAssigneeService {
  /**
   * Suggests the best assignees for a given task context using a multi-factor scoring model
   */
  async suggestAssignees(
    projectId: string,
    title: string,
    description?: string | null,
    priority?: string
  ): Promise<SuggestAssigneeResponse> {
    // 1. Fetch project members (excluding pure viewers)
    const members = await prisma.projectMember.findMany({
      where: {
        projectId,
        role: { not: 'viewer' },
      },
      include: {
        user: true,
      },
    });

    if (members.length === 0) {
      return {
        projectId,
        taskContext: { title, description, priority },
        suggestions: [],
        algorithm: 'workload_fallback',
      };
    }

    // 2. Generate embedding for current query task
    const queryText = `${title}\n\n${description || ''}`.trim();
    const embedRes = await aiClient.getEmbeddings([queryText]);
    const queryVector =
      embedRes.embeddings.length > 0
        ? embedRes.embeddings[0]
        : aiClient.generateFallbackVector(queryText);

    // 3. For each member, aggregate metrics
    const suggestions: AssigneeSuggestion[] = [];

    for (const member of members) {
      const userId = member.userId;

      // Completed tasks with embeddings
      const completedTasks = await prisma.task.findMany({
        where: {
          assigneeId: userId,
          status: TaskStatus.done,
        },
        include: { embedding: true },
        orderBy: { completedAt: 'desc' },
        take: 20,
      });

      // Current open tasks
      const openTasksCount = await prisma.task.count({
        where: {
          assigneeId: userId,
          status: { not: TaskStatus.done },
        },
      });

      // Historical on-time rate
      let onTimeCount = 0;
      let totalDatedCompleted = 0;

      for (const t of completedTasks) {
        if (t.dueDate && t.completedAt) {
          totalDatedCompleted++;
          if (t.completedAt.getTime() <= t.dueDate.getTime() + 1000 * 60 * 60 * 2) {
            onTimeCount++;
          }
        }
      }

      const onTimeRate = totalDatedCompleted > 0 ? onTimeCount / totalDatedCompleted : 0.85; // Default 85% for cold start

      // Compute domain fit (max / average cosine similarity to past completed tasks)
      let maxSimilarity = 0;
      let similarCount = 0;

      for (const ct of completedTasks) {
        const ctVector =
          ct.embedding?.vector ||
          aiClient.generateFallbackVector(`${ct.title}\n\n${ct.description || ''}`);
        const sim = aiSimilarityService.cosineSimilarity(queryVector, ctVector);
        if (sim > maxSimilarity) maxSimilarity = sim;
        if (sim >= 0.70) similarCount++;
      }

      // If cold start (no completed tasks), use moderate default
      const domainFitScore =
        completedTasks.length > 0 ? Math.round(maxSimilarity * 100) : 60;

      // Workload score: 0 open tasks = 100, 1 = 90, 2 = 80, 5 = 50, 10+ = 10
      const workloadScore = Math.max(10, Math.min(100, 100 - openTasksCount * 10));

      // On-time score: 0-100
      const onTimeRateScore = Math.round(onTimeRate * 100);

      // Weighted overall score: 45% Domain Fit, 30% Workload, 25% Reliability
      const overallScore = Math.round(
        domainFitScore * 0.45 + workloadScore * 0.30 + onTimeRateScore * 0.25
      );

      // Generate human-readable reason
      let reason = '';
      if (similarCount > 0) {
        reason = `Completed ${similarCount} similar task${similarCount > 1 ? 's' : ''}; `;
      } else if (completedTasks.length > 0) {
        reason = `Experienced in project tasks; `;
      } else {
        reason = `Available team member; `;
      }

      reason += `${Math.round(onTimeRate * 100)}% on-time record; `;
      reason += openTasksCount === 0 ? 'zero open workload' : `${openTasksCount} active task${openTasksCount > 1 ? 's' : ''}`;

      suggestions.push({
        userId,
        name: member.user.name,
        email: member.user.email,
        avatarUrl: member.user.avatarUrl,
        role: member.role,
        overallScore,
        confidence: completedTasks.length > 3 ? 0.9 : 0.7,
        reason,
        metrics: {
          domainFitScore,
          workloadScore,
          onTimeRateScore,
          currentOpenTasks: openTasksCount,
          historicalCompletedTasks: completedTasks.length,
          historicalOnTimeRate: Math.round(onTimeRate * 100) / 100,
        },
      });
    }

    // Sort descending by overall score
    suggestions.sort((a, b) => b.overallScore - a.overallScore);
    const top3 = suggestions.slice(0, 3);

    return {
      projectId,
      taskContext: { title, description, priority },
      suggestions: top3,
      algorithm: embedRes.available ? 'ml_semantic_hybrid' : 'workload_fallback',
      source: embedRes.available ? 'ml' : 'fallback',
    };
  }
}

export const aiAssigneeService = new AiAssigneeService();
