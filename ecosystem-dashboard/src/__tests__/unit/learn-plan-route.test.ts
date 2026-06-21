import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/kids-pic/LearningPhase1Service', () => ({
  getLearningPhase1Service: jest.fn(),
}));

// SkillProgressService is instantiated at module load in plan.ts, so the spy lives in
// the factory closure and is re-exposed for the test to configure per-case.
jest.mock('@/lib/kids-pic/SkillProgressService', () => {
  const getChildSkillSummary = jest.fn();
  return {
    SkillProgressService: jest.fn().mockImplementation(() => ({ getChildSkillSummary })),
    __getChildSkillSummary: getChildSkillSummary,
  };
});

jest.mock('@/lib/kids-pic/learning-access', () => ({
  getLearningAccessState: jest.fn(),
  recordLearningUsage: jest.fn(),
}));

jest.mock('@/lib/db/client', () => {
  const query = jest.fn();
  return { __esModule: true, default: { query } };
});

jest.mock('../../pages/api/learn/attempt', () => ({
  readUserId: jest.fn(() => 'child-auth-user'),
}));

import { getServerSession } from 'next-auth';
import { getLearningPhase1Service } from '@/domains/learning/features/attempt-grading';
import * as SkillProgressModule from '@/domains/learning/entities/skill-graph';
import { getLearningAccessState } from '@/domains/learning/features/access-control';
import dbClient from '@/lib/db/client';
import handler from '../../pages/api/learn/plan';

const mockGetChildSkillSummary = (SkillProgressModule as unknown as { __getChildSkillSummary: jest.Mock })
  .__getChildSkillSummary;
const mockDbQuery = (dbClient as unknown as { query: jest.Mock }).query;
const mockListContent = jest.fn();

type MockState = { statusCode: number; body: any; headers: Record<string, string | string[]> };

function createMockReqRes(input: {
  method?: string;
  query?: Record<string, string>;
  headers?: Record<string, string>;
}): { req: NextApiRequest; res: NextApiResponse; state: MockState } {
  const req = {
    method: input.method || 'GET',
    query: input.query || {},
    headers: input.headers || {},
  } as unknown as NextApiRequest;

  const state: MockState = { statusCode: 200, body: null, headers: {} };
  const res: Partial<NextApiResponse> = {};

  res.status = jest.fn().mockImplementation((statusCode: number) => {
    state.statusCode = statusCode;
    return res as NextApiResponse;
  });
  res.json = jest.fn().mockImplementation((body: any) => {
    state.body = body;
    return res as NextApiResponse;
  });
  res.setHeader = jest.fn().mockImplementation((name: string, value: string | string[]) => {
    state.headers[name] = value;
    return res as NextApiResponse;
  });

  return { req, res: res as NextApiResponse, state };
}

function summaryWith(
  skills: Array<{ skillCode: string; currentScore: number; assessmentsCount?: number; lastAssessmentDate?: Date }>,
): any {
  return {
    childId: 'child-1',
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
        skills: skills.map((s) => ({
          skillId: `id-${s.skillCode}`,
          skillCode: s.skillCode,
          skillName: s.skillCode,
          domainCode: 'math',
          domainName: 'Math',
          currentScore: s.currentScore,
          proficiencyLevel: { name: 'Emerging' },
          trend: 'stable',
          assessmentsCount: s.assessmentsCount ?? 0,
          streakDays: 0,
          milestonesCompleted: 0,
          lastAssessmentDate: s.lastAssessmentDate,
        })),
      },
    ],
    recentMilestones: [],
    recommendedActivities: [],
    curriculumSettings: { curriculumEnabled: false, showStandardCodes: false },
  };
}

