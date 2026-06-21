import type { NextApiRequest, NextApiResponse } from 'next';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/kids-pic/LearningPhase1Service', () => ({
  getLearningPhase1Service: jest.fn(),
}));

jest.mock('@/lib/kids-pic/AIChildSafetyMonitor', () => ({
  getAIChildSafetyMonitor: jest.fn(),
}));

jest.mock('@/lib/kids-pic/KidsPCGService', () => ({
  getKidsPCGService: jest.fn(),
}));

jest.mock('@/lib/platform/child-service-middleware', () => ({
  getChildServiceContext: jest.fn(),
}));

jest.mock('@/lib/platform/content-filter-service', () => ({
  filterChildContent: jest.fn(),
  logChildActivity: jest.fn(),
}));

jest.mock('@/lib/kids-pic/learning-access', () => ({
  getLearningAccessState: jest.fn(),
  recordLearningUsage: jest.fn(),
}));

import { getServerSession } from 'next-auth';
import { getLearningPhase1Service } from '@/domains/learning/features/attempt-grading';
import { getAIChildSafetyMonitor } from '@/domains/learning/features/safety-monitor';
import { getKidsPCGService } from '@/domains/learning/entities/child-pcg';
import { filterChildContent, logChildActivity } from '@/lib/platform/content-filter-service';
import { getChildServiceContext } from '@/lib/platform/child-service-middleware';
import { getLearningAccessState } from '@/domains/learning/features/access-control';
import handler, {
  LEARN_TUTOR_CONTRACT,
  LEARN_TUTOR_MODEL,
} from '../../pages/api/learn/tutor/turn';

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

