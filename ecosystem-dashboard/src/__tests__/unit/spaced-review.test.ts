import {
  computeReviewIntervalDays,
  computeNextReviewAt,
  buildScheduleEntry,
  buildReviewSchedule,
  selectSpacedReviewSkills,
  selectSpacedReviewWarmUp,
  BASE_INTERVAL_DAYS,
  MAX_INTERVAL_DAYS,
  MIN_INTERVAL_DAYS,
  SPACED_REVIEW_MIN_SCORE,
} from '@/domains/learning/processes/spaced-review';
import type { ChildSkillSummary, SkillProgress, ProficiencyLevel } from '@/domains/learning/entities/skill-graph';

const emergingLevel: ProficiencyLevel = {
  id: 'pl-1',
  code: 'emerging',
  name: 'Emerging',
  description: 'Beginning',
  levelOrder: 1,
  minScore: 0,
  maxScore: 0.49,
  color: '',
  icon: '',
  isMastery: false,
};

function makeSkill(over: Partial<SkillProgress> & { skillCode: string }): SkillProgress {
  return {
    skillId: `id-${over.skillCode}`,
    skillName: over.skillCode,
    domainCode: 'math',
    domainName: 'Math',
    currentScore: 0,
    proficiencyLevel: emergingLevel,
    trend: 'stable',
    assessmentsCount: 1,
    lastAssessmentDate: undefined,
    streakDays: 1,
    milestonesCompleted: 0,
    ...over,
  };
}

function makeSummary(skills: SkillProgress[]): ChildSkillSummary {
  return {
    childId: 'child-1',
    childName: 'Test Child',
    gradeLevel: '3',
    overallScore: 0.5,
    overallProficiency: 'Emerging',
    domains: [
      {
        domain: { id: 'd1', code: 'math', name: 'Math', description: '', icon: '', color: '' },
        avgScore: 0.5,
        proficiencyLevel: 'Emerging',
        skillsCount: skills.length,
        skillsProficient: 0,
        trend: 'stable',
        skills,
      },
    ],
    recentMilestones: [],
    recommendedActivities: [],
    curriculumSettings: {
      curriculumEnabled: false,
      showStandardCodes: false,
    },
  };
}

const NOW = new Date('2026-06-20T12:00:00Z').getTime();

describe('computeReviewIntervalDays', () => {
  it('returns base interval for a moderate score', () => {
    const interval = computeReviewIntervalDays(0.65, 1);
    expect(interval).toBe(BASE_INTERVAL_DAYS * 1);
  });

  it('expands interval for high scores', () => {
    const interval = computeReviewIntervalDays(0.9, 3);
    const base = BASE_INTERVAL_DAYS * 3;
    expect(interval).toBe(Math.round(base * 1.6));
  });

  it('contracts interval for low scores', () => {
    const interval = computeReviewIntervalDays(0.4, 4);
    const base = BASE_INTERVAL_DAYS * 4;
    expect(interval).toBe(Math.round(base * 0.5));
  });

  it('clamps to MAX_INTERVAL_DAYS', () => {
    const interval = computeReviewIntervalDays(1.0, 100);
    expect(interval).toBe(MAX_INTERVAL_DAYS);
  });

  it('clamps to MIN_INTERVAL_DAYS', () => {
    const interval = computeReviewIntervalDays(0.1, 0);
    expect(interval).toBeGreaterThanOrEqual(MIN_INTERVAL_DAYS);
  });
});

describe('computeNextReviewAt', () => {
  it('adds interval days to the last assessment date', () => {
    const lastAssessed = new Date('2026-06-18T12:00:00Z');
    const next = computeNextReviewAt(lastAssessed, 3);
    const expected = new Date('2026-06-21T12:00:00Z').getTime();
    expect(next).toBe(expected);
  });

  it('uses now when last assessment is null', () => {
    const realNow = Date.now;
    Date.now = jest.fn(() => NOW);
    try {
      const next = computeNextReviewAt(null, 2);
      const expected = NOW + 2 * 24 * 60 * 60 * 1000;
      expect(next).toBe(expected);
    } finally {
      Date.now = realNow;
    }
  });
});

describe('buildScheduleEntry', () => {
  it('marks a skill as overdue when nextReviewAt is in the past', () => {
    const skill = makeSkill({
      skillCode: 'math.add',
      currentScore: 0.7,
      assessmentsCount: 2,
      lastAssessmentDate: new Date('2026-06-01T12:00:00Z'),
      streakDays: 1,
    });

    const entry = buildScheduleEntry(skill, NOW);
    expect(entry.isOverdue).toBe(true);
    expect(entry.daysUntilReview).toBe(0);
  });

  it('marks a skill as not overdue when nextReviewAt is in the future', () => {
    const skill = makeSkill({
      skillCode: 'math.add',
      currentScore: 0.9,
      assessmentsCount: 1,
      lastAssessmentDate: new Date('2026-06-19T12:00:00Z'),
      streakDays: 1,
    });

    const entry = buildScheduleEntry(skill, NOW);
    expect(entry.isOverdue).toBe(false);
    expect(entry.daysUntilReview).toBeGreaterThan(0);
  });
});

