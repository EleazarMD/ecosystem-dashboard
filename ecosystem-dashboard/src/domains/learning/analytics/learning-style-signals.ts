/**
 * Learning-Style Signal Collector — Phase 10.
 *
 * Infers learning-style signals from accumulated analytics snapshots and
 * raw attempt data, then writes them back to the LearnerProfile so the
 * planner and agent can adapt.
 *
 * Signals captured:
 * - **Pace**: fast / medium / slow (from average latency + accuracy)
 * - **Preferred modality**: visual / auditory / kinesthetic / reading / mixed
 *   (from tool usage patterns)
 * - **Session-length-before-fatigue**: estimated minutes before accuracy
 *   drops below 50% of session baseline
 * - **Reading level**: inferred from latency on reading-heavy skills vs math
 *
 * Contract: docs/LEARNING_PLATFORM_ROADMAP.md Phase 10
 */

import type { LearningSnapshot } from './analytics-types';
import type { LearnerProfile } from '../learner/learner-types';
import { getLearnerProfileService } from '../learner/learner-profile';

export interface LearningStyleSignals {
  pace: 'slow' | 'medium' | 'fast';
  preferredModality: 'visual' | 'auditory' | 'kinesthetic' | 'reading' | 'mixed';
  fatiguePointMinutes: number;
  readingLevel: 'below-grade' | 'at-grade' | 'above-grade';
  confidence: number;
  evidence: {
    avgLatencyMs: number;
    accuracyRate: number;
    topTools: string[];
    sessionCount: number;
  };
}

class LearningStyleSignalCollectorImpl {
  private signals = new Map<string, LearningStyleSignals>();

