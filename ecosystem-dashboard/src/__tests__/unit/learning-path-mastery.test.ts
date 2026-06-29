import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/db/client', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('@/domains/learning/features/path-generation', () => ({
  getLearningPathService: jest.fn(),
}));

// Shared mock — name starts with "mock" so jest.mock factory can reference it
const mockRecordSkillAssessment = jest.fn().mockResolvedValue(undefined);

jest.mock('@/domains/learning/entities/skill-graph', () => ({
  SkillProgressService: jest.fn().mockImplementation(() => ({
    recordSkillAssessment: mockRecordSkillAssessment,
  })),
}));

const mockLogChildActivity = jest.fn().mockResolvedValue(undefined);

jest.mock('@/lib/platform/content-filter-service', () => ({
  logChildActivity: mockLogChildActivity,
}));

import { getServerSession } from 'next-auth';
import { getLearningPathService } from '@/domains/learning/features/path-generation';
import {
  getMasteryCalculator,
  _resetMasteryCalculator,
} from '@/domains/learning/learner/mastery-calculator';
import {
  _resetLearnerProfileService,
} from '@/domains/learning/learner/learner-profile';
import {
  getEventBus,
  _resetEventBus,
} from '@/domains/learning/shared/event-bus';
import handler from '../../pages/api/child/learning-path';

type MockState = {
  statusCode: number;
  body: any;
  headers: Record<string, string | string[]>;
};

