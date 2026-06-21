import { randomUUID } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';

import { authOptions } from '../../auth/[...nextauth]';
import { getLearningPhase1Service } from '@/domains/learning/features/attempt-grading';
import { getAIChildSafetyMonitor } from '@/domains/learning/features/safety-monitor';
import { getKidsPCGService } from '@/domains/learning/entities/child-pcg';
import dbPool from '@/lib/db/client';
import { filterChildContent, logChildActivity } from '@/lib/platform/content-filter-service';
import { getChildServiceContext } from '@/lib/platform/child-service-middleware';
import { getLearningAccessState } from '@/domains/learning/features/access-control';
import { HARNESS_EVENT_TYPES } from '@/lib/harness/events/types';
import { emitHarnessEventSafe, runHarnessPipeline, toApiHarnessMetadata } from '@/lib/harness/runtime/pipeline';
import type { HarnessPipelineEventInput } from '@/lib/harness/runtime/pipeline';
import type { HarnessAgentRequest, HarnessSafetyResult } from '@/lib/harness/types';
import {
  LEARN_TUTOR_CONTRACT,
  LEARN_TUTOR_MODEL,
  buildDeterministicTutorMessage,
  generateTutorMessageViaOrchestrator,
} from '@/domains/learning/features/tutor-turn';
import { normalizeAttemptNumber, readUserId } from '../attempt';

interface TutorTurnRequestBody {
  childId?: unknown;
  contentItemId?: unknown;
  message?: unknown;
  response?: unknown;
  attemptNumber?: unknown;
  sessionId?: unknown;
}

interface TutorTurnInput {
  childId: string;
  contentItemId: string;
  message: string;
  attemptNumber: number;
  sessionId?: string;
}

