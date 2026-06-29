import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/kids-pic/LearningPhase1Service', () => ({
  getLearningPhase1Service: jest.fn(),
}));

jest.mock('@/lib/kids-pic/SkillProgressService', () => ({
  SkillProgressService: jest.fn().mockImplementation(() => ({
    recordSkillAssessment: jest.fn(),
  })),
}));

jest.mock('@/lib/kids-pic/learning-access', () => ({
  getLearningAccessState: jest.fn(),
  recordLearningUsage: jest.fn(),
}));

jest.mock('@/lib/db/client', () => ({
  __esModule: true,
  default: {},
}));

import { getServerSession } from 'next-auth';
import { getLearningPhase1Service } from '@/domains/learning/features/attempt-grading';
import { getLearningAccessState, recordLearningUsage } from '@/domains/learning/features/access-control';
import { getMasteryCalculator, _resetMasteryCalculator } from '@/domains/learning/learner/mastery-calculator';
import { _resetLearnerProfileService } from '@/domains/learning/learner/learner-profile';
import { _resetEventBus } from '@/domains/learning/shared/event-bus';
import handler from '../../pages/api/learn/attempt';

type MockState = {
  statusCode: number;
  body: any;
  headers: Record<string, string | string[]>;
};

function createMockReqRes(input: {
  method?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}): { req: NextApiRequest; res: NextApiResponse; state: MockState } {
  const req = {
    method: input.method || 'POST',
    body: input.body || {},
    headers: input.headers || {},
  } as unknown as NextApiRequest;

  const state: MockState = {
    statusCode: 200,
    body: null,
    headers: {},
  };

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

  return {
    req,
    res: res as NextApiResponse,
    state,
  };
}

