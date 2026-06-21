import {
  composePlan,
  composePlannedObjectives,
  composePlanWithNextObjectives,
  selectLowestScoreObjectives,
  selectReviewWarmUp,
} from '@/domains/learning/features/plan-generation';
import type {
  ChildSkillSummary,
  ProficiencyLevel,
  SkillProgress,
} from '@/domains/learning/entities/skill-graph';

function makeSkill(over: Partial<SkillProgress> & { skillCode: string }): SkillProgress {
  return {
    skillId: `id-${over.skillCode}`,
    skillName: over.skillCode,
    domainCode: 'math',
    domainName: 'Math',
    currentScore: 0,
    proficiencyLevel: { name: 'Emerging' } as ProficiencyLevel,
    trend: 'stable',
    assessmentsCount: 0,
    streakDays: 0,
    milestonesCompleted: 0,
    ...over,
  };
}

function summaryOf(skills: SkillProgress[]): ChildSkillSummary {
  return {
    childId: 'c1',
    childName: 'Kid',
    gradeLevel: '3',
    overallScore: 0,
    overallProficiency: 'Emerging',
    domains: [
      {
        domain: { id: 'd', code: 'math', name: 'Math', description: '', icon: '', color: '' },
        avgScore: 0,
        proficiencyLevel: 'Emerging',
        skillsCount: skills.length,
        skillsProficient: 0,
        trend: 'stable',
        skills,
      },
    ],
    recentMilestones: [],
    recommendedActivities: [],
    curriculumSettings: { curriculumEnabled: false, showStandardCodes: false },
  };
}

describe('selectLowestScoreObjectives', () => {
  it('orders by lowest score, then fewest assessments, then least-recent', () => {
    const summary = summaryOf([
      makeSkill({ skillCode: 'x', currentScore: 0.5, assessmentsCount: 5, lastAssessmentDate: new Date('2024-01-01') }),
      makeSkill({ skillCode: 'y', currentScore: 0.5, assessmentsCount: 2, lastAssessmentDate: new Date('2024-02-01') }),
      makeSkill({ skillCode: 'z', currentScore: 0.5, assessmentsCount: 2, lastAssessmentDate: new Date('2024-01-01') }),
      makeSkill({ skillCode: 'low', currentScore: 0.1, assessmentsCount: 9 }),
    ]);

    const objectives = selectLowestScoreObjectives(summary, 4);

    expect(objectives.map((o) => o.skillCode)).toEqual(['low', 'z', 'y', 'x']);
    expect(objectives.every((o) => o.kind === 'practice')).toBe(true);
  });

  it('respects the limit and returns nothing for a non-positive limit', () => {
    const summary = summaryOf([
      makeSkill({ skillCode: 'a', currentScore: 0.1 }),
      makeSkill({ skillCode: 'b', currentScore: 0.2 }),
    ]);

    expect(selectLowestScoreObjectives(summary, 1).map((o) => o.skillCode)).toEqual(['a']);
    expect(selectLowestScoreObjectives(summary, 0)).toEqual([]);
  });
});