describe('POST /api/learn/tutor/turn', () => {
  const mockGetServerSession = getServerSession as jest.Mock;
  const mockGetLearningPhase1Service = getLearningPhase1Service as jest.Mock;
  const mockGetAIChildSafetyMonitor = getAIChildSafetyMonitor as jest.Mock;
  const mockGetKidsPCGService = getKidsPCGService as jest.Mock;
  const mockGetChildServiceContext = getChildServiceContext as jest.Mock;
  const mockGetLearningAccessState = getLearningAccessState as jest.Mock;
  const mockFilterChildContent = filterChildContent as jest.Mock;
  const mockLogChildActivity = logChildActivity as jest.Mock;

  const mockGetContentById = jest.fn();
  const mockAnalyzeMessage = jest.fn();
  const mockGetOrCreateProfile = jest.fn();
  const mockFetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetServerSession.mockResolvedValue({
      user: { id: 'child-auth-user', accountType: 'child' },
    });

    mockGetLearningPhase1Service.mockReturnValue({
      getContentById: mockGetContentById,
    });

    mockGetKidsPCGService.mockReturnValue({
      getOrCreateProfile: mockGetOrCreateProfile,
    });

    mockGetOrCreateProfile.mockResolvedValue({
      id: 'child-profile-1',
      displayName: 'Luca',
      ageGroup: 'middle',
      interests: ['math', 'minecraft'],
      currentGoals: [{ title: 'Practice multiplication' }],
    });

    mockGetChildServiceContext.mockResolvedValue({
      userId: 'child-auth-user',
      childName: 'Luca',
      accountType: 'child',
      parentalControls: {
        logAllConversations: true,
      },
      safetySystemPrompt: 'Child-safe prompt',
      remainingMinutes: 120,
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: 'Nice effort! Hint 2 of 3: Now count on 5 more from that starting number.',
            },
          },
        ],
      }),
    });

    (global as any).fetch = mockFetch;

    mockGetContentById.mockResolvedValue({
      id: 'phase1.math.word_1step.v1',
      skillCode: 'math.word_1step',
      prompt: 'Mia has 4 apples and gets 5 more. How many apples does she have?',
      hintSet: [
        'Start with the number Mia had first.',
        'Now count on 5 more from that starting number.',
        'You can also do 4 + 5.',
      ],
    });

    mockGetLearningAccessState.mockResolvedValue({
      controlled: true,
      allowed: true,
      currentUsageMinutes: 0,
      dailyLimitMinutes: 120,
      remainingMinutes: 120,
    });

    mockFilterChildContent.mockImplementation(async (_childId: string, content: string) => ({
      passed: true,
      filteredContent: content,
      violations: [],
    }));

    mockGetAIChildSafetyMonitor.mockReturnValue({
      analyzeMessage: mockAnalyzeMessage,
    });

    mockAnalyzeMessage.mockResolvedValue({
      safe: true,
      concerns: [],
      scores: {
        sycophancy: 0,
        bias: 0,
        manipulation: 0,
        ageAppropriateness: 1,
      },
      shouldFlag: false,
      shouldBlock: false,
    });

    mockLogChildActivity.mockResolvedValue('log-1');
  });

  it('returns 400 when message is missing', async () => {
    const { req, res, state } = createMockReqRes({
      body: {
        childId: 'child-1',
        contentItemId: 'phase1.math.word_1step.v1',
      },
    });

    await handler(req, res);

    expect(state.statusCode).toBe(400);
    expect(state.body).toEqual({ error: 'message is required' });
  });

  it('returns AI gateway tutor guidance for the given attempt number', async () => {
    const { req, res, state } = createMockReqRes({
      body: {
        childId: 'child-1',
        contentItemId: 'phase1.math.word_1step.v1',
        message: 'I think it is 8',
        attemptNumber: 2,
        sessionId: 'sess-123',
      },
    });

    await handler(req, res);

    expect(state.statusCode).toBe(200);
    expect(state.body.hint).toBe('Now count on 5 more from that starting number.');
    expect(state.body.hintLevel).toBe(1);
    expect(state.body.hintsAvailable).toBe(3);
    expect(state.body.tutorMessage).toContain('Hint 2 of 3:');
    expect(state.body.response).toBe(state.body.tutorMessage);
    expect(state.body.source).toBe('ai_gateway_learn_tutor');
    expect(state.body.model).toBe(LEARN_TUTOR_MODEL);
    expect(state.body.contract).toBe(LEARN_TUTOR_CONTRACT);
    expect(state.body.harness).toEqual(
      expect.objectContaining({
        requestId: expect.any(String),
        status: 'success',
        source: 'ai_gateway_learn_tutor',
        channel: 'ai_gateway',
        audit: expect.objectContaining({
          auditId: expect.any(String),
          agentId: 'learn_tutor',
          model: LEARN_TUTOR_MODEL,
          contract: LEARN_TUTOR_CONTRACT,
          policyDecisions: expect.arrayContaining(['auth:allow', 'method:post', 'payload:valid']),
          safetyInputResult: 'pass',
          safetyOutputResult: 'pass',
        }),
      }),
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/chat/completions'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: expect.stringContaining('Bearer '),
        }),
      }),
    );

    const requestBody = JSON.parse(String(mockFetch.mock.calls[0]?.[1]?.body || '{}'));
    expect(requestBody.model).toBe(LEARN_TUTOR_MODEL);
    expect(requestBody.contract).toBe(LEARN_TUTOR_CONTRACT);
    expect(requestBody.metadata?.contract).toBe(LEARN_TUTOR_CONTRACT);

    expect(mockGetContentById).toHaveBeenCalledWith('phase1.math.word_1step.v1');
    expect(mockAnalyzeMessage).toHaveBeenCalledTimes(1);
    expect(mockLogChildActivity).toHaveBeenCalledWith(
      'child-auth-user',
      'learn_tutor_turn',
      expect.objectContaining({
        conversationId: 'sess-123',
        wasFiltered: false,
      }),
    );
  });

  it('returns 403 and skips tutoring when learning access is blocked', async () => {
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
        message: 'I think it is 8',
        attemptNumber: 1,
      },
    });

    await handler(req, res);

    expect(state.statusCode).toBe(403);
    expect(state.body.usageLimitReached).toBe(true);
    expect(mockGetContentById).not.toHaveBeenCalled();
    expect(mockAnalyzeMessage).not.toHaveBeenCalled();
  });
});
