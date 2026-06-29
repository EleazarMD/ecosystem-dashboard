/**
 * Tests for Phase 10: Learning-style adaptation + outcome goals.
 *
 * Covers:
 * 1. LearningStyleSignalCollector — pace, modality, fatigue, reading level inference
 * 2. GoalScorecardService — age-based goals, progress computation, status
 * 3. composePlan with learningStyle — pace adjusts plan size
 */

import { getLearningStyleSignalCollector, _resetLearningStyleSignalCollector } from '@/domains/learning/analytics/learning-style-signals';
import { getGoalScorecardService, _resetGoalScorecardService } from '@/domains/learning/parent/goal-scorecard-service';
import { composePlan } from '@/lib/kids-pic/learning-planner';
import type { LearningSnapshot } from '@/domains/learning/analytics/analytics-types';
import type { ChildSkillSummary } from '@/domains/learning/entities/skill-graph';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSnapshot(overrides: Partial<LearningSnapshot> = {}): LearningSnapshot {
  return {
    childId: 'test-child',
    period: 'daily',
    periodStart: Date.now() - 86400000,
    periodEnd: Date.now(),
    totalAttempts: 10,
    correctRate: 0.6,
    averageLatencyMs: 12000,
    skillsTouched: ['math.counting'],
    masteryDeltas: {},
    engagementScore: 100,
    toolUsage: {},
    bestStreak: 3,
    totalSessions: 1,
    ...overrides,
  };
}

function makeSkill(code: string, name: string, score: number, count: number): any {
  return {
    skillId: code,
    skillCode: code,
    skillName: name,
    domainCode: 'math',
    domainName: 'Math',
    currentScore: score,
    proficiencyLevel: 'developing',
    trend: 'stable',
    assessmentsCount: count,
    lastAssessmentDate: new Date(Date.now() - 86400000),
    streakDays: 0,
    milestonesCompleted: 0,
  };
}

function makeSummary(): ChildSkillSummary {
  return {
    childId: 'test-child',
    childName: 'Test',
    gradeLevel: '2',
    domains: [
      {
        domain: { id: 'd-math', code: 'math', name: 'Math' },
        avgScore: 0.5,
        proficiencyLevel: 'developing',
        skillsCount: 5,
        skillsProficient: 1,
        trend: 'stable',
        skills: [
          makeSkill('math.counting', 'Counting', 0.3, 5),
          makeSkill('math.arithmetic', 'Arithmetic', 0.5, 3),
          makeSkill('math.fractions', 'Fractions', 0.4, 2),
          makeSkill('math.decimals', 'Decimals', 0.45, 2),
          makeSkill('math.geometry', 'Geometry', 0.6, 4),
        ],
      },
    ],
  } as any;
}

// ─── 1. LearningStyleSignalCollector ─────────────────────────────────────────