  /**
   * Analyze snapshots for a child and compute learning-style signals.
   * Returns the computed signals and optionally writes them to the profile.
   */
  analyze(
    childId: string,
    snapshots: LearningSnapshot[],
    options?: { writeToProfile?: boolean },
  ): LearningStyleSignals | null {
    if (snapshots.length === 0) return null;

    // Aggregate across snapshots
    let totalAttempts = 0;
    let totalCorrect = 0;
    let latencySum = 0;
    let latencyCount = 0;
    const toolUsage: Record<string, number> = {};
    let totalSessions = 0;
    let totalEngagement = 0;

    for (const snap of snapshots) {
      totalAttempts += snap.totalAttempts;
      totalCorrect += Math.round(snap.correctRate * snap.totalAttempts);
      if (snap.averageLatencyMs > 0) {
        latencySum += snap.averageLatencyMs * snap.totalAttempts;
        latencyCount += snap.totalAttempts;
      }
      for (const [tool, count] of Object.entries(snap.toolUsage)) {
        toolUsage[tool] = (toolUsage[tool] || 0) + count;
      }
      totalSessions += snap.totalSessions;
      totalEngagement += snap.engagementScore;
    }

    const avgLatencyMs = latencyCount > 0 ? latencySum / latencyCount : 0;
    const accuracyRate = totalAttempts > 0 ? totalCorrect / totalAttempts : 0.5;
    const topTools = Object.entries(toolUsage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([t]) => t);

    // ─── Pace inference ────────────────────────────────────────────────────
    // Fast: low latency (<8s) + high accuracy (>0.7)
    // Slow: high latency (>20s) or low accuracy (<0.4)
    // Medium: everything else
    let pace: LearningStyleSignals['pace'] = 'medium';
    if (avgLatencyMs > 0 && avgLatencyMs < 8000 && accuracyRate > 0.7) {
      pace = 'fast';
    } else if (avgLatencyMs > 20000 || accuracyRate < 0.4) {
      pace = 'slow';
    }

    // ─── Modality inference from tool usage ────────────────────────────────
    // Map tool IDs to modalities
    const modalityScores: Record<string, number> = {
      visual: 0, auditory: 0, kinesthetic: 0, reading: 0,
    };
    for (const [tool, count] of Object.entries(toolUsage)) {
      if (tool.includes('pokedex') || tool.includes('graph') || tool.includes('chart') || tool.includes('art')) {
        modalityScores.visual += count;
      }
      if (tool.includes('tutor') || tool.includes('chat') || tool.includes('voice') || tool.includes('read_aloud')) {
        modalityScores.auditory += count;
      }
      if (tool.includes('explore') || tool.includes('build') || tool.includes('team') || tool.includes('sort')) {
        modalityScores.kinesthetic += count;
      }
      if (tool.includes('reading') || tool.includes('writing') || tool.includes('journal') || tool.includes('book')) {
        modalityScores.reading += count;
      }
    }
    const maxModality = Math.max(...Object.values(modalityScores));
    let preferredModality: LearningStyleSignals['preferredModality'] = 'mixed';
    if (maxModality > 0) {
      const total = Object.values(modalityScores).reduce((a, b) => a + b, 0);
      if (total > 0) {
        const dominant = Object.entries(modalityScores).find(([, v]) => v === maxModality);
        if (dominant && maxModality / total > 0.4) {
          preferredModality = dominant[0] as LearningStyleSignals['preferredModality'];
        }
      }
    }

    // ─── Fatigue point inference ───────────────────────────────────────────
    // Estimate session length before fatigue based on:
    // - If accuracy drops in later snapshots (comparing first half vs second half)
    // - Default: 15 minutes for young children, 25 for older
    let fatiguePointMinutes = 20; // default
    if (snapshots.length >= 4) {
      const halfIdx = Math.floor(snapshots.length / 2);
      const firstHalf = snapshots.slice(0, halfIdx);
      const secondHalf = snapshots.slice(halfIdx);
      const firstAccuracy = avgAccuracy(firstHalf);
      const secondAccuracy = avgAccuracy(secondHalf);
      if (secondAccuracy < firstAccuracy * 0.7) {
        // Accuracy drops significantly → shorter fatigue point
        fatiguePointMinutes = 12;
      } else if (secondAccuracy >= firstAccuracy) {
        // Sustained performance → longer sessions OK
        fatiguePointMinutes = 30;
      }
    }

    // ─── Reading level inference ───────────────────────────────────────────
    // Compare latency on reading-heavy vs math-heavy skills
    // (simplified: if overall latency is high and accuracy is low, below-grade)
    let readingLevel: LearningStyleSignals['readingLevel'] = 'at-grade';
    if (accuracyRate < 0.4 && avgLatencyMs > 20000) {
      readingLevel = 'below-grade';
    } else if (accuracyRate > 0.8 && avgLatencyMs < 10000) {
      readingLevel = 'above-grade';
    }

    // ─── Confidence ─────────────────────────────────────────────────────────
    // More data → higher confidence
    const confidence = Math.min(1, totalAttempts / 50);

    const signals: LearningStyleSignals = {
      pace,
      preferredModality,
      fatiguePointMinutes,
      readingLevel,
      confidence,
      evidence: {
        avgLatencyMs,
        accuracyRate,
        topTools,
        sessionCount: totalSessions,
      },
    };

    this.signals.set(childId, signals);

    // Optionally write back to the learner profile
    if (options?.writeToProfile) {
      const profileService = getLearnerProfileService();
      const profile = profileService.get(childId);
      if (profile) {
        profile.preferredPacing = pace;
        profile.learningModality = preferredModality;
        profile.readingLevel = readingLevel;
        profile.attentionSpan = fatiguePointMinutes <= 12 ? 'short'
          : fatiguePointMinutes >= 25 ? 'long' : 'medium';
      }
    }

    return signals;
  }

  /** Get cached signals for a child. */
  get(childId: string): LearningStyleSignals | undefined {
    return this.signals.get(childId);
  }

  reset(): void {
    this.signals.clear();
  }
}

function avgAccuracy(snapshots: LearningSnapshot[]): number {
  if (snapshots.length === 0) return 0.5;
  const total = snapshots.reduce((sum, s) => sum + s.correctRate * s.totalAttempts, 0);
  const count = snapshots.reduce((sum, s) => sum + s.totalAttempts, 0);
  return count > 0 ? total / count : 0.5;
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let _instance: LearningStyleSignalCollectorImpl | null = null;

export function getLearningStyleSignalCollector(): LearningStyleSignalCollectorImpl {
  if (!_instance) {
    _instance = new LearningStyleSignalCollectorImpl();
  }
  return _instance;
}

export function _resetLearningStyleSignalCollector(): void {
  _instance?.reset();
  _instance = null;
}