describe('buildReviewSchedule', () => {
  it('excludes skills below SPACED_REVIEW_MIN_SCORE', () => {
    const summary = makeSummary([
      makeSkill({ skillCode: 'math.low', currentScore: 0.3, assessmentsCount: 2 }),
      makeSkill({ skillCode: 'math.ok', currentScore: 0.7, assessmentsCount: 2 }),
    ]);

    const schedule = buildReviewSchedule(summary, NOW);
    expect(schedule).toHaveLength(1);
    expect(schedule[0].skillCode).toBe('math.ok');
  });

  it('excludes skills with zero assessments', () => {
    const summary = makeSummary([
      makeSkill({ skillCode: 'math.new', currentScore: 0.8, assessmentsCount: 0 }),
      makeSkill({ skillCode: 'math.old', currentScore: 0.8, assessmentsCount: 3 }),
    ]);

    const schedule = buildReviewSchedule(summary, NOW);
    expect(schedule).toHaveLength(1);
    expect(schedule[0].skillCode).toBe('math.old');
  });

  it('sorts by nextReviewAt ascending (most due first)', () => {
    const summary = makeSummary([
      makeSkill({
        skillCode: 'math.recent',
        currentScore: 0.9,
        assessmentsCount: 1,
        lastAssessmentDate: new Date('2026-06-19T12:00:00Z'),
        streakDays: 1,
      }),
      makeSkill({
        skillCode: 'math.old',
        currentScore: 0.7,
        assessmentsCount: 1,
        lastAssessmentDate: new Date('2026-06-01T12:00:00Z'),
        streakDays: 1,
      }),
    ]);

    const schedule = buildReviewSchedule(summary, NOW);
    expect(schedule[0].skillCode).toBe('math.old');
    expect(schedule[1].skillCode).toBe('math.recent');
  });
});

describe('selectSpacedReviewSkills', () => {
  it('returns up to limit picks ordered by most due', () => {
    const summary = makeSummary([
      makeSkill({
        skillCode: 'math.a',
        currentScore: 0.7,
        assessmentsCount: 1,
        lastAssessmentDate: new Date('2026-06-01T12:00:00Z'),
        streakDays: 1,
      }),
      makeSkill({
        skillCode: 'math.b',
        currentScore: 0.7,
        assessmentsCount: 1,
        lastAssessmentDate: new Date('2026-06-10T12:00:00Z'),
        streakDays: 1,
      }),
      makeSkill({
        skillCode: 'math.c',
        currentScore: 0.7,
        assessmentsCount: 1,
        lastAssessmentDate: new Date('2026-06-15T12:00:00Z'),
        streakDays: 1,
      }),
    ]);

    const picks = selectSpacedReviewSkills(summary, 2, [], NOW);
    expect(picks).toHaveLength(2);
    expect(picks[0].skillCode).toBe('math.a');
    expect(picks[1].skillCode).toBe('math.b');
    expect(picks[0].kind).toBe('review');
  });

  it('excludes specified skill codes', () => {
    const summary = makeSummary([
      makeSkill({
        skillCode: 'math.a',
        currentScore: 0.7,
        assessmentsCount: 1,
        lastAssessmentDate: new Date('2026-06-01T12:00:00Z'),
        streakDays: 1,
      }),
      makeSkill({
        skillCode: 'math.b',
        currentScore: 0.7,
        assessmentsCount: 1,
        lastAssessmentDate: new Date('2026-06-10T12:00:00Z'),
        streakDays: 1,
      }),
    ]);

    const picks = selectSpacedReviewSkills(summary, 5, ['math.a'], NOW);
    expect(picks).toHaveLength(1);
    expect(picks[0].skillCode).toBe('math.b');
  });

  it('returns empty array on cold start (no assessments)', () => {
    const summary = makeSummary([
      makeSkill({ skillCode: 'math.new', currentScore: 0, assessmentsCount: 0 }),
    ]);

    const picks = selectSpacedReviewSkills(summary, 3, [], NOW);
    expect(picks).toHaveLength(0);
  });

  it('returns empty array when limit is 0', () => {
    const summary = makeSummary([
      makeSkill({ skillCode: 'math.a', currentScore: 0.7, assessmentsCount: 1 }),
    ]);

    const picks = selectSpacedReviewSkills(summary, 0, [], NOW);
    expect(picks).toHaveLength(0);
  });
});

describe('selectSpacedReviewWarmUp', () => {
  it('returns the single most overdue skill', () => {
    const summary = makeSummary([
      makeSkill({
        skillCode: 'math.recent',
        currentScore: 0.9,
        assessmentsCount: 1,
        lastAssessmentDate: new Date('2026-06-19T12:00:00Z'),
        streakDays: 1,
      }),
      makeSkill({
        skillCode: 'math.old',
        currentScore: 0.7,
        assessmentsCount: 1,
        lastAssessmentDate: new Date('2026-06-01T12:00:00Z'),
        streakDays: 1,
      }),
    ]);

    const pick = selectSpacedReviewWarmUp(summary, [], NOW);
    expect(pick).not.toBeNull();
    expect(pick!.skillCode).toBe('math.old');
    expect(pick!.kind).toBe('review');
  });

  it('returns null on cold start', () => {
    const summary = makeSummary([
      makeSkill({ skillCode: 'math.new', currentScore: 0, assessmentsCount: 0 }),
    ]);

    const pick = selectSpacedReviewWarmUp(summary, [], NOW);
    expect(pick).toBeNull();
  });

  it('returns null when all eligible skills are excluded', () => {
    const summary = makeSummary([
      makeSkill({
        skillCode: 'math.a',
        currentScore: 0.7,
        assessmentsCount: 1,
        lastAssessmentDate: new Date('2026-06-01T12:00:00Z'),
        streakDays: 1,
      }),
    ]);

    const pick = selectSpacedReviewWarmUp(summary, ['math.a'], NOW);
    expect(pick).toBeNull();
  });
});
