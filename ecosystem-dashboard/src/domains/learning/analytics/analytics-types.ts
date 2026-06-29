/**
 * Analytics Types — snapshots, patterns, and dream insights.
 *
 * Contract: docs/MODULAR_ARCHITECTURE.md §5 (Analytics + Dreams)
 */

export type AnalyticsPeriod = 'daily' | 'weekly' | 'monthly';

export interface LearningSnapshot {
  childId: string;
  period: AnalyticsPeriod;
  periodStart: number;       // timestamp
  periodEnd: number;
  totalAttempts: number;
  correctRate: number;
  averageLatencyMs: number;
  skillsTouched: string[];
  masteryDeltas: Record<string, number>;
  engagementScore: number;   // time × attempts × completion
  toolUsage: Record<string, number>;
  bestStreak: number;
  totalSessions: number;
}

export type PatternType =
  | 'time_preference'        // learns best at certain hours
  | 'skill_cluster'          // strengths in related skills
  | 'struggle_pattern'       // consistent difficulty with a concept
  | 'engagement_cycle'       // engagement waxes/wanes on a cycle
  | 'tool_preference'        // prefers certain tools/activities
  | 'mastery_plateau'        // stuck at a mastery level
  | 'breakthrough_signal';   // sudden improvement after struggle

export interface LearningPattern {
  id: string;
  childId: string;
  type: PatternType;
  confidence: number;        // 0-1
  description: string;
  evidence: Record<string, unknown>;
  detectedAt: number;
}

export interface DreamInsight {
  id: string;
  childId: string;
  insight: string;
  actionable: boolean;
  suggestedActions: string[];
  confidence: number;
  consolidatedAt: number;
}

// ─── Factories ──────────────────────────────────────────────────────────────

export function createSnapshot(
  childId: string,
  period: AnalyticsPeriod,
  data: Partial<LearningSnapshot>,
): LearningSnapshot {
  const now = Date.now();
  return {
    childId,
    period,
    periodStart: now,
    periodEnd: now,
    totalAttempts: 0,
    correctRate: 0,
    averageLatencyMs: 0,
    skillsTouched: [],
    masteryDeltas: {},
    engagementScore: 0,
    toolUsage: {},
    bestStreak: 0,
    totalSessions: 0,
    ...data,
  };
}
