import {
  compareMastery,
  syncMasteryToPostgres,
  runMasterySync,
  SYNC_SCORE_TOLERANCE,
  SYNC_SOURCE_TYPE,
  type KidsPcgMasteryResult,
  type KidsPcgMasteryFetcher,
  type PostgresMasteryPort,
  type MasteryDiscrepancy,
} from '@/domains/learning/processes/mastery-sync';
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
    childName: 'Test',
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
    curriculumSettings: { curriculumEnabled: false, showStandardCodes: false },
  };
}

function makePcgResult(skills: Array<{ skillCode: string; masteryScore: number; isMastered?: boolean; lastEvidenceAt?: string }>): KidsPcgMasteryResult {
  return {
    childId: 'child-1',
    skills: skills.map((s) => ({
      skillCode: s.skillCode,
      masteryScore: s.masteryScore,
      isMastered: s.isMastered ?? s.masteryScore >= 0.7,
      lastEvidenceAt: s.lastEvidenceAt,
    })),
  };
}

describe('compareMastery', () => {
  it('returns empty array when both stores are empty', () => {
    const pcg = makePcgResult([]);
    const discrepancies = compareMastery(pcg, null);
    expect(discrepancies).toHaveLength(0);
  });

  it('returns empty array when scores are within tolerance', () => {
    const pcg = makePcgResult([{ skillCode: 'math.add', masteryScore: 0.8 }]);
    const pg = makeSummary([makeSkill({ skillCode: 'math.add', currentScore: 0.78 })]);
    const discrepancies = compareMastery(pcg, pg);
    expect(discrepancies).toHaveLength(0);
  });

  it('flags discrepancy when kids-pcg score is higher', () => {
    const pcg = makePcgResult([{ skillCode: 'math.add', masteryScore: 0.9 }]);
    const pg = makeSummary([makeSkill({ skillCode: 'math.add', currentScore: 0.5 })]);
    const discrepancies = compareMastery(pcg, pg);
    expect(discrepancies).toHaveLength(1);
    expect(discrepancies[0].direction).toBe('pcg_higher');
    expect(discrepancies[0].masteryMismatch).toBe(true);
  });

  it('flags discrepancy when Postgres score is higher', () => {
    const pcg = makePcgResult([{ skillCode: 'math.add', masteryScore: 0.3 }]);
    const pg = makeSummary([makeSkill({ skillCode: 'math.add', currentScore: 0.8 })]);
    const discrepancies = compareMastery(pcg, pg);
    expect(discrepancies).toHaveLength(1);
    expect(discrepancies[0].direction).toBe('postgres_higher');
  });

  it('treats missing Postgres skill as score 0', () => {
    const pcg = makePcgResult([{ skillCode: 'math.new', masteryScore: 0.7 }]);
    const pg = makeSummary([]);
    const discrepancies = compareMastery(pcg, pg);
    expect(discrepancies).toHaveLength(1);
    expect(discrepancies[0].postgresScore).toBe(0);
  });

  it('sorts by largest delta first', () => {
    const pcg = makePcgResult([
      { skillCode: 'math.a', masteryScore: 0.6 },
      { skillCode: 'math.b', masteryScore: 0.9 },
    ]);
    const pg = makeSummary([
      makeSkill({ skillCode: 'math.a', currentScore: 0.5 }),
      makeSkill({ skillCode: 'math.b', currentScore: 0.1 }),
    ]);
    const discrepancies = compareMastery(pcg, pg);
    expect(discrepancies[0].skillCode).toBe('math.b');
    expect(discrepancies[1].skillCode).toBe('math.a');
  });

  it('detects mastery mismatch when pcg mastered but postgres not', () => {
    const pcg = makePcgResult([{ skillCode: 'math.add', masteryScore: 0.75, isMastered: true }]);
    const pg = makeSummary([makeSkill({ skillCode: 'math.add', currentScore: 0.65 })]);
    const discrepancies = compareMastery(pcg, pg);
    expect(discrepancies[0].masteryMismatch).toBe(true);
  });
});