describe('GET /api/learn/plan', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'child-auth-user', accountType: 'child' },
    });

    (getLearningAccessState as jest.Mock).mockResolvedValue({
      controlled: true,
      allowed: true,
      currentUsageMinutes: 0,
      dailyLimitMinutes: 120,
      remainingMinutes: 120,
    });

    (getLearningPhase1Service as jest.Mock).mockReturnValue({ listContent: mockListContent });

    mockGetChildSkillSummary.mockResolvedValue(null);

    mockListContent.mockImplementation(async (opts: any) => {
      if (!opts?.skillCode) {
        return [];
      }
      return [
        {
          id: `content.${opts.skillCode}`,
          skillCode: opts.skillCode,
          subject: 'math',
          prompt: `Practice ${opts.skillCode}`,
          difficulty: 1,
        },
      ];
    });

    // Default: the Phase 4 learning_assignments table does not exist yet.
    mockDbQuery.mockImplementation((sql: string) => {
      if (typeof sql === 'string' && sql.includes('to_regclass')) {
        return Promise.resolve({ rows: [{ reg: null }] });
      }
      return Promise.resolve({ rows: [] });
    });
  });

  it('returns 401 when unauthenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const { req, res, state } = createMockReqRes({ query: { childId: 'child-1' } });

    await handler(req, res);

    expect(state.statusCode).toBe(401);
  });

  it('returns 405 for non-GET methods', async () => {
    const { req, res, state } = createMockReqRes({ method: 'POST', query: { childId: 'child-1' } });

    await handler(req, res);

    expect(state.statusCode).toBe(405);
  });

  it('returns 400 when childId is missing', async () => {
    const { req, res, state } = createMockReqRes({ query: {} });

    await handler(req, res);

    expect(state.statusCode).toBe(400);
    expect(state.body).toEqual({ error: 'childId is required' });
  });

  it('returns 403 and does not build a plan when learning access is blocked', async () => {
    (getLearningAccessState as jest.Mock).mockResolvedValue({
      controlled: true,
      allowed: false,
      reason: "Time's up for learning today! Come back tomorrow.",
      currentUsageMinutes: 120,
      dailyLimitMinutes: 120,
      remainingMinutes: 0,
    });

    const { req, res, state } = createMockReqRes({ query: { childId: 'child-1' } });

    await handler(req, res);

    expect(state.statusCode).toBe(403);
    expect(state.body.usageLimitReached).toBe(true);
    expect(mockGetChildSkillSummary).not.toHaveBeenCalled();
    expect(mockDbQuery).not.toHaveBeenCalled();
  });

  it('leads the plan with parent-assigned skills and flags assignmentsApplied', async () => {
    mockDbQuery.mockImplementation((sql: string) => {
      if (sql.includes('to_regclass')) {
        return Promise.resolve({ rows: [{ reg: 'learning_assignments' }] });
      }
      if (sql.includes('FROM public.learning_assignments')) {
        return Promise.resolve({ rows: [{ skill_code: 'math.addition' }] });
      }
      return Promise.resolve({ rows: [] });
    });

    const { req, res, state } = createMockReqRes({ query: { childId: 'child-1' } });

    await handler(req, res);

    expect(state.statusCode).toBe(200);
    expect(state.body.assignmentsApplied).toBe(true);
    expect(state.body.objectives[0]).toMatchObject({ skillCode: 'math.addition', isAssignment: true });
    expect(state.body.activities[0]).toMatchObject({ skillCode: 'math.addition', isAssignment: true });
    expect(state.body.source).toBe('skill_progress_plus_catalog');
    expect(state.body.harness).toEqual(
      expect.objectContaining({
        requestId: expect.any(String),
        status: 'success',
        source: 'deterministic_learn_plan',
        channel: 'deterministic_fallback',
        audit: expect.objectContaining({
          auditId: expect.any(String),
          agentId: 'learn_plan',
          model: 'deterministic_plan_engine',
          contract: 'learn-plan-v1',
          policyDecisions: expect.arrayContaining(['auth:allow', 'method:get', 'payload:valid']),
          safetyInputResult: 'pass',
          safetyOutputResult: 'pass',
        }),
      }),
    );
  });

  it('omits assignments and reports assignmentsApplied=false when the table is absent', async () => {
    mockGetChildSkillSummary.mockResolvedValue(
      summaryWith([
        { skillCode: 'math.sub', currentScore: 0.1, assessmentsCount: 1, lastAssessmentDate: new Date('2024-03-01') },
        { skillCode: 'math.add', currentScore: 0.2, assessmentsCount: 1, lastAssessmentDate: new Date('2024-03-01') },
      ]),
    );

    const { req, res, state } = createMockReqRes({ query: { childId: 'child-1', objectivesLimit: '2' } });

    await handler(req, res);

    expect(state.statusCode).toBe(200);
    expect(state.body.assignmentsApplied).toBe(false);
    expect(state.body.activities.every((a: any) => !a.isAssignment)).toBe(true);
    expect(state.body.activities.map((a: any) => a.skillCode)).toEqual(['math.sub', 'math.add']);
    expect(state.body.source).toBe('skill_progress_plus_catalog');
  });
});
