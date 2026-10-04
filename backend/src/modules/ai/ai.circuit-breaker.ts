import { logger } from '../../config/logger.js';

export enum CircuitState {
  CLOSED = 'CLOSED',       // Normal operation, all requests allowed
  OPEN = 'OPEN',           // Failing, fast-fail without calling service
  HALF_OPEN = 'HALF_OPEN', // Testing if service has recovered
}

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Number of consecutive failures before opening (default: 3)
  resetTimeoutMs?: number;   // Time to stay OPEN before trying HALF_OPEN (default: 10000ms)
  requestTimeoutMs?: number; // Timeout per request (default: 2000ms)
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly requestTimeoutMs: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 3;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 10000;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 2000;
  }

  getState(): CircuitState {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = CircuitState.HALF_OPEN;
        logger.info('[CircuitBreaker] Transitioned from OPEN to HALF_OPEN');
      }
    }
    return this.state;
  }

  async execute<T>(action: (signal: AbortSignal) => Promise<T>, fallback: () => Promise<T> | T): Promise<T> {
    const currentState = this.getState();

    if (currentState === CircuitState.OPEN) {
      logger.warn('[CircuitBreaker] Service is OPEN. Executing graceful fallback.');
      return fallback();
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const result = await action(controller.signal);
      clearTimeout(timer);
      this.onSuccess();
      return result;
    } catch (error: any) {
      clearTimeout(timer);
      this.onFailure(error);
      logger.warn({ error: error.message }, '[CircuitBreaker] Call failed. Returning fallback.');
      return fallback();
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      logger.info('[CircuitBreaker] Service recovered! Transitioned from HALF_OPEN to CLOSED');
    }
  }

  private onFailure(err: any) {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    logger.warn(`[CircuitBreaker] Failure recorded (${this.failureCount}/${this.failureThreshold}): ${err.message}`);

    if (this.failureCount >= this.failureThreshold || this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      logger.error('[CircuitBreaker] Failure threshold reached! Circuit is now OPEN');
    }
  }

  // Testing helpers
  reset() {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }

  forceState(state: CircuitState) {
    this.state = state;
  }
}

export const mlCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeoutMs: 10000,
  requestTimeoutMs: 2000, // 2s timeout as specified
});