function createMockReqRes(input: {
  method?: string;
  url?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}): { req: NextApiRequest; res: NextApiResponse; state: MockState } {
  const req = {
    method: input.method || 'POST',
    url: input.url || '/api/child/learning-path?action=complete-step',
    query: input.url
      ? Object.fromEntries(new URLSearchParams(input.url.split('?')[1] || ''))
      : { action: 'complete-step' },
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

  return { req, res: res as NextApiResponse, state };
}

describe('POST /api/child/learning-path?action=complete-step — mastery write-back', () => {
  const mockGetServerSession = getServerSession as jest.Mock;
  const mockGetLearningPathService = getLearningPathService as jest.Mock;

  let mockCompleteStep: jest.Mock;
  let mockGetPath: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    _resetEventBus();
    _resetMasteryCalculator();
    _resetLearnerProfileService();

    mockGetServerSession.mockResolvedValue({
      user: { id: 'child-auth-user', accountType: 'child' },
    });

    mockCompleteStep = jest.fn();
    mockGetPath = jest.fn();

    mockGetLearningPathService.mockReturnValue({
      completeStep: mockCompleteStep,
      getPath: mockGetPath,
      getAllPaths: jest.fn(),
      getActivePaths: jest.fn(),
      generateAdaptivePath: jest.fn(),
      createPath: jest.fn(),
      updatePathStatus: jest.fn(),
    });

    mockRecordSkillAssessment.mockResolvedValue(undefined);
    mockLogChildActivity.mockResolvedValue(undefined);
  });

  it('writes mastery to Postgres when step has skillCode', async () => {
    mockGetPath.mockResolvedValue({
      id: 'path-1',
      childUserId: 'child-auth-user',
    });
    mockCompleteStep.mockResolvedValue({
      pathCompleted: false,
      completedSkillCode: 'math.counting',
    });

    const { req, res, state } = createMockReqRes({
      body: { pathId: 'path-1', stepNumber: 1, score: 0.85 },
    });

    await handler(req, res);

    expect(state.statusCode).toBe(200);
    expect(mockRecordSkillAssessment).toHaveBeenCalledWith(
      expect.objectContaining({
        childId: 'child-auth-user',
        skillCode: 'math.counting',
        sourceType: 'learning_path_step',
        score: 0.85,
      }),
    );
  });

  it('updates EMA MasteryCalculator and emits mastery.changed event', async () => {
    mockGetPath.mockResolvedValue({
      id: 'path-1',
      childUserId: 'child-auth-user',
    });
    mockCompleteStep.mockResolvedValue({
      pathCompleted: false,
      completedSkillCode: 'math.addition',
    });

    const bus = getEventBus();
    const events: any[] = [];
    bus.on('mastery.changed', (e: any) => { events.push(e); });
    bus.on('attempt.graded', (e: any) => { events.push(e); });

    const { req, res } = createMockReqRes({
      body: { pathId: 'path-1', stepNumber: 2, score: 1 },
    });

    await handler(req, res);

    const attemptEvents = events.filter((e) => e.payload?.skillCode === 'math.addition');
    expect(attemptEvents.length).toBeGreaterThanOrEqual(2);

    const masteryEvent = events.find((e) => e.payload?.newMastery !== undefined);
    expect(masteryEvent).toBeDefined();
    expect(masteryEvent.payload.childId).toBe('child-auth-user');
    expect(masteryEvent.payload.skillCode).toBe('math.addition');
  });

  it('logs child activity for audit trail', async () => {
    mockGetPath.mockResolvedValue({
      id: 'path-1',
      childUserId: 'child-auth-user',
    });
    mockCompleteStep.mockResolvedValue({
      pathCompleted: true,
      completedSkillCode: 'math.counting',
    });

    const { req, res } = createMockReqRes({
      body: { pathId: 'path-1', stepNumber: 3, score: 0.9 },
    });

    await handler(req, res);

    expect(mockLogChildActivity).toHaveBeenCalledWith(
      'child-auth-user',
      'learning_path_step_completed',
      expect.objectContaining({
        metadata: expect.objectContaining({
          pathId: 'path-1',
          stepNumber: 3,
          skillCode: 'math.counting',
          score: 0.9,
          correct: true,
          pathCompleted: true,
        }),
      }),
    );
  });

  it('does not write mastery when completedSkillCode is undefined', async () => {
    mockGetPath.mockResolvedValue({
      id: 'path-1',
      childUserId: 'child-auth-user',
    });
    mockCompleteStep.mockResolvedValue({
      pathCompleted: false,
      completedSkillCode: undefined,
    });

    const { req, res, state } = createMockReqRes({
      body: { pathId: 'path-1', stepNumber: 1, score: 0.5 },
    });

    await handler(req, res);

    expect(state.statusCode).toBe(200);
    expect(mockRecordSkillAssessment).not.toHaveBeenCalled();
    expect(mockLogChildActivity).not.toHaveBeenCalled();
  });

  it('treats missing score as full credit (score=1, correct=true)', async () => {
    mockGetPath.mockResolvedValue({
      id: 'path-1',
      childUserId: 'child-auth-user',
    });
    mockCompleteStep.mockResolvedValue({
      pathCompleted: false,
      completedSkillCode: 'reading.phonics',
    });

    const { req, res } = createMockReqRes({
      body: { pathId: 'path-1', stepNumber: 1 },
    });

    await handler(req, res);

    expect(mockRecordSkillAssessment).toHaveBeenCalledWith(
      expect.objectContaining({
        score: 1,
      }),
    );
    expect(mockLogChildActivity).toHaveBeenCalledWith(
      'child-auth-user',
      'learning_path_step_completed',
      expect.objectContaining({
        metadata: expect.objectContaining({
          score: 1,
          correct: true,
        }),
      }),
    );
  });

  it('still returns 200 even if mastery writes fail (best-effort)', async () => {
    mockGetPath.mockResolvedValue({
      id: 'path-1',
      childUserId: 'child-auth-user',
    });
    mockCompleteStep.mockResolvedValue({
      pathCompleted: false,
      completedSkillCode: 'math.counting',
    });
    mockRecordSkillAssessment.mockRejectedValue(new Error('DB down'));

    const { req, res, state } = createMockReqRes({
      body: { pathId: 'path-1', stepNumber: 1, score: 0.8 },
    });

    await handler(req, res);

    expect(state.statusCode).toBe(200);
    expect(state.body.pathCompleted).toBe(false);
  });
});