export { LEARN_TUTOR_CONTRACT, LEARN_TUTOR_MODEL, buildDeterministicTutorMessage };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const startedAt = Date.now();
    const policyDecisions: string[] = ['auth:allow', 'method:post'];

    const validation = validateTutorTurnPayload((req.body || {}) as TutorTurnRequestBody);
    if ('error' in validation) {
      return res.status(400).json({ error: validation.error });
    }

    const input = validation.value;
    policyDecisions.push('payload:valid');

    const childUserId = readUserId(session);
    const harnessRequest: HarnessAgentRequest = {
      requestId: randomUUID(),
      domain: 'learning',
      agentId: 'learn_tutor',
      agentRole: 'tutor',
      sessionId: input.sessionId,
      userId: childUserId,
      goal: 'Help learner make one safe, concrete next step',
      payload: {
        childId: input.childId,
        contentItemId: input.contentItemId,
        attemptNumber: input.attemptNumber,
      },
      priority: 'normal',
      metadata: {
        route: '/api/learn/tutor/turn',
      },
    };

    // Gate on the authenticated child USER id (parental controls + usage are keyed to
    // it), not the PCG profile id carried in the request body.
    const access = await getLearningAccessState(dbPool, childUserId);
    if (!access.allowed) {
      policyDecisions.push('learning_access:block');
      await emitHarnessEventSafe(
        {
          domain: harnessRequest.domain,
          type: HARNESS_EVENT_TYPES.POLICY_BLOCKED,
          userId: harnessRequest.userId,
          sessionId: harnessRequest.sessionId,
          payload: {
            requestId: harnessRequest.requestId,
            reason: access.reason || 'Learning access blocked',
            control: 'learning_access',
          },
        },
        '[api/learn/tutor/turn] harness event emission failed:',
      );

      return res.status(403).json({
        error: 'Learning access blocked',
        message: access.reason || 'Learning access is currently unavailable.',
        usageLimitReached: true,
      });
    }
    policyDecisions.push('learning_access:allow');

    const childContext = await getChildServiceContext(req, res);
    if (!childContext) {
      return;
    }
    policyDecisions.push('child_context:allow');

    const contentItem = await getLearningPhase1Service().getContentById(input.contentItemId);
    if (!contentItem) {
      return res.status(404).json({ error: `Unknown content item: ${input.contentItemId}` });
    }

    let safetyInputResult: HarnessSafetyResult = 'pass';
    let safetyOutputResult: HarnessSafetyResult = 'pass';

    const inputFilter = await safeFilterContent(childUserId, input.message, 'input');
    if (!inputFilter.passed) {
      safetyInputResult = 'block';
      await safeLogTutorTurn(childUserId, {
        sessionId: input.sessionId,
        userMessage: input.message,
        aiResponse: 'Input blocked by safety filter',
        wasFiltered: true,
        filterReason: inputFilter.violations?.[0]?.ruleName,
        metadata: {
          requestedChildId: input.childId,
          contentItemId: input.contentItemId,
          blockedDirection: 'input',
        },
      });

      await emitHarnessEventSafe(
        {
          domain: harnessRequest.domain,
          type: HARNESS_EVENT_TYPES.INCIDENT_RAISED,
          userId: harnessRequest.userId,
          sessionId: harnessRequest.sessionId,
          payload: {
            requestId: harnessRequest.requestId,
            direction: 'input',
            rule: inputFilter.violations?.[0]?.ruleName,
            blocked: true,
          },
        },
        '[api/learn/tutor/turn] harness event emission failed:',
      );

      return res.status(403).json({
        error: 'Content blocked',
        message: "Let's keep this learning-safe and try a different way to ask that.",
        wasFiltered: true,
      });
    }
    if (inputFilter.filteredContent && inputFilter.filteredContent !== input.message) {
      safetyInputResult = 'warn';
    }

    const learnerMessage = inputFilter.filteredContent || input.message;

    const hintSet = contentItem.hintSet || [];
    const hintsAvailable = hintSet.length;
    const hintLevel = hintsAvailable > 0 ? Math.min(input.attemptNumber - 1, hintsAvailable - 1) : undefined;
    const hint = hintLevel !== undefined ? hintSet[hintLevel] : undefined;

    const pcgContext = await safeGetLearningPcgContext(childUserId);

    const tutorResponse = await generateTutorMessageViaOrchestrator({
      learnerMessage,
      contentPrompt: contentItem.prompt,
      hint,
      hintLevel,
      hintsAvailable,
      attemptNumber: input.attemptNumber,
      safetySystemPrompt: childContext.safetySystemPrompt,
      pcgContext,
    });
    const rawTutorMessage = tutorResponse.message;

    const outputFilter = await safeFilterContent(childUserId, rawTutorMessage, 'output');
    let finalTutorMessage = rawTutorMessage;
    if (!outputFilter.passed) {
      safetyOutputResult = 'block';
      finalTutorMessage =
        'I can help with this in a safe way. Try the problem again and tell me what you notice first.';
    } else if (outputFilter.filteredContent) {
      finalTutorMessage = outputFilter.filteredContent;
      if (outputFilter.filteredContent !== rawTutorMessage) {
        safetyOutputResult = 'warn';
      }
    }

    const outputFiltered =
      !outputFilter.passed ||
      (typeof outputFilter.filteredContent === 'string' && outputFilter.filteredContent !== rawTutorMessage);

    let safetyFlagged = false;
    let safetyBlocked = false;
    let safetyConcerns: string[] = [];

    try {
      const safetyResult = await getAIChildSafetyMonitor(dbPool).analyzeMessage({
        childId: childUserId,
        sessionId: input.sessionId || `learn_tutor_${Date.now()}`,
        childMessage: learnerMessage,
        aiResponse: finalTutorMessage,
        characterId: 'learn_tutor',
        aiModel: tutorResponse.model,
        timestamp: new Date(),
      });

      safetyFlagged = safetyResult.shouldFlag;
      safetyConcerns = safetyResult.concerns;

      if (safetyResult.shouldBlock) {
        safetyBlocked = true;
        safetyOutputResult = 'block';
        finalTutorMessage = 'Let us reset and try one small step. What is the question asking you to find?';
      } else if (safetyResult.shouldFlag && safetyOutputResult === 'pass') {
        safetyOutputResult = 'warn';
      }
    } catch (error) {
      console.error('[api/learn/tutor/turn] safety monitor failed:', error);
    }

    const inputFiltered = learnerMessage !== input.message;

    await safeLogTutorTurn(childUserId, {
      sessionId: input.sessionId,
      userMessage: learnerMessage,
      aiResponse: finalTutorMessage,
      wasFiltered: inputFiltered || outputFiltered || safetyBlocked,
      filterReason: !outputFilter.passed ? outputFilter.violations?.[0]?.ruleName : undefined,
      metadata: {
        requestedChildId: input.childId,
        contentItemId: input.contentItemId,
        attemptNumber: input.attemptNumber,
        hintLevel,
        aiSource: tutorResponse.source,
        aiModel: tutorResponse.model,
        aiContract: tutorResponse.contract,
        safetyFlagged,
        safetyBlocked,
      },
    });

    const harnessEvents: HarnessPipelineEventInput[] = [];
    if (tutorResponse.source.includes('fallback')) {
      harnessEvents.push({
        domain: harnessRequest.domain,
        type: HARNESS_EVENT_TYPES.AGENT_FALLBACK,
        userId: harnessRequest.userId,
        sessionId: harnessRequest.sessionId,
        payload: {
          requestId: harnessRequest.requestId,
          source: tutorResponse.source,
          model: tutorResponse.model,
        },
      });
    }

    if (safetyOutputResult !== 'pass' || safetyInputResult !== 'pass') {
      harnessEvents.push({
        domain: harnessRequest.domain,
        type: HARNESS_EVENT_TYPES.INCIDENT_RAISED,
        userId: harnessRequest.userId,
        sessionId: harnessRequest.sessionId,
        payload: {
          requestId: harnessRequest.requestId,
          safetyInputResult,
          safetyOutputResult,
          safetyFlagged,
          safetyBlocked,
        },
      });
    }

    harnessEvents.push({
      domain: harnessRequest.domain,
      type: HARNESS_EVENT_TYPES.ATTEMPT_SUBMITTED,
      userId: harnessRequest.userId,
      sessionId: harnessRequest.sessionId,
      payload: {
        requestId: harnessRequest.requestId,
        contentItemId: input.contentItemId,
        attemptNumber: input.attemptNumber,
        hintLevel,
        source: tutorResponse.source,
      },
    });

    const { response: harnessResponse } = await runHarnessPipeline({
      request: harnessRequest,
      startedAt,
      policyDecisions,
      safetyInputResult,
      safetyOutputResult,
      status: tutorResponse.source.includes('fallback') ? 'fallback' : 'success',
      content: finalTutorMessage,
      source: tutorResponse.source,
      model: tutorResponse.model,
      contract: tutorResponse.contract,
      events: harnessEvents,
      eventWarnPrefix: '[api/learn/tutor/turn] harness event emission failed:',
    });

    return res.status(200).json({
      turnId: randomUUID(),
      contentItemId: contentItem.id,
      skillCode: contentItem.skillCode,
      attemptNumber: input.attemptNumber,
      response: finalTutorMessage,
      tutorMessage: finalTutorMessage,
      hint,
      hintLevel,
      hintsAvailable,
      safety: {
        inputFiltered,
        outputFiltered,
        flagged: safetyFlagged,
        blocked: safetyBlocked,
        concerns: safetyConcerns,
      },
      source: tutorResponse.source,
      model: tutorResponse.model,
      contract: tutorResponse.contract,
      harness: toApiHarnessMetadata(harnessResponse),
    });
  } catch (error) {
    console.error('[api/learn/tutor/turn] failed:', error);
    return res.status(500).json({ error: 'Failed to process tutor turn' });
  }
}