describe('selectReviewWarmUp', () => {
  it('returns null on cold start (no prior assessments)', () => {
    const summary = summaryOf([
      makeSkill({ skillCode: 'a', currentScore: 0.8, assessmentsCount: 0 }),
      makeSkill({ skillCode: 'b', currentScore: 0.9, assessmentsCount: 0 }),
    ]);

    expect(selectReviewWarmUp(summary)).toBeNull();
  });

  it('returns null when no practiced skill clears the competence floor', () => {
    const summary = summaryOf([
      makeSkill({ skillCode: 'a', currentScore: 0.3, assessmentsCount: 4, lastAssessmentDate: new Date('2024-01-01') }),
    ]);

    expect(selectReviewWarmUp(summary)).toBeNull();
  });

  it('picks the least-recently-assessed competent skill', () => {
    const summary = summaryOf([
      makeSkill({ skillCode: 'recent', currentScore: 0.6, assessmentsCount: 3, lastAssessmentDate: new Date('2024-03-01') }),
      makeSkill({ skillCode: 'stale', currentScore: 0.7, assessmentsCount: 2, lastAssessmentDate: new Date('2024-01-01') }),
      makeSkill({ skillCode: 'weak', currentScore: 0.3, assessmentsCount: 5, lastAssessmentDate: new Date('2023-12-01') }),
    ]);

    const warmUp = selectReviewWarmUp(summary);

    expect(warmUp?.skillCode).toBe('stale');
    expect(warmUp?.kind).toBe('review');
  });

  it('excludes skills already chosen as focus objectives', () => {
    const summary = summaryOf([
      makeSkill({ skillCode: 'recent', currentScore: 0.6, assessmentsCount: 3, lastAssessmentDate: new Date('2024-03-01') }),
      makeSkill({ skillCode: 'stale', currentScore: 0.7, assessmentsCount: 2, lastAssessmentDate: new Date('2024-01-01') }),
    ]);

    expect(selectReviewWarmUp(summary, ['stale'])?.skillCode).toBe('recent');
  });

  it('breaks recency ties toward the weaker score', () => {
    const sameDay = new Date('2024-01-01');
    const summary = summaryOf([
      makeSkill({ skillCode: 'strong', currentScore: 0.9, assessmentsCount: 2, lastAssessmentDate: sameDay }),
      makeSkill({ skillCode: 'weaker', currentScore: 0.6, assessmentsCount: 2, lastAssessmentDate: sameDay }),
    ]);

    expect(selectReviewWarmUp(summary)?.skillCode).toBe('weaker');
  });
});

describe('composePlannedObjectives', () => {
  const skills = [
    makeSkill({ skillCode: 'low1', currentScore: 0.1, assessmentsCount: 1, lastAssessmentDate: new Date('2024-03-01') }),
    makeSkill({ skillCode: 'low2', currentScore: 0.2, assessmentsCount: 1, lastAssessmentDate: new Date('2024-03-01') }),
    makeSkill({ skillCode: 'low3', currentScore: 0.25, assessmentsCount: 1, lastAssessmentDate: new Date('2024-03-01') }),
    makeSkill({ skillCode: 'rev', currentScore: 0.7, assessmentsCount: 4, lastAssessmentDate: new Date('2023-01-01') }),
  ];

  it('leads with a spaced-review warm-up then lowest-score focus, capped to limit', () => {
    const objectives = composePlannedObjectives(summaryOf(skills), 3);

    expect(objectives.map((o) => o.skillCode)).toEqual(['rev', 'low1', 'low2']);
    expect(objectives.map((o) => o.kind)).toEqual(['review', 'practice', 'practice']);
  });

  it('keeps the warm-up first when trimming to a smaller limit', () => {
    const objectives = composePlannedObjectives(summaryOf(skills), 2);

    expect(objectives.map((o) => o.skillCode)).toEqual(['rev', 'low1']);
  });

  it('falls back to focus-only on cold start', () => {
    const cold = summaryOf([
      makeSkill({ skillCode: 'a', currentScore: 0.1, assessmentsCount: 0 }),
      makeSkill({ skillCode: 'b', currentScore: 0.2, assessmentsCount: 0 }),
    ]);

    const objectives = composePlannedObjectives(cold, 3);

    expect(objectives.map((o) => o.skillCode)).toEqual(['a', 'b']);
    expect(objectives.every((o) => o.kind === 'practice')).toBe(true);
  });

  it('returns nothing for a non-positive limit', () => {
    expect(composePlannedObjectives(summaryOf(skills), 0)).toEqual([]);
  });
});

