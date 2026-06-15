import {
  composePlannedObjectives,
  selectLowestScoreObjectives,
  selectReviewWarmUp,
} from '@/lib/kids-pic/learning-planner';
import type {
  ChildSkillSummary,
  ProficiencyLevel,
  SkillProgress,
} from '@/lib/kids-pic/SkillProgressService';

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
