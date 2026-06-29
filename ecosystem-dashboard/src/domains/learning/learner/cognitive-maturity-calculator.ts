/**
 * Cognitive Maturity Calculator — derives a holistic cognitive maturity
 * score and level from the child's performance data (mastery scores,
 * attempt history, streaks, and struggle patterns).
 *
 * This is NOT a fixed IQ measure — it's a dynamic, performance-based
 * estimate of how ready the child is for more complex material RIGHT NOW.
 * It feeds into the DevelopmentalProfile that the agentic harness uses
 * to adapt LLM system prompts.
 *
 * Contract: docs/KIDS_PLATFORM_CONTRACTS.md §3 (Context) extension
 */

import { getMasteryCalculator } from './mastery-calculator';
import { getLearnerMemory } from './learner-memory';
import {
  type CognitiveLevel,
  masteryToCognitiveLevel,
  deriveAttentionSpan,
} from './developmental-profile';

export interface CognitiveMaturityResult {
  /** Overall cognitive maturity score 0–1. */
  score: number;
  /** Discrete cognitive level. */
  level: CognitiveLevel;
  /** Average mastery across all skills. */
  averageMastery: number;
  /** Number of skills tracked. */
  skillsTracked: number;
  /** Recent accuracy (last N attempts). */
  recentAccuracy: number;
  /** Current streak of correct answers. */
  currentStreak: number;
  /** Total attempts recorded. */
  totalAttempts: number;
  /** Estimated attention span. */
  attentionSpan: 'short' | 'medium' | 'long';
  /** Skills the child is struggling with. */
  strugglingSkills: string[];
  /** Skills the child is excelling at. */
  strongSkills: string[];
}

class CognitiveMaturityCalculatorImpl {
  /**
   * Compute cognitive maturity for a child.
   *
   * Algorithm:
   * 1. Aggregate mastery scores across all skills (weighted EMA).
   * 2. Factor in recent accuracy from session journal.
   * 3. Factor in streak momentum (bonus for sustained correct).
   * 4. Penalize for broad struggle patterns (many skills below 0.3).
   * 5. Derive attention span from age + performance.
   *
   * @param childId  The child's unique ID.
   * @param age      The child's chronological age (for attention span).
   */
  compute(childId: string, age: number): CognitiveMaturityResult {
    const masteryMap = getMasteryCalculator().getAll(childId);
    const skillCodes = Object.keys(masteryMap);

    // Average mastery
    const masteryValues = Object.values(masteryMap);
    const averageMastery = masteryValues.length > 0
      ? masteryValues.reduce((a, b) => a + b, 0) / masteryValues.length
      : 0.5; // default to uncertain

    // Recent accuracy from journal (last 20 attempts)
    const journal = getLearnerMemory().getJournal(childId, 10);
    const recentAttempts = journal.reduce(
      (sum, e) => sum + e.totalAttempts,
      0,
    );
    const recentCorrect = journal.reduce(
      (sum, e) => sum + e.correctCount,
      0,
    );
    const recentAccuracy = recentAttempts > 0
      ? recentCorrect / recentAttempts
      : averageMastery;

    // Current streak (from most recent journal entry)
    const currentStreak = journal.length > 0
      ? journal[0].bestStreak
      : 0;

    // Total attempts
    const totalAttempts = recentAttempts;

    // Struggling / strong skills
    const strugglingSkills = skillCodes
      .filter((s) => masteryMap[s] < 0.3)
      .sort((a, b) => masteryMap[a] - masteryMap[b]);
    const strongSkills = skillCodes
      .filter((s) => masteryMap[s] >= 0.75)
      .sort((a, b) => masteryMap[b] - masteryMap[a]);

    // ─── Composite cognitive maturity score ────────────────────────────────
    //
    // Weighted blend:
    //   50% — average mastery (what they know)
    //   30% — recent accuracy (how they're doing right now)
    //   10% — streak momentum (sustained performance)
    //   10% — breadth penalty (struggling across many skills lowers score)
    //
    let score = 0.5 * averageMastery + 0.3 * recentAccuracy;

    // Streak momentum: +0.02 per streak item, capped at 0.10
    const streakBonus = Math.min(0.10, currentStreak * 0.02);
    score += 0.10 * streakBonus;

    // Breadth penalty: if >50% of skills are struggling, reduce score
    if (skillCodes.length > 0) {
      const struggleRatio = strugglingSkills.length / skillCodes.length;
      if (struggleRatio > 0.5) {
        score -= 0.10 * (struggleRatio - 0.5);
      }
    }

    // Clamp to [0, 1]
    score = Math.max(0, Math.min(1, score));

    const level = masteryToCognitiveLevel(score);
    const attentionSpan = deriveAttentionSpan(age, averageMastery);

    return {
      score,
      level,
      averageMastery,
      skillsTracked: skillCodes.length,
      recentAccuracy,
      currentStreak,
      totalAttempts,
      attentionSpan,
      strugglingSkills: strugglingSkills.slice(0, 5),
      strongSkills: strongSkills.slice(0, 5),
    };
  }

  reset(): void {
    // Stateless — relies on mastery calculator and learner memory
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let _instance: CognitiveMaturityCalculatorImpl | null = null;

export function getCognitiveMaturityCalculator(): CognitiveMaturityCalculatorImpl {
  if (!_instance) {
    _instance = new CognitiveMaturityCalculatorImpl();
  }
  return _instance;
}

export function _resetCognitiveMaturityCalculator(): void {
  _instance?.reset();
  _instance = null;
}