describe('composePlanWithNextObjectives', () => {
  const summary = summaryOf([
    makeSkill({ skillCode: 'a', currentScore: 0.2, assessmentsCount: 1, lastAssessmentDate: new Date('2024-03-01') }),
    makeSkill({ skillCode: 'b', currentScore: 0.4, assessmentsCount: 1, lastAssessmentDate: new Date('2024-03-01') }),
    makeSkill({ skillCode: 'rev', currentScore: 0.7, assessmentsCount: 5, lastAssessmentDate: new Date('2023-01-01') }),
  ]);

  it('orders focus by the prereq-aware sequence (not by score) and leads with a review', () => {
    const objectives = composePlanWithNextObjectives(summary, ['b', 'a'], 3);

    expect(objectives.map((o) => o.skillCode)).toEqual(['rev', 'b', 'a']);
    expect(objectives.map((o) => o.kind)).toEqual(['review', 'practice', 'practice']);
  });

  it('synthesizes objectives for codes not present in the Postgres summary', () => {
    const objectives = composePlanWithNextObjectives(summaryOf([
      makeSkill({ skillCode: 'b', currentScore: 0.4, assessmentsCount: 1, lastAssessmentDate: new Date('2024-03-01') }),
    ]), ['x.new', 'b'], 3);

    expect(objectives.map((o) => o.skillCode)).toEqual(['x.new', 'b']);
    const synthesized = objectives.find((o) => o.skillCode === 'x.new');
    expect(synthesized).toMatchObject({ skillName: 'x.new', kind: 'practice', currentScore: 0 });
  });

  it('ignores blank/duplicate codes and trims to the limit', () => {
    const lowOnly = summaryOf([
      makeSkill({ skillCode: 'a', currentScore: 0.2, assessmentsCount: 1, lastAssessmentDate: new Date('2024-03-01') }),
      makeSkill({ skillCode: 'b', currentScore: 0.4, assessmentsCount: 1, lastAssessmentDate: new Date('2024-03-01') }),
    ]);

    expect(composePlanWithNextObjectives(lowOnly, ['b', '', '  ', 'b', 'a'], 1).map((o) => o.skillCode)).toEqual(['b']);
    expect(composePlanWithNextObjectives(lowOnly, ['a', 'a', 'b'], 5).map((o) => o.skillCode)).toEqual(['a', 'b']);
  });

  it('falls back to score-based composition when no usable codes are supplied', () => {
    expect(composePlanWithNextObjectives(summary, ['', '   '], 3)).toEqual(composePlannedObjectives(summary, 3));
  });

  it('works without a Postgres summary (synthesized focus, no warm-up)', () => {
    const objectives = composePlanWithNextObjectives(null, ['x', 'y'], 3);

    expect(objectives.map((o) => o.skillCode)).toEqual(['x', 'y']);
    expect(objectives.every((o) => o.kind === 'practice' && o.skillName === o.skillCode)).toBe(true);
  });

  it('returns nothing for a non-positive limit', () => {
    expect(composePlanWithNextObjectives(summary, ['a', 'b'], 0)).toEqual([]);
  });
});