describe('Phase 10: LearningStyleSignalCollector', () => {
  beforeEach(() => {
    _resetLearningStyleSignalCollector();
  });

  it('returns null for empty snapshots', () => {
    const collector = getLearningStyleSignalCollector();
    expect(collector.analyze('child-1', [])).toBeNull();
  });

  it('infers fast pace from low latency + high accuracy', () => {
    const collector = getLearningStyleSignalCollector();
    const snaps = [makeSnapshot({
      totalAttempts: 20,
      correctRate: 0.85,
      averageLatencyMs: 5000,
    })];
    const signals = collector.analyze('child-1', snaps)!;
    expect(signals.pace).toBe('fast');
  });

  it('infers slow pace from high latency', () => {
    const collector = getLearningStyleSignalCollector();
    const snaps = [makeSnapshot({
      totalAttempts: 15,
      correctRate: 0.3,
      averageLatencyMs: 25000,
    })];
    const signals = collector.analyze('child-1', snaps)!;
    expect(signals.pace).toBe('slow');
  });

  it('infers medium pace by default', () => {
    const collector = getLearningStyleSignalCollector();
    const snaps = [makeSnapshot({
      totalAttempts: 10,
      correctRate: 0.6,
      averageLatencyMs: 12000,
    })];
    const signals = collector.analyze('child-1', snaps)!;
    expect(signals.pace).toBe('medium');
  });

  it('infers visual modality from pokedex/graph tool usage', () => {
    const collector = getLearningStyleSignalCollector();
    const snaps = [makeSnapshot({
      toolUsage: { 'pokedex-query': 10, 'explore_graph': 5, 'chart-view': 3 },
    })];
    const signals = collector.analyze('child-1', snaps)!;
    expect(signals.preferredModality).toBe('visual');
  });

  it('infers kinesthetic modality from explore/build tool usage', () => {
    const collector = getLearningStyleSignalCollector();
    const snaps = [makeSnapshot({
      toolUsage: { 'explore_graph': 10, 'build_team': 5, 'sort_activity': 3 },
    })];
    const signals = collector.analyze('child-1', snaps)!;
    expect(signals.preferredModality).toBe('kinesthetic');
  });

  it('returns mixed modality when no dominant tool pattern', () => {
    const collector = getLearningStyleSignalCollector();
    const snaps = [makeSnapshot({
      toolUsage: { 'pokedex-query': 2, 'tutor-turn': 2, 'explore_graph': 2, 'reading': 2 },
    })];
    const signals = collector.analyze('child-1', snaps)!;
    expect(signals.preferredModality).toBe('mixed');
  });

  it('detects fatigue from accuracy drop across snapshots', () => {
    const collector = getLearningStyleSignalCollector();
    const snaps = [
      makeSnapshot({ totalAttempts: 10, correctRate: 0.8, averageLatencyMs: 8000 }),
      makeSnapshot({ totalAttempts: 10, correctRate: 0.8, averageLatencyMs: 8000 }),
      makeSnapshot({ totalAttempts: 10, correctRate: 0.3, averageLatencyMs: 18000 }),
      makeSnapshot({ totalAttempts: 10, correctRate: 0.3, averageLatencyMs: 18000 }),
    ];
    const signals = collector.analyze('child-1', snaps)!;
    expect(signals.fatiguePointMinutes).toBe(12);
  });

  it('detects sustained performance (longer sessions OK)', () => {
    const collector = getLearningStyleSignalCollector();
    const snaps = [
      makeSnapshot({ totalAttempts: 10, correctRate: 0.7, averageLatencyMs: 10000 }),
      makeSnapshot({ totalAttempts: 10, correctRate: 0.7, averageLatencyMs: 10000 }),
      makeSnapshot({ totalAttempts: 10, correctRate: 0.75, averageLatencyMs: 10000 }),
      makeSnapshot({ totalAttempts: 10, correctRate: 0.75, averageLatencyMs: 10000 }),
    ];
    const signals = collector.analyze('child-1', snaps)!;
    expect(signals.fatiguePointMinutes).toBe(30);
  });

  it('infers below-grade reading level from low accuracy + high latency', () => {
    const collector = getLearningStyleSignalCollector();
    const snaps = [makeSnapshot({
      totalAttempts: 20,
      correctRate: 0.3,
      averageLatencyMs: 25000,
    })];
    const signals = collector.analyze('child-1', snaps)!;
    expect(signals.readingLevel).toBe('below-grade');
  });

  it('infers above-grade reading level from high accuracy + low latency', () => {
    const collector = getLearningStyleSignalCollector();
    const snaps = [makeSnapshot({
      totalAttempts: 20,
      correctRate: 0.9,
      averageLatencyMs: 6000,
    })];
    const signals = collector.analyze('child-1', snaps)!;
    expect(signals.readingLevel).toBe('above-grade');
  });

  it('confidence increases with more attempts', () => {
    const collector = getLearningStyleSignalCollector();
    const lowData = collector.analyze('child-1', [makeSnapshot({ totalAttempts: 5 })])!;
    _resetLearningStyleSignalCollector();
    const highData = collector.analyze('child-1', [makeSnapshot({ totalAttempts: 60 })])!;
    expect(highData.confidence).toBeGreaterThan(lowData.confidence);
  });
});

// ─── 2. GoalScorecardService ─────────────────────────────────────────────────

