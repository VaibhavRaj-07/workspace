import { Request, Response, NextFunction } from 'express';
import { aiMergeService, isAnthropicKeyValid } from './ai.merge.service.js';
import { aiSimilarityService } from './ai.similarity.service.js';
import { aiAssigneeService } from './ai.assignee.service.js';
import { aiRiskService } from './ai.risk.service.js';
import { aiClient } from './ai.client.js';
import { mlCircuitBreaker } from './ai.circuit-breaker.js';
import { ApiResponse } from '../../utils/api-response.js';
import { env } from '../../config/env.js';

export class AiController {
  async getAiStatus(_req: Request, res: Response, next: NextFunction) {
    try {
      const mergeProvider = isAnthropicKeyValid(env.ANTHROPIC_API_KEY) && !env.AI_PII_OPTOUT ? 'claude' : 'rule_based';
      const health = await aiClient.checkHealth();
      const rawBreakerState = mlCircuitBreaker.getState().toLowerCase();
      const breaker = (rawBreakerState === 'closed' ? 'closed' : rawBreakerState === 'half_open' ? 'half_open' : 'open') as 'closed' | 'open' | 'half_open';

      return ApiResponse.success(res, {
        mergeProvider,
        mlService: health.available ? 'up' : 'down',
        breaker,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMergeSuggestion(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.id;
      const { conflicts, baseVersion } = req.body;
      const result = await aiMergeService.generateMergeSuggestions(
        taskId,
        conflicts,
        baseVersion
      );
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async checkDuplicates(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.id;
      const { title, description, threshold } = req.body;
      const result = await aiSimilarityService.checkDuplicates(
        projectId,
        title,
        description,
        threshold
      );
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async suggestAssignee(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.id;
      const { title, description, priority } = req.query as any;
      const result = await aiAssigneeService.suggestAssignees(
        projectId,
        title,
        description,
        priority
      );
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getTaskRisk(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.id;
      const risk = await aiRiskService.getTaskRisk(taskId);
      return ApiResponse.success(res, risk);
    } catch (error) {
      next(error);
    }
  }

  async getProjectRisk(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.id;
      const risk = await aiRiskService.getProjectRisk(projectId);
      return ApiResponse.success(res, risk);
    } catch (error) {
      next(error);
    }
  }
}

export const aiController = new AiController();
