/**
 * Pattern Detector — identifies recurring patterns in learning data.
 *
 * Contract: docs/MODULAR_ARCHITECTURE.md §5
 *
 * Analyzes snapshots + mastery data to detect:
 * - struggle patterns (consistent low mastery in a skill)
 * - breakthrough signals (sudden improvement after struggle)
 * - mastery plateaus (stuck at a level)
 * - tool preferences (heavy use of certain tools)
 * - skill clusters (strengths in related skills)
 */

import type { LearningSnapshot, LearningPattern, PatternType } from './analytics-types';
import { getEventBus } from '../shared/event-bus';

const STRUGGLE_THRESHOLD = 0.4;
const BREAKTHROUGH_THRESHOLD = 0.65;
const PLATEAU_WINDOW = 5;       // snapshots to check for plateau
const PLATEAU_VARIANCE = 0.03;  // mastery must stay within this range

class PatternDetectorImpl {
  private patterns = new Map<string, LearningPattern[]>();
  private masteryHistory = new Map<string, Array<{ skillCode: string; mastery: number; timestamp: number }>>();

  /** Feed mastery data for pattern detection. */
  feedMastery(childId: string, skillCode: string, mastery: number): void {
    const history = this.masteryHistory.get(childId) || [];
    history.push({ skillCode, mastery, timestamp: Date.now() });
    if (history.length > 100) history.shift();
    this.masteryHistory.set(childId, history);
  }

  /** Detect patterns from recent snapshots + mastery history. */
  detect(childId: string, snapshots: LearningSnapshot[]): LearningPattern[] {
    const detected: LearningPattern[] = [];
    const now = Date.now();

    // 1. Struggle pattern: low correctRate in recent snapshots
    const recentSnaps = snapshots.slice(-5);
    if (recentSnaps.length >= 3) {
      const avgCorrectRate = recentSnaps.reduce((sum, s) => sum + s.correctRate, 0) / recentSnaps.length;
      if (avgCorrectRate < STRUGGLE_THRESHOLD) {
        const strugglingSkills = recentSnaps
          .flatMap((s) => s.skillsTouched)
          .filter((skill, _i, arr) => arr.indexOf(skill) === _i);

        detected.push({
          id: `struggle-${childId}-${now}`,
          childId,
          type: 'struggle_pattern',
          confidence: 0.7,
          description: `Learner is struggling with ${strugglingSkills.join(', ')} (avg correct rate: ${avgCorrectRate.toFixed(2)})`,
          evidence: { avgCorrectRate, strugglingSkills, snapshotCount: recentSnaps.length },
          detectedAt: now,
        });
      }
    }

    // 2. Breakthrough signal: was struggling, now improving
    const masteryHistory = this.masteryHistory.get(childId) || [];
    if (masteryHistory.length >= 6) {
      const recent = masteryHistory.slice(-3);
      const older = masteryHistory.slice(-6, -3);
      const recentAvg = recent.reduce((s, m) => s + m.mastery, 0) / recent.length;
      const olderAvg = older.reduce((s, m) => s + m.mastery, 0) / older.length;

      if (olderAvg < STRUGGLE_THRESHOLD && recentAvg > BREAKTHROUGH_THRESHOLD) {
        detected.push({
          id: `breakthrough-${childId}-${now}`,
          childId,
          type: 'breakthrough_signal',
          confidence: 0.8,
          description: `Breakthrough detected: mastery improved from ${olderAvg.toFixed(2)} to ${recentAvg.toFixed(2)}`,
          evidence: { olderAvg, recentAvg, skillCode: recent[0]?.skillCode },
          detectedAt: now,
        });
      }
    }

    // 3. Mastery plateau: mastery hasn't changed significantly
    if (masteryHistory.length >= PLATEAU_WINDOW * 2) {
      const recent = masteryHistory.slice(-PLATEAU_WINDOW);
      const masteries = recent.map((m) => m.mastery);
      const mean = masteries.reduce((a, b) => a + b, 0) / masteries.length;
      const variance = masteries.reduce((s, m) => s + (m - mean) ** 2, 0) / masteries.length;

      if (variance < PLATEAU_VARIANCE && mean > 0.3 && mean < 0.8) {
        detected.push({
          id: `plateau-${childId}-${now}`,
          childId,
          type: 'mastery_plateau',
          confidence: 0.6,
          description: `Mastery plateau at ${mean.toFixed(2)} for ${recent[0]?.skillCode}`,
          evidence: { mean, variance, skillCode: recent[0]?.skillCode },
          detectedAt: now,
        });
      }
    }

    // 4. Tool preference: heavy use of certain tools
    if (snapshots.length > 0) {
      const allToolUsage: Record<string, number> = {};
      for (const snap of snapshots.slice(-10)) {
        for (const [tool, count] of Object.entries(snap.toolUsage)) {
          allToolUsage[tool] = (allToolUsage[tool] || 0) + count;
        }
      }
      const totalUses = Object.values(allToolUsage).reduce((a, b) => a + b, 0);
      if (totalUses > 10) {
        for (const [tool, count] of Object.entries(allToolUsage)) {
          const ratio = count / totalUses;
          if (ratio > 0.5) {
            detected.push({
              id: `tool-pref-${childId}-${tool}-${now}`,
              childId,
              type: 'tool_preference',
              confidence: ratio,
              description: `Strong preference for "${tool}" tool (${(ratio * 100).toFixed(0)}% of tool usage)`,
              evidence: { tool, count, totalUses, ratio },
              detectedAt: now,
            });
          }
        }
      }
    }

    // Store + emit
    if (detected.length > 0) {
      const existing = this.patterns.get(childId) || [];
      this.patterns.set(childId, [...existing, ...detected]);

      for (const pattern of detected) {
        getEventBus().emit('pattern.detected', {
          childId,
          patternType: pattern.type,
          description: pattern.description,
          confidence: pattern.confidence,
          timestamp: now,
        });
      }
    }

    return detected;
  }

  /** Get all detected patterns for a child. */
  getPatterns(childId: string): LearningPattern[] {
    return this.patterns.get(childId) || [];
  }

  reset(): void {
    this.patterns.clear();
    this.masteryHistory.clear();
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let _instance: PatternDetectorImpl | null = null;

export function getPatternDetector(): PatternDetectorImpl {
  if (!_instance) {
    _instance = new PatternDetectorImpl();
  }
  return _instance;
}

export function _resetPatternDetector(): void {
  _instance?.reset();
  _instance = null;
}
