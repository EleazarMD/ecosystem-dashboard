/**
 * Learning Platform Bootstrap — starts background services on server startup.
 *
 * Contract: docs/MODULAR_ARCHITECTURE.md §1 (Event Bus) + §5 (Analytics)
 *
 * Call `initLearningPlatform()` once during server startup to:
 * - Start the AnalyticsCollector (subscribes to events, builds snapshots)
 * - Start the DreamConsolidator (triggers DreamEngine after N sessions)
 *
 * This is idempotent — calling it multiple times is safe.
 */

import { getAnalyticsCollector } from '../analytics/analytics-collector';
import { getDreamConsolidator } from '../processes/dream-consolidator';

let _initialized = false;

export function initLearningPlatform(): void {
  if (_initialized) return;
  _initialized = true;

  // Start collecting analytics from events
  getAnalyticsCollector().start();

  // Start the dream consolidator (listens for session.closed events)
  getDreamConsolidator().start();

  console.log('[LearningPlatform] Analytics collector + dream consolidator started');
}

export function isLearningPlatformInitialized(): boolean {
  return _initialized;
}
