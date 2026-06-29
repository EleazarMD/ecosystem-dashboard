/**
 * Analytics Collector — subscribes to events and builds time-series snapshots.
 *
 * Contract: docs/MODULAR_ARCHITECTURE.md §5
 *
 * Subscribes to: attempt.graded, turn.complete, mastery.changed, session.closed
 * Produces: LearningSnapshot per child per period
 */

import type { LearningSnapshot, AnalyticsPeriod } from './analytics-types';
import { getEventBus } from '../shared/event-bus';

interface RawMetrics {
  attempts: number;
  correct: number;
  latencies: number[];
  skillsTouched: Set<string>;
  toolUsage: Record<string, number>;
  masteryDeltas: Record<string, number>;
  bestStreak: number;
  totalSessions: number;
  totalEngagementTime: number;
}

class AnalyticsCollectorImpl {
  private raw = new Map<string, RawMetrics>(); // childId → raw metrics
  private snapshots = new Map<string, LearningSnapshot[]>(); // childId → snapshots
  private maxSnapshots = 90; // ~3 months of daily snapshots
  private unsubscribers: Array<() => void> = [];

  /** Start collecting events. */
  start(): void {
    if (this.unsubscribers.length > 0) return; // already started

    const bus = getEventBus();

    this.unsubscribers.push(
      bus.on('attempt.graded', (event) => {
        this.recordAttempt(event.payload.childId, event.payload.skillCode, event.payload.correct);
      }),
    );

    this.unsubscribers.push(
      bus.on('turn.complete', (event) => {
        this.recordTurn(event.payload.childId, event.payload.toolsUsed, event.payload.latencyMs);
      }),
    );

    this.unsubscribers.push(
      bus.on('mastery.changed', (event) => {
        this.recordMasteryDelta(
          event.payload.childId,
          event.payload.skillCode,
          event.payload.newMastery - event.payload.oldMastery,
        );
      }),
    );

    this.unsubscribers.push(
      bus.on('session.closed', (event) => {
        this.recordSession(event.payload.childId, event.payload.stats);
      }),
    );
  }

  private getOrCreate(childId: string): RawMetrics {
    let m = this.raw.get(childId);
    if (!m) {
      m = {
        attempts: 0,
        correct: 0,
        latencies: [],
        skillsTouched: new Set(),
        toolUsage: {},
        masteryDeltas: {},
        bestStreak: 0,
        totalSessions: 0,
        totalEngagementTime: 0,
      };
      this.raw.set(childId, m);
    }
    return m;
  }

  private recordAttempt(childId: string, skillCode: string, correct: boolean): void {
    const m = this.getOrCreate(childId);
    m.attempts++;
    if (correct) m.correct++;
    m.skillsTouched.add(skillCode);
  }

  private recordTurn(childId: string, toolsUsed: string[], latencyMs: number): void {
    const m = this.getOrCreate(childId);
    m.latencies.push(latencyMs);
    for (const tool of toolsUsed) {
      m.toolUsage[tool] = (m.toolUsage[tool] || 0) + 1;
    }
  }

  private recordMasteryDelta(childId: string, skillCode: string, delta: number): void {
    const m = this.getOrCreate(childId);
    m.masteryDeltas[skillCode] = (m.masteryDeltas[skillCode] || 0) + delta;
  }

  private recordSession(childId: string, stats: { bestStreak?: number; durationSeconds?: number }): void {
    const m = this.getOrCreate(childId);
    m.totalSessions++;
    if (stats.bestStreak) m.bestStreak = Math.max(m.bestStreak, stats.bestStreak);
    if (stats.durationSeconds) m.totalEngagementTime += stats.durationSeconds;
  }

  /** Snapshot current metrics and reset raw counters. */
  snapshot(childId: string, period: AnalyticsPeriod = 'daily'): LearningSnapshot {
    const m = this.raw.get(childId);
    const now = Date.now();

    const snap: LearningSnapshot = {
      childId,
      period,
      periodStart: now,
      periodEnd: now,
      totalAttempts: m?.attempts ?? 0,
      correctRate: m && m.attempts > 0 ? m.correct / m.attempts : 0,
      averageLatencyMs: m && m.latencies.length > 0
        ? m.latencies.reduce((a, b) => a + b, 0) / m.latencies.length
        : 0,
      skillsTouched: m ? Array.from(m.skillsTouched) : [],
      masteryDeltas: m ? { ...m.masteryDeltas } : {},
      engagementScore: m ? m.totalEngagementTime * m.attempts * (m.totalSessions || 1) / 1000 : 0,
      toolUsage: m ? { ...m.toolUsage } : {},
      bestStreak: m?.bestStreak ?? 0,
      totalSessions: m?.totalSessions ?? 0,
    };

    // Store snapshot
    const snaps = this.snapshots.get(childId) || [];
    snaps.push(snap);
    if (snaps.length > this.maxSnapshots) snaps.shift();
    this.snapshots.set(childId, snaps);

    // Reset raw metrics
    this.raw.delete(childId);

    return snap;
  }

  /** Get historical snapshots for a child. */
  getSnapshots(childId: string, lastN: number = 30): LearningSnapshot[] {
    const snaps = this.snapshots.get(childId) || [];
    return snaps.slice(-lastN);
  }

  /** Stop collecting and clean up. */
  stop(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
  }

  reset(): void {
    this.stop();
    this.raw.clear();
    this.snapshots.clear();
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let _instance: AnalyticsCollectorImpl | null = null;

export function getAnalyticsCollector(): AnalyticsCollectorImpl {
  if (!_instance) {
    _instance = new AnalyticsCollectorImpl();
  }
  return _instance;
}

export function _resetAnalyticsCollector(): void {
  _instance?.reset();
  _instance = null;
}