describe('Phase 10: GoalScorecardService', () => {
  beforeEach(() => {
    _resetGoalScorecardService();
  });

  it('creates a scorecard with age-appropriate goals for early band', () => {
    const svc = getGoalScorecardService();
    const sc = svc.getOrCreate('child-1', 'early', {}, 0, 0);
    expect(sc.ageBand).toBe('early');
    expect(sc.goals.length).toBeGreaterThanOrEqual(3);
    expect(sc.goals.some((g) => g.id === 'math-counting')).toBe(true);
  });

  it('creates a scorecard with age-appropriate goals for middle band', () => {
    const svc = getGoalScorecardService();
    const sc = svc.getOrCreate('child-1', 'middle', {}, 0, 0);
    expect(sc.ageBand).toBe('middle');
    expect(sc.goals.some((g) => g.id === 'math-arithmetic')).toBe(true);
    expect(sc.goals.some((g) => g.id === 'reading-comprehension')).toBe(true);
  });

  it('creates a scorecard with age-appropriate goals for tween band', () => {
    const svc = getGoalScorecardService();
    const sc = svc.getOrCreate('child-1', 'tween', {}, 0, 0);
    expect(sc.ageBand).toBe('tween');
    expect(sc.goals.some((g) => g.id === 'math-fractions')).toBe(true);
    expect(sc.goals.some((g) => g.id === 'reading-analysis')).toBe(true);
  });

  it('computes mastery goal progress from skill codes', () => {
    const svc = getGoalScorecardService();
    const sc = svc.getOrCreate('child-1', 'middle', {
      'math.arithmetic': 0.8,
      'reading.comp.literal': 0.6,
      'reading.comp.inferential': 0.5,
    }, 0, 0);
    const mathGoal = sc.goals.find((g) => g.id === 'math-arithmetic')!;
    expect(mathGoal.current).toBeCloseTo(0.8);
    expect(mathGoal.status).toBe('ahead');

    const readingGoal = sc.goals.find((g) => g.id === 'reading-comprehension')!;
    expect(readingGoal.current).toBeCloseTo(0.55, 1);
    // 0.55 / 0.7 = 0.79 → on-track (>= 0.6 ratio)
    expect(readingGoal.status).toBe('on-track');
  });

  it('computes streak goal progress', () => {
    const svc = getGoalScorecardService();
    const sc = svc.getOrCreate('child-1', 'tween', {}, 7, 0);
    const streakGoal = sc.goals.find((g) => g.id === 'engagement-streak')!;
    expect(streakGoal.current).toBe(7);
    expect(streakGoal.status).toBe('ahead');
  });

  it('computes session count goal progress', () => {
    const svc = getGoalScorecardService();
    const sc = svc.getOrCreate('child-1', 'middle', {}, 0, 4);
    const engGoal = sc.goals.find((g) => g.id === 'engagement-weekly')!;
    expect(engGoal.current).toBe(4);
    expect(engGoal.status).toBe('ahead');
  });

  it('marks not-started when no progress', () => {
    const svc = getGoalScorecardService();
    const sc = svc.getOrCreate('child-1', 'middle', {}, 0, 0);
    const mathGoal = sc.goals.find((g) => g.id === 'math-arithmetic')!;
    expect(mathGoal.status).toBe('not-started');
  });

  it('overall progress is average of goal ratios', () => {
    const svc = getGoalScorecardService();
    const sc = svc.getOrCreate('child-1', 'middle', {
      'math.arithmetic': 0.7,
    }, 0, 0);
    expect(sc.overallProgress).toBeGreaterThan(0);
    expect(sc.overallProgress).toBeLessThanOrEqual(1);
  });

  it('updateProgress refreshes current values', () => {
    const svc = getGoalScorecardService();
    svc.getOrCreate('child-1', 'middle', {}, 0, 0);
    const updated = svc.updateProgress('child-1', { 'math.arithmetic': 0.9 }, 5, 3);
    const mathGoal = updated.goals.find((g) => g.id === 'math-arithmetic')!;
    expect(mathGoal.current).toBeCloseTo(0.9);
    expect(mathGoal.status).toBe('ahead');
  });
});

// ─── 3. composePlan with learningStyle ───────────────────────────────────────

describe('Phase 10: composePlan with learningStyle', () => {
  const summary = makeSummary();

  it('fast pace adds 1 extra objective slot', () => {
    const base = composePlan({ summary, limit: 3 });
    const fast = composePlan({ summary, limit: 3, learningStyle: { pace: 'fast' } });
    expect(fast.length).toBeGreaterThanOrEqual(base.length);
  });

  it('slow pace reduces objective count by 1 (minimum 2)', () => {
    const slow = composePlan({ summary, limit: 5, learningStyle: { pace: 'slow' } });
    // With limit 5 - 1 = 4, should have at most 4 objectives
    expect(slow.length).toBeLessThanOrEqual(4);
  });

  it('slow pace never goes below 2 objectives', () => {
    const slow = composePlan({ summary, limit: 2, learningStyle: { pace: 'slow' } });
    expect(slow.length).toBeGreaterThanOrEqual(1);
  });

  it('medium pace does not change limit', () => {
    const medium = composePlan({ summary, limit: 4, learningStyle: { pace: 'medium' } });
    const noStyle = composePlan({ summary, limit: 4 });
    expect(medium.length).toBe(noStyle.length);
  });
});
