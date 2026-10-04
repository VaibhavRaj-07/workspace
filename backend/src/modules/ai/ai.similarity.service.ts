import { prisma } from '../../db/prisma.js';
import { aiClient } from './ai.client.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { TaskStatus } from '@prisma/client';
import crypto from 'crypto';

export interface SimilarTaskResult {
  taskId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  similarityScore: number; // 0.0 to 1.0
  isLikelyDuplicate: boolean;
  matchReasons: string[];
}

export interface CheckDuplicatesResponse {
  source?: 'ml' | 'fallback';
  projectId: string;
  query: {
    title: string;
    description?: string | null;
  };
  thresholdUsed: number;
  hasDuplicates: boolean;
  similarTasks: SimilarTaskResult[];
  available: boolean;
}

export class AiSimilarityService {
  /**
   * Computes cosine similarity between two float vectors of equal length
   */
  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length === 0 || vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    return Math.max(0, Math.min(1.0, similarity));
  }

  /**
   * Upserts the embedding vector for a task
   */
  async updateTaskEmbedding(taskId: string, title: string, description?: string | null): Promise<void> {
    if (!env.AI_FEATURES_ENABLED) return;

    try {
      const textToEmbed = `${title}\n\n${description || ''}`.trim();
      const textHash = crypto.createHash('sha256').update(textToEmbed).digest('hex');

      // Check if existing embedding has identical hash
      const existing = await prisma.taskEmbedding.findUnique({ where: { taskId } });
      if (existing && existing.textHash === textHash) {
        return;
      }

      const embedRes = await aiClient.getEmbeddings([textToEmbed]);
      if (embedRes.embeddings.length > 0) {
        const vector = embedRes.embeddings[0];

        await prisma.taskEmbedding.upsert({
          where: { taskId },
          create: {
            taskId,
            vector,
            textHash,
          },
          update: {
            vector,
            textHash,
          },
        });

        logger.debug(`[AI Similarity] Updated embedding for task ${taskId}`);
      }
    } catch (err: any) {
      logger.warn({ err: err.message, taskId }, 'Failed to update task embedding');
    }
  }

  /**
   * Checks open tasks in a project for potential duplicates
   */
  async checkDuplicates(
    projectId: string,
    title: string,
    description?: string | null,
    threshold: number = env.SIMILARITY_THRESHOLD
  ): Promise<CheckDuplicatesResponse> {
    const textToEmbed = `${title}\n\n${description || ''}`.trim();
    const embedRes = await aiClient.getEmbeddings([textToEmbed]);
    const queryVector =
      embedRes.embeddings.length > 0
        ? embedRes.embeddings[0]
        : aiClient.generateFallbackVector(textToEmbed);

    // Fetch open tasks in the project that have embeddings
    const openTasks = await prisma.task.findMany({
      where: {
        projectId,
        status: { not: TaskStatus.done },
      },
      include: {
        embedding: true,
      },
      take: 100,
    });

    const candidates: SimilarTaskResult[] = [];

    for (const task of openTasks) {
      let taskVector: number[] | null = task.embedding?.vector || null;

      // If task doesn't have vector stored yet, compute fallback vector on the fly
      if (!taskVector || taskVector.length === 0) {
        taskVector = aiClient.generateFallbackVector(`${task.title}\n\n${task.description || ''}`);
      }

      const score = this.cosineSimilarity(queryVector, taskVector);
      const isLikelyDuplicate = score >= threshold;

      // Also compute title token overlap as an extra explainability factor
      const titleOverlap = this.calculateTitleOverlap(title, task.title);
      const matchReasons: string[] = [];

      if (score >= 0.9) {
        matchReasons.push('Near-identical semantic meaning and task description');
      } else if (score >= threshold) {
        matchReasons.push('High contextual and objective overlap with existing task');
      } else if (score >= 0.65) {
        matchReasons.push('Related topic or overlapping domain area');
      }

      if (titleOverlap > 0.6) {
        matchReasons.push('Strong keyword match in title');
      }

      candidates.push({
        taskId: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        similarityScore: Math.round(score * 1000) / 1000,
        isLikelyDuplicate,
        matchReasons,
      });
    }

    // Sort descending by similarity score
    candidates.sort((a, b) => b.similarityScore - a.similarityScore);
    const top3 = candidates.slice(0, 3);

    return {
      projectId,
      query: { title, description },
      thresholdUsed: threshold,
      hasDuplicates: top3.some((t) => t.isLikelyDuplicate),
      similarTasks: top3,
      available: embedRes.available,
      source: embedRes.available ? 'ml' : 'fallback',
    };
  }

  private calculateTitleOverlap(t1: string, t2: string): number {
    const words1 = new Set(t1.toLowerCase().split(/\W+/).filter((w) => w.length > 2));
    const words2 = new Set(t2.toLowerCase().split(/\W+/).filter((w) => w.length > 2));
    if (words1.size === 0 || words2.size === 0) return 0;

    let matches = 0;
    for (const w of words1) {
      if (words2.has(w)) matches++;
    }

    return matches / Math.max(words1.size, words2.size);
  }
}

export const aiSimilarityService = new AiSimilarityService();
