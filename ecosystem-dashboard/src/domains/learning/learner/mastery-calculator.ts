/**
 * Mastery Calculator — converts raw attempt data into mastery scores.
 *
 * Contract: docs/MODULAR_ARCHITECTURE.md §4
 *
 * Uses an exponential moving average (EMA) to update mastery after each
 * attempt. This is simple, dependency-free, and responsive to recent trends.
 *
 * Future upgrade: Bayesian IRT model when we have enough data.
 */

import { getEventBus } from '../shared/event-bus';

export interface AttemptRecord {
  childId: string;
  skillCode: string;
  correct: boolean;
  timestamp: number;
  attemptNumber: number;
}

const EMA_ALPHA = 0.3;  // weight given to new observation
const MASTERY_SIGNIFICANT_CHANGE = 0.05;  // emit event if change >= this

class MasteryCalculatorImpl {
  private mastery = new Map<string, number>(); // `${childId}:${skillCode}` → mastery

  /** Get current mastery for a child + skill. */
  get(childId: string, skillCode: string): number {
    return this.mastery.get(`${childId}:${skillCode}`) ?? 0;
  }

  /** Get all mastery scores for a child. */
  getAll(childId: string): Record<string, number> {
    const result: Record<string, number> = {};
    const prefix = `${childId}:`;
    for (const [key, value] of Array.from(this.mastery)) {
      if (key.startsWith(prefix)) {
        const skillCode = key.slice(prefix.length);
        result[skillCode] = value;
      }
    }
    return result;
  }

  /** Update mastery after an attempt. Returns the new mastery score. */
  update(record: AttemptRecord): number {
    const key = `${record.childId}:${record.skillCode}`;
    const oldMastery = this.mastery.get(key) ?? 0.5; // start at 0.5 (uncertain)
    const observation = record.correct ? 1 : 0;
    const newMastery = oldMastery + EMA_ALPHA * (observation - oldMastery);

    this.mastery.set(key, newMastery);

    // Emit event if significant change
    const delta = Math.abs(newMastery - oldMastery);
    if (delta >= MASTERY_SIGNIFICANT_CHANGE) {
      getEventBus().emit('mastery.changed', {
        childId: record.childId,
        skillCode: record.skillCode,
        oldMastery,
        newMastery,
        timestamp: record.timestamp,
      });
    }

    return newMastery;
  }

  /** Bulk set mastery (e.g. from PCG sync). */
  set(childId: string, skillCode: string, mastery: number): void {
    this.mastery.set(`${childId}:${skillCode}`, Math.max(0, Math.min(1, mastery)));
  }

  /** Clear mastery for a child (for testing). */
  clear(childId: string): void {
    const prefix = `${childId}:`;
    for (const key of Array.from(this.mastery.keys())) {
      if (key.startsWith(prefix)) {
        this.mastery.delete(key);
      }
    }
  }

  reset(): void {
    this.mastery.clear();
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let _instance: MasteryCalculatorImpl | null = null;

export function getMasteryCalculator(): MasteryCalculatorImpl {
  if (!_instance) {
    _instance = new MasteryCalculatorImpl();
  }
  return _instance;
}

export function _resetMasteryCalculator(): void {
  _instance?.reset();
  _instance = null;
}
