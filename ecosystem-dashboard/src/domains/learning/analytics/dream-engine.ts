/**
 * Dream Engine — overnight memory consolidation + insight generation.
 *
 * Contract: docs/MODULAR_ARCHITECTURE.md §5
 *
 * The "self-learning loop for user and agent":
 * 1. Collects recent snapshots + patterns for a child
 * 2. Synthesizes insights (deterministic now, AI-powered later)
 * 3. Generates DreamInsight objects
 * 4. Emits dream.consolidated event
 * 5. Insights feed back into AdaptationEngine + LessonRegistry
 */

import type { LearningSnapshot, LearningPattern, DreamInsight } from './analytics-types';
import { getEventBus } from '../shared/event-bus';

interface DreamInput {
  childId: string;
  snapshots: LearningSnapshot[];
  patterns: LearningPattern[];
}

class DreamEngineImpl {
  private insights = new Map<string, DreamInsight[]>(); // childId → insights
  private dreamCount = new Map<string, number>();        // childId → times dreamed

  /**
   * Consolidate recent learning data into insights.
   *
   * Currently uses deterministic heuristics. Future: call AI Gateway with
   * child-safety key to synthesize richer insights.
   */
  consolidate(input: DreamInput): DreamInsight[] {
    const { childId, snapshots, patterns } = input;
    const insights: DreamInsight[] = [];
    const now = Date.now();

    // Only dream if we have enough data
    if (snapshots.length < 3) return [];

    // Insight 1: Overall progress assessment
    const recentSnaps = snapshots.slice(-7);
    const totalAttempts = recentSnaps.reduce((s, snap) => s + snap.totalAttempts, 0);
    const avgCorrectRate = recentSnaps.reduce((s, snap) => s + snap.correctRate, 0) / recentSnaps.length;

    if (totalAttempts > 0) {
      insights.push({
        id: `dream-progress-${childId}-${now}`,
        childId,
        insight: `Over the last ${recentSnaps.length} sessions, ${childId} answered ${totalAttempts} questions with ${(avgCorrectRate * 100).toFixed(0)}% accuracy.`,
        actionable: false,
        suggestedActions: [],
        confidence: 0.9,
        consolidatedAt: now,
      });
    }

    // Insight 2: Pattern-based insights
    for (const pattern of patterns) {
      if (pattern.type === 'struggle_pattern' && pattern.confidence > 0.6) {
        insights.push({
          id: `dream-struggle-${childId}-${now}-${pattern.id}`,
          childId,
          insight: pattern.description,
          actionable: true,
          suggestedActions: [
            'Increase hint escalation speed for struggling skills',
            'Reduce difficulty by one level',
            'Schedule a spaced review session for these skills',
          ],
          confidence: pattern.confidence,
          consolidatedAt: now,
        });
      }

      if (pattern.type === 'breakthrough_signal' && pattern.confidence > 0.7) {
        insights.push({
          id: `dream-breakthrough-${childId}-${now}-${pattern.id}`,
          childId,
          insight: `Breakthrough: ${pattern.description}. Consider celebrating this progress and introducing stretch challenges.`,
          actionable: true,
          suggestedActions: [
            'Increase difficulty by one level for the breakthrough skill',
            'Introduce stretch challenges',
            'Celebrate the progress in the next session opening',
          ],
          confidence: pattern.confidence,
          consolidatedAt: now,
        });
      }

      if (pattern.type === 'mastery_plateau' && pattern.confidence > 0.5) {
        insights.push({
          id: `dream-plateau-${childId}-${now}-${pattern.id}`,
          childId,
          insight: pattern.description,
          actionable: true,
          suggestedActions: [
            'Try a different teaching approach (visual, story-based)',
            'Switch to a related skill and come back later',
            'Introduce a concept-check to diagnose the specific gap',
          ],
          confidence: pattern.confidence,
          consolidatedAt: now,
        });
      }
    }

    // Insight 3: Mastery delta analysis
    const masteryDeltas: Record<string, number> = {};
    for (const snap of recentSnaps) {
      for (const [skill, delta] of Object.entries(snap.masteryDeltas)) {
        masteryDeltas[skill] = (masteryDeltas[skill] || 0) + delta;
      }
    }

    const topGains = Object.entries(masteryDeltas)
      .filter(([, delta]) => delta > 0.1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    if (topGains.length > 0) {
      insights.push({
        id: `dream-gains-${childId}-${now}`,
        childId,
        insight: `Biggest mastery gains: ${topGains.map(([s, d]) => `${s} (+${d.toFixed(2)})`).join(', ')}`,
        actionable: true,
        suggestedActions: [
          'Continue building on these strengths',
          'Connect these skills to new, related challenges',
        ],
        confidence: 0.8,
        consolidatedAt: now,
      });
    }

    // Store insights
    const existing = this.insights.get(childId) || [];
    this.insights.set(childId, [...existing, ...insights]);
    this.dreamCount.set(childId, (this.dreamCount.get(childId) || 0) + 1);

    // Emit event
    if (insights.length > 0) {
      getEventBus().emit('dream.consolidated', {
        childId,
        insightCount: insights.length,
        insights: insights.map((i) => ({ insight: i.insight, confidence: i.confidence })),
        timestamp: now,
      });
    }

    return insights;
  }

  /** Get all dream insights for a child. */
  getInsights(childId: string, lastN: number = 10): DreamInsight[] {
    const all = this.insights.get(childId) || [];
    return all.slice(-lastN);
  }

  /** Get the number of times the dream engine has run for a child. */
  getDreamCount(childId: string): number {
    return this.dreamCount.get(childId) || 0;
  }

  reset(): void {
    this.insights.clear();
    this.dreamCount.clear();
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let _instance: DreamEngineImpl | null = null;

export function getDreamEngine(): DreamEngineImpl {
  if (!_instance) {
    _instance = new DreamEngineImpl();
  }
  return _instance;
}

export function _resetDreamEngine(): void {
  _instance?.reset();
  _instance = null;
}
