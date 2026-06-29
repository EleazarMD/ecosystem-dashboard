/**
 * Dream Consolidator — background process that runs the Dream Engine.
 *
 * Contract: docs/MODULAR_ARCHITECTURE.md §5
 *
 * Triggered by session.closed events (after N sessions per child) or
 * by a cron job. Collects snapshots + patterns, runs the Dream Engine,
 * and feeds insights back into the AdaptationEngine + LessonRegistry.
 */

import { getDreamEngine } from '../analytics/dream-engine';
import { getAnalyticsCollector } from '../analytics/analytics-collector';
import { getPatternDetector } from '../analytics/pattern-detector';
import { getEventBus } from '../shared/event-bus';

const SESSIONS_PER_DREAM = 3; // dream after every 3 sessions

class DreamConsolidatorImpl {
  private sessionCounts = new Map<string, number>();
  private running = false;
  private unsubscribe?: () => void;

  /** Start listening for session.closed events. */
  start(): void {
    if (this.running) return;
    this.running = true;

    this.unsubscribe = getEventBus().on('session.closed', (event) => {
      const count = (this.sessionCounts.get(event.payload.childId) || 0) + 1;
      this.sessionCounts.set(event.payload.childId, count);

      if (count >= SESSIONS_PER_DREAM) {
        this.sessionCounts.set(event.payload.childId, 0);
        void this.consolidate(event.payload.childId);
      }
    });
  }

  /** Manually trigger consolidation for a child. */
  async consolidate(childId: string): Promise<void> {
    const collector = getAnalyticsCollector();
    const detector = getPatternDetector();
    const dreamEngine = getDreamEngine();

    const snapshots = collector.getSnapshots(childId, 30);
    const patterns = detector.getPatterns(childId);

    if (snapshots.length < 3) return; // not enough data

    const insights = dreamEngine.consolidate({
      childId,
      snapshots,
      patterns,
    });

    if (insights.length > 0) {
      console.log(
        `[DreamConsolidator] Consolidated ${insights.length} insights for ${childId}`,
      );
    }
  }

  stop(): void {
    this.running = false;
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  reset(): void {
    this.stop();
    this.sessionCounts.clear();
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let _instance: DreamConsolidatorImpl | null = null;

export function getDreamConsolidator(): DreamConsolidatorImpl {
  if (!_instance) {
    _instance = new DreamConsolidatorImpl();
  }
  return _instance;
}

export function _resetDreamConsolidator(): void {
  _instance?.reset();
  _instance = null;
}