describe('syncMasteryToPostgres', () => {
  function makeMockPort(overrides?: Partial<PostgresMasteryPort>): PostgresMasteryPort {
    return {
      fetchSummary: jest.fn(async () => null),
      recordAssessment: jest.fn(async () => {}),
      ...overrides,
    };
  }

  it('syncs skills where kids-pcg is higher', async () => {
    const discrepancies: MasteryDiscrepancy[] = [
      {
        skillCode: 'math.add',
        skillName: 'Addition',
        pcgScore: 0.9,
        postgresScore: 0.5,
        delta: 0.4,
        masteryMismatch: true,
        direction: 'pcg_higher',
      },
    ];
    const port = makeMockPort();
    const results = await syncMasteryToPostgres('child-1', discrepancies, port);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('synced');
    expect(port.recordAssessment).toHaveBeenCalledWith({
      childId: 'child-1',
      skillCode: 'math.add',
      score: 0.9,
      sourceType: SYNC_SOURCE_TYPE,
    });
  });

  it('skips skills where Postgres is higher', async () => {
    const discrepancies: MasteryDiscrepancy[] = [
      {
        skillCode: 'math.add',
        skillName: 'Addition',
        pcgScore: 0.3,
        postgresScore: 0.8,
        delta: 0.5,
        masteryMismatch: true,
        direction: 'postgres_higher',
      },
    ];
    const port = makeMockPort();
    const results = await syncMasteryToPostgres('child-1', discrepancies, port);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('skipped');
    expect(port.recordAssessment).not.toHaveBeenCalled();
  });

  it('records failed syncs with error detail', async () => {
    const discrepancies: MasteryDiscrepancy[] = [
      {
        skillCode: 'math.add',
        skillName: 'Addition',
        pcgScore: 0.9,
        postgresScore: 0.5,
        delta: 0.4,
        masteryMismatch: true,
        direction: 'pcg_higher',
      },
    ];
    const port = makeMockPort({
      recordAssessment: jest.fn(async () => { throw new Error('DB connection lost'); }),
    });
    const results = await syncMasteryToPostgres('child-1', discrepancies, port);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('failed');
    expect(results[0].detail).toBe('DB connection lost');
  });
});

describe('runMasterySync', () => {
  it('produces a full sync report with in-sync count', async () => {
    const pcgFetcher: KidsPcgMasteryFetcher = {
      fetch: jest.fn(async () => makePcgResult([
        { skillCode: 'math.synced', masteryScore: 0.8 },
        { skillCode: 'math.diverged', masteryScore: 0.9 },
      ])),
    };
    const postgresPort: PostgresMasteryPort = {
      fetchSummary: jest.fn(async () => makeSummary([
        makeSkill({ skillCode: 'math.synced', currentScore: 0.79 }),
        makeSkill({ skillCode: 'math.diverged', currentScore: 0.4 }),
      ])),
      recordAssessment: jest.fn(async () => {}),
    };

    const report = await runMasterySync('child-1', pcgFetcher, postgresPort);

    expect(report.childId).toBe('child-1');
    expect(report.totalCompared).toBe(2);
    expect(report.inSync).toBe(1);
    expect(report.discrepancies).toHaveLength(1);
    expect(report.discrepancies[0].skillCode).toBe('math.diverged');
    expect(report.syncedToPostgres).toHaveLength(1);
    expect(report.failedSyncs).toHaveLength(0);
    expect(report.success).toBe(true);
  });

  it('reports failure when some syncs fail', async () => {
    const pcgFetcher: KidsPcgMasteryFetcher = {
      fetch: jest.fn(async () => makePcgResult([
        { skillCode: 'math.a', masteryScore: 0.9 },
        { skillCode: 'math.b', masteryScore: 0.9 },
      ])),
    };
    const postgresPort: PostgresMasteryPort = {
      fetchSummary: jest.fn(async () => makeSummary([
        makeSkill({ skillCode: 'math.a', currentScore: 0.3 }),
        makeSkill({ skillCode: 'math.b', currentScore: 0.3 }),
      ])),
      recordAssessment: jest.fn(async (input) => {
        if (input.skillCode === 'math.b') throw new Error('write failed');
      }),
    };

    const report = await runMasterySync('child-1', pcgFetcher, postgresPort);

    expect(report.success).toBe(false);
    expect(report.failedSyncs).toHaveLength(1);
    expect(report.failedSyncs[0].skillCode).toBe('math.b');
  });

  it('handles empty kids-pcg result gracefully', async () => {
    const pcgFetcher: KidsPcgMasteryFetcher = {
      fetch: jest.fn(async () => makePcgResult([])),
    };
    const postgresPort: PostgresMasteryPort = {
      fetchSummary: jest.fn(async () => null),
      recordAssessment: jest.fn(async () => {}),
    };

    const report = await runMasterySync('child-1', pcgFetcher, postgresPort);

    expect(report.totalCompared).toBe(0);
    expect(report.inSync).toBe(0);
    expect(report.discrepancies).toHaveLength(0);
    expect(report.success).toBe(true);
  });
});