export function validateTutorTurnPayload(body: TutorTurnRequestBody):
  | { ok: true; value: TutorTurnInput }
  | { ok: false; error: string } {
  const childId = String(body.childId || '').trim();
  const contentItemId = String(body.contentItemId || '').trim();
  const rawMessage = typeof body.message === 'string' ? body.message : body.response;
  const message = typeof rawMessage === 'string' ? rawMessage.trim() : '';

  if (!childId) {
    return { ok: false, error: 'childId is required' };
  }

  if (!contentItemId) {
    return { ok: false, error: 'contentItemId is required' };
  }

  if (!message) {
    return { ok: false, error: 'message is required' };
  }

  if (message.length > 2000) {
    return { ok: false, error: 'message must be <= 2000 characters' };
  }

  return {
    ok: true,
    value: {
      childId,
      contentItemId,
      message,
      attemptNumber: normalizeAttemptNumber(body.attemptNumber),
      sessionId: body.sessionId ? String(body.sessionId).trim() : undefined,
    },
  };
}

async function safeGetLearningPcgContext(childUserId: string): Promise<{
  childName?: string;
  ageGroup?: string;
  interests?: string[];
  goals?: string[];
} | null> {
  try {
    const profile = await getKidsPCGService(dbPool).getOrCreateProfile(childUserId);
    return {
      childName: profile.displayName,
      ageGroup: profile.ageGroup,
      interests: Array.isArray(profile.interests) ? profile.interests : [],
      goals: Array.isArray(profile.currentGoals) ? profile.currentGoals.map((goal) => goal.title).filter(Boolean) : [],
    };
  } catch (error) {
    console.warn('[api/learn/tutor/turn] failed to load PCG context, continuing without personalization:', error);
    return null;
  }
}

async function safeFilterContent(
  childId: string,
  content: string,
  direction: 'input' | 'output',
): Promise<{
  passed: boolean;
  filteredContent?: string;
  violations?: Array<{ ruleName?: string }>;
}> {
  try {
    return await filterChildContent(childId, content, direction);
  } catch (error) {
    console.warn('[api/learn/tutor/turn] filterChildContent fallback:', error);
    return {
      passed: true,
      filteredContent: content,
      violations: [],
    };
  }
}

async function safeLogTutorTurn(
  childId: string,
  input: {
    sessionId?: string;
    userMessage: string;
    aiResponse: string;
    wasFiltered: boolean;
    filterReason?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await logChildActivity(childId, 'learn_tutor_turn', {
      serviceId: 'learn_tutor',
      conversationId: input.sessionId,
      userMessage: input.userMessage,
      aiResponse: input.aiResponse,
      wasFiltered: input.wasFiltered,
      filterReason: input.filterReason,
      metadata: input.metadata,
    });
  } catch (error) {
    console.warn('[api/learn/tutor/turn] logChildActivity skipped:', error);
  }
}