describe('composePlan (parent assignments)', () => {
  it('leads with the warm-up, then tagged assignments, then focus', () => {
    const summary = summaryOf([
      makeSkill({ skillCode: 'asg', currentScore: 0.3, assessmentsCount: 1, lastAssessmentDate: new Date('2024-03-01') }),
      makeSkill({ skillCode: 'low1', currentScore: 0.1, assessmentsCount: 1, lastAssessmentDate: new Date('2024-03-01') }),
      makeSkill({ skillCode: 'low2', currentScore: 0.2, assessmentsCount: 1, lastAssessmentDate: new Date('2024-03-01') }),
      makeSkill({ skillCode: 'rev', currentScore: 0.7, assessmentsCount: 5, lastAssessmentDate: new Date('2024-01-01') }),
    ]);

    const plan = composePlan({ summary, assignmentSkillCodes: ['asg'], limit: 3 });

    expect(plan.map((o) => o.skillCode)).toEqual(['rev', 'asg', 'low1']);
    expect(plan.map((o) => o.kind)).toEqual(['review', 'practice', 'practice']);
    expect(plan[1].isAssignment).toBe(true);
    expect(plan[0].isAssignment).toBeFalsy();
    expect(plan[2].isAssignment).toBeFalsy();
  });

  it('lets parent assignments fill the plan and outrank the warm-up when numerous', () => {
    const summary = summaryOf([
      makeSkill({ skillCode: 'a1', currentScore: 0.3, assessmentsCount: 1, lastAssessmentDate: new Date('2024-03-01') }),
      makeSkill({ skillCode: 'a2', currentScore: 0.3, assessmentsCount: 1, lastAssessmentDate: new Date('2024-03-01') }),
      makeSkill({ skillCode: 'a3', currentScore: 0.3, assessmentsCount: 1, lastAssessmentDate: new Date('2024-03-01') }),
      makeSkill({ skillCode: 'rev', currentScore: 0.8, assessmentsCount: 5, lastAssessmentDate: new Date('2024-01-01') }),
    ]);

    const plan = composePlan({ summary, assignmentSkillCodes: ['a1', 'a2', 'a3'], limit: 3 });

    expect(plan.map((o) => o.skillCode)).toEqual(['a1', 'a2', 'a3']);
    expect(plan.every((o) => o.isAssignment)).toBe(true);
  });

  it('de-duplicates an assigned skill out of the focus list', () => {
    const summary = summaryOf([
      makeSkill({ skillCode: 'a', currentScore: 0.1, assessmentsCount: 1, lastAssessmentDate: new Date('2024-03-01') }),
      makeSkill({ skillCode: 'b', currentScore: 0.2, assessmentsCount: 1, lastAssessmentDate: new Date('2024-03-01') }),
    ]);

    const plan = composePlan({
      summary,
      assignmentSkillCodes: ['a'],
      nextObjectiveSkillCodes: ['a', 'b'],
      limit: 3,
    });

    expect(plan.map((o) => o.skillCode)).toEqual(['a', 'b']);
    expect(plan.filter((o) => o.skillCode === 'a')).toHaveLength(1);
    expect(plan[0].isAssignment).toBe(true);
    expect(plan[1].isAssignment).toBeFalsy();
  });

  it('synthesizes and tags assigned skills absent from the Postgres summary', () => {
    const plan = composePlan({ summary: null, assignmentSkillCodes: ['new.skill'], limit: 3 });

    expect(plan.map((o) => o.skillCode)).toEqual(['new.skill']);
    expect(plan[0].isAssignment).toBe(true);
    expect(plan[0].skillName).toBe('new.skill');
    expect(plan[0].kind).toBe('practice');
  });

  it('keeps the prereq-aware focus and warm-up when there are no assignments', () => {
    const summary = summaryOf([
      makeSkill({ skillCode: 'a', currentScore: 0.2, assessmentsCount: 1, lastAssessmentDate: new Date('2024-03-01') }),
      makeSkill({ skillCode: 'b', currentScore: 0.4, assessmentsCount: 1, lastAssessmentDate: new Date('2024-03-01') }),
      makeSkill({ skillCode: 'rev', currentScore: 0.7, assessmentsCount: 5, lastAssessmentDate: new Date('2024-01-01') }),
    ]);

    const plan = composePlan({ summary, nextObjectiveSkillCodes: ['b', 'a'], limit: 3 });

    expect(plan.map((o) => o.skillCode)).toEqual(['rev', 'b', 'a']);
    expect(plan.some((o) => o.isAssignment)).toBe(false);
  });

  it('returns nothing for a non-positive limit even with assignments', () => {
    const summary = summaryOf([makeSkill({ skillCode: 'a', currentScore: 0.1 })]);

    expect(composePlan({ summary, assignmentSkillCodes: ['a'], limit: 0 })).toEqual([]);
  });
});