describe('POST /api/learn/attempt', () => {
  const mockGetServerSession = getServerSession as jest.Mock;
  const mockGetLearningPhase1Service = getLearningPhase1Service as jest.Mock;
  const mockGetLearningAccessState = getLearningAccessState as jest.Mock;
  const mockRecordLearningUsage = recordLearningUsage as jest.Mock;
  const mockGradeAttempt = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    _resetEventBus();
    _resetMasteryCalculator();
    _resetLearnerProfileService();

    mockGetServerSession.mockResolvedValue({
      user: { id: 'child-auth-user', accountType: 'child' },
    });

    mockGetLearningPhase1Service.mockReturnValue({
      gradeAttempt: mockGradeAttempt,
    });

    mockGetLearningAccessState.mockResolvedValue({
      controlled: true,
      allowed: true,
      currentUsageMinutes: 0,
      dailyLimitMinutes: 120,
      remainingMinutes: 120,
    });

    mockGradeAttempt.mockResolvedValue({
      attemptId: 'attempt-1',
      contentItem: {
        id: 'phase1.math.word_1step.v1',
        skillCode: 'math.word_1step',
        hintSet: ['hint-1', 'hint-2'],
      },
      normalizedResponse: '9',
      correct: false,
      score: 0.4,
      feedback: 'Good effort. Try counting again.',
      masteryEligible: false,
    });

    mockRecordLearningUsage.mockResolvedValue(undefined);
  });

  it('returns harness envelope metadata on successful grading', async () => {
    const { req, res, state } = createMockReqRes({
      body: {
        childId: 'child-1',
        contentItemId: 'phase1.math.word_1step.v1',
        response: 'I think it is 9',
        attemptNumber: 2,
      },
    });

    await handler(req, res);

    expect(state.statusCode).toBe(200);
    expect(state.body.correct).toBe(false);
    expect(state.body.hint).toBe('hint-2');
    expect(state.body.harness).toEqual(
      expect.objectContaining({
        requestId: expect.any(String),
        status: 'success',
        source: 'deterministic_learn_attempt',
        channel: 'deterministic_fallback',
        audit: expect.objectContaining({
          auditId: expect.any(String),
          agentId: 'learn_attempt',
          model: 'deterministic_grade_engine',
          contract: 'learn-attempt-v1',
          policyDecisions: expect.arrayContaining(['auth:allow', 'method:post', 'payload:valid']),
          safetyInputResult: 'pass',
          safetyOutputResult: 'pass',
        }),
      }),
    );

    expect(mockRecordLearningUsage).toHaveBeenCalledWith(expect.anything(), 'child-auth-user', 1);
  });

  it('returns 403 and does not grade when learning access is blocked', async () => {
    mockGetLearningAccessState.mockResolvedValue({
      controlled: true,
      allowed: false,
      reason: "Time's up for learning today! Come back tomorrow.",
      currentUsageMinutes: 120,
      dailyLimitMinutes: 120,
      remainingMinutes: 0,
    });

    const { req, res, state } = createMockReqRes({
      body: {
        childId: 'child-1',
        contentItemId: 'phase1.math.word_1step.v1',
        response: 'I think it is 9',
      },
    });

    await handler(req, res);

    expect(state.statusCode).toBe(403);
    expect(state.body.usageLimitReached).toBe(true);
    expect(mockGradeAttempt).not.toHaveBeenCalled();
  });

  it('tracks in-process mastery via LearnerProfileService and returns oldMastery/newMastery', async () => {
    _resetEventBus();
    _resetMasteryCalculator();
    _resetLearnerProfileService();

    mockGradeAttempt.mockResolvedValue({
      attemptId: 'attempt-mastery',
      contentItem: {
        id: 'phase1.math.add.v1',
        skillCode: 'math.add',
        hintSet: ['hint-1'],
      },
      normalizedResponse: '4',
      correct: true,
      score: 1.0,
      feedback: 'Great work!',
      masteryEligible: true,
    });

    const { req, res, state } = createMockReqRes({
      body: {
        childId: 'child-mastery',
        contentItemId: 'phase1.math.add.v1',
        response: '4',
        attemptNumber: 1,
      },
    });

    await handler(req, res);

    expect(state.statusCode).toBe(200);
    expect(state.body.mastery.inProcess).toBeDefined();
    expect(state.body.mastery.inProcess.oldMastery).toBe(0); // no prior mastery
    expect(state.body.mastery.inProcess.newMastery).toBeGreaterThan(0);
    expect(state.body.mastery.inProcess.delta).toBeGreaterThan(0);
  });

  it('updates mastery cumulatively across multiple attempts', async () => {
    _resetEventBus();
    _resetMasteryCalculator();
    _resetLearnerProfileService();

    mockGradeAttempt.mockResolvedValue({
      attemptId: 'attempt-1',
      contentItem: {
        id: 'phase1.math.add.v1',
        skillCode: 'math.add',
        hintSet: ['hint-1'],
      },
      normalizedResponse: '4',
      correct: true,
      score: 1.0,
      feedback: 'Great work!',
      masteryEligible: true,
    });

    // First attempt (correct)
    const { req: req1, res: res1, state: state1 } = createMockReqRes({
      body: {
        childId: 'child-cumulative',
        contentItemId: 'phase1.math.add.v1',
        response: '4',
        attemptNumber: 1,
      },
    });
    await handler(req1, res1);

    const masteryAfterFirst = state1.body.mastery.inProcess.newMastery;
    expect(masteryAfterFirst).toBeGreaterThan(0);

    // Second attempt (correct) — mastery should increase further
    mockGradeAttempt.mockResolvedValue({
      attemptId: 'attempt-2',
      contentItem: {
        id: 'phase1.math.add.v1',
        skillCode: 'math.add',
        hintSet: ['hint-1'],
      },
      normalizedResponse: '4',
      correct: true,
      score: 1.0,
      feedback: 'Great work!',
      masteryEligible: true,
    });

    const { req: req2, res: res2, state: state2 } = createMockReqRes({
      body: {
        childId: 'child-cumulative',
        contentItemId: 'phase1.math.add.v1',
        response: '4',
        attemptNumber: 2,
      },
    });
    await handler(req2, res2);

    expect(state2.body.mastery.inProcess.oldMastery).toBeCloseTo(masteryAfterFirst, 5);
    expect(state2.body.mastery.inProcess.newMastery).toBeGreaterThan(masteryAfterFirst);
  });

  it('decreases mastery on incorrect answer', async () => {
    _resetEventBus();
    _resetMasteryCalculator();
    _resetLearnerProfileService();

    // First attempt (correct) to establish a baseline
    mockGradeAttempt.mockResolvedValue({
      attemptId: 'attempt-1',
      contentItem: {
        id: 'phase1.math.add.v1',
        skillCode: 'math.add',
        hintSet: ['hint-1'],
      },
      normalizedResponse: '4',
      correct: true,
      score: 1.0,
      feedback: 'Great work!',
      masteryEligible: true,
    });

    const { req: req1, res: res1 } = createMockReqRes({
      body: {
        childId: 'child-decrease',
        contentItemId: 'phase1.math.add.v1',
        response: '4',
        attemptNumber: 1,
      },
    });
    await handler(req1, res1);

    const masteryAfterCorrect = getMasteryCalculator().get('child-decrease', 'math.add');
    expect(masteryAfterCorrect).toBeGreaterThan(0);

    // Second attempt (incorrect) — mastery should decrease
    mockGradeAttempt.mockResolvedValue({
      attemptId: 'attempt-2',
      contentItem: {
        id: 'phase1.math.add.v1',
        skillCode: 'math.add',
        hintSet: ['hint-1'],
      },
      normalizedResponse: '7',
      correct: false,
      score: 0,
      feedback: 'Try again.',
      masteryEligible: true,
    });

    const { req: req2, res: res2, state: state2 } = createMockReqRes({
      body: {
        childId: 'child-decrease',
        contentItemId: 'phase1.math.add.v1',
        response: '7',
        attemptNumber: 2,
      },
    });
    await handler(req2, res2);

    expect(state2.body.mastery.inProcess.newMastery).toBeLessThan(masteryAfterCorrect);
    expect(state2.body.mastery.inProcess.delta).toBeLessThan(0);
  });
});
