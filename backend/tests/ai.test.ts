import { describe, it, expect, vi } from 'vitest';
import { CircuitBreaker, CircuitState } from '../src/modules/ai/ai.circuit-breaker.js';
import { aiSimilarityService } from '../src/modules/ai/ai.similarity.service.js';
import { aiMergeService } from '../src/modules/ai/ai.merge.service.js';
import { aiClient } from '../src/modules/ai/ai.client.js';

describe('AI Gateway & Intelligent Features Unit & Service Tests', () => {
  describe('1. Circuit Breaker Resilience', () => {
    it('should stay CLOSED on successful calls and return output', async () => {
      const cb = new CircuitBreaker({ failureThreshold: 2, requestTimeoutMs: 1000 });
      const result = await cb.execute(
        async () => 'success_data',
        () => 'fallback_data'
      );
      expect(result).toBe('success_data');
      expect(cb.getState()).toBe(CircuitState.CLOSED);
    });

    it('should trip to OPEN after consecutive failures and immediately return fallback without calling action', async () => {
      const cb = new CircuitBreaker({ failureThreshold: 2, requestTimeoutMs: 100 });

      // First failure
      await cb.execute(
        async () => { throw new Error('Network timeout 1'); },
        () => 'fallback_1'
      );
      expect(cb.getState()).toBe(CircuitState.CLOSED);

      // Second failure -> trips to OPEN
      await cb.execute(
        async () => { throw new Error('Network timeout 2'); },
        () => 'fallback_2'
      );
      expect(cb.getState()).toBe(CircuitState.OPEN);

      // Third call fast-fails
      let actionCalled = false;
      const result = await cb.execute(
        async () => { actionCalled = true; return 'live'; },
        () => 'fast_fallback'
      );
      expect(result).toBe('fast_fallback');
      expect(actionCalled).toBe(false);
    });

    it('should transition to HALF_OPEN after reset timeout and reset to CLOSED on recovery', async () => {
      const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 50, requestTimeoutMs: 50 });
      await cb.execute(
        async () => { throw new Error('fail'); },
        () => 'fb'
      );
      expect(cb.getState()).toBe(CircuitState.OPEN);

      // Wait 60ms for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 60));
      expect(cb.getState()).toBe(CircuitState.HALF_OPEN);

      // Success in HALF_OPEN resets to CLOSED
      const result = await cb.execute(
        async () => 'recovered',
        () => 'fb'
      );
      expect(result).toBe('recovered');
      expect(cb.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('2. Feature 1: AI-Assisted Conflict Merge Suggestion', () => {
    it('should synthesize clean 3-way merge for conflicting title and description', async () => {
      const conflicts = {
        title: {
          baseValue: 'Database Indexing',
          myValue: 'Database Indexing in PostgreSQL with B-tree',
          theirValue: 'Database Indexing and Slow Query Logging',
        },
        description: {
          baseValue: 'Initial scope of task.',
          myValue: 'Initial scope of task.\nImplemented compound index on tasks(project_id, status).',
          theirValue: 'Initial scope of task.\nConfigured pg_stat_statements query profiler.',
        },
      };

      const result = await aiMergeService.generateMergeSuggestions('task-test-123', conflicts, 1);

      expect(result.available).toBe(true);
      expect(result.taskId).toBe('task-test-123');
      expect(result.suggestions.title).toBeDefined();
      expect(result.suggestions.title.mergedValue).toBeDefined();
      expect(result.suggestions.title.explanation).toBeDefined();
      expect(result.suggestions.title.confidence).toBeGreaterThan(0.7);

      expect(result.suggestions.description.mergedValue).toContain('compound index');
      expect(result.suggestions.description.mergedValue).toContain('pg_stat_statements');
    });

    it('should handle identical conflicting edits gracefully', async () => {
      const conflicts = {
        title: {
          baseValue: 'Old Title',
          myValue: 'Identical Title',
          theirValue: 'Identical Title',
        },
      };

      const result = await aiMergeService.generateMergeSuggestions('task-test-456', conflicts, 1);
      expect(result.suggestions.title.mergedValue).toBe('Identical Title');
      expect(result.suggestions.title.confidence).toBe(1.0);
    });
  });

  describe('3. Feature 4: Semantic Embedding & Cosine Similarity', () => {
    it('should compute exact cosine similarity for identical and orthogonal vectors', () => {
      const vecA = [1.0, 0.0, 0.0];
      const vecB = [1.0, 0.0, 0.0];
      const vecC = [0.0, 1.0, 0.0];

      expect(aiSimilarityService.cosineSimilarity(vecA, vecB)).toBeCloseTo(1.0);
      expect(aiSimilarityService.cosineSimilarity(vecA, vecC)).toBeCloseTo(0.0);
    });

    it('should generate higher similarity for semantically related texts', () => {
      const vec1 = aiClient.generateFallbackVector('PostgreSQL query performance and indexing');
      const vec2 = aiClient.generateFallbackVector('Database query optimization and postgres index tuning');
      const vec3 = aiClient.generateFallbackVector('Frontend CSS color palettes and button animations');

      const simRelated = aiSimilarityService.cosineSimilarity(vec1, vec2);
      const simUnrelated = aiSimilarityService.cosineSimilarity(vec1, vec3);

      expect(simRelated).toBeGreaterThan(simUnrelated);
    });
  });

  describe('4. Feature 2: Deadline Risk Predictor Fallback & Heuristics', () => {
    it('should evaluate high risk for overdue tasks with heavy assignee workload', async () => {
      const overdueFeatures = {
        task_age_days: 20.0,
        priority_encoded: 3,
        status_encoded: 0,
        hours_in_current_status: 120.0,
        status_changes_count: 0,
        assignee_open_tasks: 8,
        assignee_ontime_rate: 0.50,
        comment_count: 5,
        days_to_due_date: -4.0, // 4 days overdue
        project_completion_rate: 0.20,
        description_length: 100,
      };

      const result = await aiClient.predictTaskRisk(overdueFeatures);
      expect(result.riskScore).toBeGreaterThan(50);
      expect(['high', 'critical']).toContain(result.riskLevel);
      expect(result.topFactors.length).toBeGreaterThan(0);
      const factorNames = result.topFactors.map((f) => f.feature);
      expect(factorNames).toContain('days_to_due_date');
    });

    it('should evaluate low risk for healthy task with high reliability assignee', async () => {
      const healthyFeatures = {
        task_age_days: 1.0,
        priority_encoded: 1,
        status_encoded: 1,
        hours_in_current_status: 4.0,
        status_changes_count: 1,
        assignee_open_tasks: 1,
        assignee_ontime_rate: 0.95,
        comment_count: 1,
        days_to_due_date: 14.0, // 14 days buffer
        project_completion_rate: 0.80,
        description_length: 200,
      };

      const result = await aiClient.predictTaskRisk(healthyFeatures);
      expect(result.riskScore).toBeLessThan(40);
      expect(result.riskLevel).toBe('low');
    });
  });
});
