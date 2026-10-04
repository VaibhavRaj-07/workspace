import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { mlCircuitBreaker } from './ai.circuit-breaker.js';

export interface MLServiceHealth {
  status: string;
  version: string;
  modelsLoaded: {
    riskPredictor: boolean;
    embeddingModel: boolean;
  };
}

export interface RiskPredictionResponse {
  available: boolean;
  riskProbability: number;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  topFactors: Array<{
    feature: string;
    importance: number;
    impact: 'increases_risk' | 'decreases_risk';
    reason: string;
  }>;
  confidence: number;
}

export interface EmbeddingResponse {
  available: boolean;
  embeddings: number[][];
  dimensions: number;
}

export class AiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = env.ML_SERVICE_URL.replace(/\/$/, '');
  }

  isAiEnabled(): boolean {
    return env.AI_FEATURES_ENABLED;
  }

  async checkHealth(): Promise<{ available: boolean; info?: MLServiceHealth }> {
    if (!this.isAiEnabled()) {
      return { available: false };
    }

    return mlCircuitBreaker.execute<{ available: boolean; info?: MLServiceHealth }>(
      async (signal) => {
        const res = await fetch(`${this.baseUrl}/health`, { signal });
        if (!res.ok) throw new Error(`Health check returned ${res.status}`);
        const info = (await res.json()) as MLServiceHealth;
        return { available: true, info };
      },
      () => ({ available: false })
    );
  }

  async getEmbeddings(texts: string[]): Promise<EmbeddingResponse> {
    if (!this.isAiEnabled() || texts.length === 0) {
      return { available: false, embeddings: [], dimensions: 0 };
    }

    return mlCircuitBreaker.execute<EmbeddingResponse>(
      async (signal) => {
        const res = await fetch(`${this.baseUrl}/embed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts }),
          signal,
        });

        if (!res.ok) throw new Error(`Embed call failed with ${res.status}`);
        const data = (await res.json()) as { embeddings: number[][]; dimensions: number };
        return { available: true, embeddings: data.embeddings, dimensions: data.dimensions };
      },
      () => {
        const fallbackVectors = texts.map((t) => this.generateFallbackVector(t, 384));
        return { available: false, embeddings: fallbackVectors, dimensions: 384 };
      }
    );
  }

  async predictTaskRisk(features: Record<string, any>): Promise<RiskPredictionResponse> {
    if (!this.isAiEnabled()) {
      return this.generateHeuristicRiskFallback(features);
    }

    return mlCircuitBreaker.execute<RiskPredictionResponse>(
      async (signal) => {
        const res = await fetch(`${this.baseUrl}/predict-risk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(features),
          signal,
        });

        if (!res.ok) throw new Error(`Risk prediction failed with ${res.status}`);
        const data = (await res.json()) as any;
        return { available: true, ...data };
      },
      () => this.generateHeuristicRiskFallback(features)
    );
  }

  /**
   * Deterministic fallback vector generation when ML service is offline
   */
  generateFallbackVector(text: string, dimensions: number = 384): number[] {
    const vector = new Array(dimensions).fill(0);
    const normalized = text.toLowerCase().replace(/[^a-z0-9 ]/g, '');
    const words = normalized.split(/\s+/).filter(Boolean);

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      let hash = 0;
      for (let j = 0; j < word.length; j++) {
        hash = (hash << 5) - hash + word.charCodeAt(j);
        hash |= 0;
      }
      const idx = Math.abs(hash) % dimensions;
      vector[idx] += 1;
    }

    // Normalize L2 norm
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (magnitude > 0) {
      for (let i = 0; i < dimensions; i++) {
        vector[i] = vector[i] / magnitude;
      }
    }

    return vector;
  }

  /**
   * Rule-based heuristic risk fallback when ML model is offline
   */
  private generateHeuristicRiskFallback(f: Record<string, any>): RiskPredictionResponse {
    let score = 0.2; // Baseline
    const topFactors: Array<{
      feature: string;
      importance: number;
      impact: 'increases_risk' | 'decreases_risk';
      reason: string;
    }> = [];

    const daysToDueDate = f.days_to_due_date ?? 7;
    const assigneeOpenTasks = f.assignee_open_tasks ?? 0;
    const priority = f.priority ?? 'medium';
    const hoursInCurrentStatus = f.hours_in_current_status ?? 0;
    const assigneeOnTimeRate = f.assignee_ontime_rate ?? 0.8;

    if (daysToDueDate < 0) {
      score += 0.5;
      topFactors.push({
        feature: 'days_to_due_date',
        importance: 0.45,
        impact: 'increases_risk',
        reason: `Task is already overdue by ${Math.abs(Math.round(daysToDueDate))} days`,
      });
    } else if (daysToDueDate <= 2) {
      score += 0.3;
      topFactors.push({
        feature: 'days_to_due_date',
        importance: 0.35,
        impact: 'increases_risk',
        reason: `Due within ${Math.max(1, Math.round(daysToDueDate * 24))} hours`,
      });
    }

    if (assigneeOpenTasks >= 6) {
      score += 0.25;
      topFactors.push({
        feature: 'assignee_open_tasks',
        importance: 0.25,
        impact: 'increases_risk',
        reason: `Assignee is carrying high workload (${assigneeOpenTasks} open tasks)`,
      });
    }

    if (hoursInCurrentStatus > 72) {
      score += 0.2;
      topFactors.push({
        feature: 'hours_in_current_status',
        importance: 0.2,
        impact: 'increases_risk',
        reason: `No status movement for ${Math.round(hoursInCurrentStatus / 24)} days`,
      });
    }

    if (assigneeOnTimeRate >= 0.9) {
      score -= 0.15;
      topFactors.push({
        feature: 'assignee_ontime_rate',
        importance: 0.15,
        impact: 'decreases_risk',
        reason: `Assignee has excellent historical reliability (${Math.round(assigneeOnTimeRate * 100)}% on-time)`,
      });
    }

    const boundedScore = Math.max(0.05, Math.min(0.98, score));
    const riskLevel =
      boundedScore >= 0.75
        ? 'critical'
        : boundedScore >= 0.5
        ? 'high'
        : boundedScore >= 0.25
        ? 'medium'
        : 'low';

    return {
      available: false, // Indicates heuristic fallback was used
      riskProbability: boundedScore,
      riskScore: Math.round(boundedScore * 100),
      riskLevel,
      topFactors: topFactors.slice(0, 3),
      confidence: 0.7,
    };
  }
}

export const aiClient = new AiClient();
