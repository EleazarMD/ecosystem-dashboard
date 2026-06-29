/**
 * Budget Manager — token/time/hop budgets with escalation.
 *
 * Contract: docs/MODULAR_ARCHITECTURE.md §6
 */

export interface BudgetConfig {
  maxHops: number;
  maxTokens: number;
  maxLatencyMs: number;
  escalationStep: number;     // how many extra hops per escalation
}

export const DEFAULT_BUDGET: BudgetConfig = {
  maxHops: 3,
  maxTokens: 300,
  maxLatencyMs: 5000,
  escalationStep: 2,
};

class BudgetManagerImpl {
  private config: BudgetConfig;
  private currentMaxHops: number;
  private hopsUsed = 0;
  private tokensUsed = 0;
  private latencyMs = 0;
  private escalated = false;

  constructor(config: Partial<BudgetConfig> = {}) {
    this.config = { ...DEFAULT_BUDGET, ...config };
    this.currentMaxHops = this.config.maxHops;
  }

  /** Record a hop. Returns remaining budget. */
  recordHop(tokens: number, latencyMs: number): void {
    this.hopsUsed++;
    this.tokensUsed += tokens;
    this.latencyMs += latencyMs;
  }

  /** Escalate: allow more hops (e.g. after a tool failure). */
  escalate(): void {
    if (!this.escalated) {
      this.currentMaxHops += this.config.escalationStep;
      this.escalated = true;
    }
  }

  remaining(): { hops: number; tokens: number; latencyMs: number } {
    return {
      hops: this.currentMaxHops - this.hopsUsed,
      tokens: this.config.maxTokens - this.tokensUsed,
      latencyMs: this.config.maxLatencyMs - this.latencyMs,
    };
  }

  exhausted(): boolean {
    const r = this.remaining();
    return r.hops <= 0 || r.tokens <= 0 || r.latencyMs <= 0;
  }

  /** Fraction of budget used (0-1). */
  fractionUsed(): number {
    const hopFraction = this.hopsUsed / this.currentMaxHops;
    const tokenFraction = this.tokensUsed / this.config.maxTokens;
    const latencyFraction = this.latencyMs / this.config.maxLatencyMs;
    return Math.max(hopFraction, tokenFraction, latencyFraction);
  }

  reset(): void {
    this.currentMaxHops = this.config.maxHops;
    this.hopsUsed = 0;
    this.tokensUsed = 0;
    this.latencyMs = 0;
    this.escalated = false;
  }

  getStats(): { hopsUsed: number; maxHops: number; tokensUsed: number; latencyMs: number; escalated: boolean } {
    return {
      hopsUsed: this.hopsUsed,
      maxHops: this.currentMaxHops,
      tokensUsed: this.tokensUsed,
      latencyMs: this.latencyMs,
      escalated: this.escalated,
    };
  }
}

export { BudgetManagerImpl as BudgetManager };
