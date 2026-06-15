import { randomUUID } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';

import { authOptions } from '../../auth/[...nextauth]';
import { getLearningPhase1Service } from '@/lib/kids-pic/LearningPhase1Service';
import { getAIChildSafetyMonitor } from '@/lib/kids-pic/AIChildSafetyMonitor';
import dbPool from '@/lib/db/client';
import { checkChildAccess, filterChildContent, logChildActivity } from '@/lib/platform/content-filter-service';
import { normalizeAttemptNumber } from '../attempt';

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
    const validation = validateTutorTurnPayload((req.body || {}) as TutorTurnRequestBody);
    if ('error' in validation) {
      return res.status(400).json({ error: validation.error });
    }

    const input = validation.value;
    const access = await safeCheckChildAccess(input.childId);
    if (!access.allowed) {
      return res.status(403).json({
        error: 'Learning access blocked',
        message: access.reason || 'Learning access is currently unavailable.',
      });
    }

    const contentItem = await getLearningPhase1Service().getContentById(input.contentItemId);
    if (!contentItem) {
      return res.status(404).json({ error: `Unknown content item: ${input.contentItemId}` });
    }

    const inputFilter = await safeFilterContent(input.childId, input.message, 'input');
    if (!inputFilter.passed) {
      await safeLogTutorTurn(input.childId, {
        sessionId: input.sessionId,
        userMessage: input.message,
        aiResponse: 'Input blocked by safety filter',
        wasFiltered: true,
        filterReason: inputFilter.violations?.[0]?.ruleName,
        metadata: {
          contentItemId: input.contentItemId,
          blockedDirection: 'input',
        },
      });

      return res.status(403).json({
        error: 'Content blocked',
        message: "Let's keep this learning-safe and try a different way to ask that.",
        wasFiltered: true,
      });
    }

    const learnerMessage = inputFilter.filteredContent || input.message;

    const hintSet = contentItem.hintSet || [];
    const hintsAvailable = hintSet.length;
    const hintLevel = hintsAvailable > 0 ? Math.min(input.attemptNumber - 1, hintsAvailable - 1) : undefined;
    const hint = hintLevel !== undefined ? hintSet[hintLevel] : undefined;

    const rawTutorMessage = buildDeterministicTutorMessage({
      prompt: contentItem.prompt,
      attemptNumber: input.attemptNumber,
      hint,
      hintLevel,
      hintsAvailable,
    });

    const outputFilter = await safeFilterContent(input.childId, rawTutorMessage, 'output');
    let finalTutorMessage = rawTutorMessage;
    if (!outputFilter.passed) {
      finalTutorMessage =
        'I can help with this in a safe way. Try the problem again and tell me what you notice first.';
    } else if (outputFilter.filteredContent) {
      finalTutorMessage = outputFilter.filteredContent;
    }

    const outputFiltered =
      !outputFilter.passed ||
      (typeof outputFilter.filteredContent === 'string' && outputFilter.filteredContent !== rawTutorMessage);

    let safetyFlagged = false;
    let safetyBlocked = false;
    let safetyConcerns: string[] = [];

    try {
      const safetyResult = await getAIChildSafetyMonitor(dbPool).analyzeMessage({
        childId: input.childId,
        sessionId: input.sessionId || `learn_tutor_${Date.now()}`,
        childMessage: learnerMessage,
        aiResponse: finalTutorMessage,
        characterId: 'learn_tutor',
        aiModel: 'deterministic_coach_v1',
        timestamp: new Date(),
      });

      safetyFlagged = safetyResult.shouldFlag;
      safetyConcerns = safetyResult.concerns;

      if (safetyResult.shouldBlock) {
        safetyBlocked = true;
        finalTutorMessage = 'Let us reset and try one small step. What is the question asking you to find?';
      }
    } catch (error) {
      console.error('[api/learn/tutor/turn] safety monitor failed:', error);
    }

    const inputFiltered = learnerMessage !== input.message;

    await safeLogTutorTurn(input.childId, {
      sessionId: input.sessionId,
      userMessage: learnerMessage,
      aiResponse: finalTutorMessage,
      wasFiltered: inputFiltered || outputFiltered || safetyBlocked,
      filterReason: !outputFilter.passed ? outputFilter.violations?.[0]?.ruleName : undefined,
      metadata: {
        contentItemId: input.contentItemId,
        attemptNumber: input.attemptNumber,
        hintLevel,
        safetyFlagged,
        safetyBlocked,
      },
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
      source: 'deterministic_learn_tutor',
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

export function buildDeterministicTutorMessage(input: {
  prompt: string;
  attemptNumber: number;
  hint?: string;
  hintLevel?: number;
  hintsAvailable: number;
}): string {
  const coachingPrefix = 'Nice effort. Let us solve this step by step.';

  if (input.hint) {
    const hintLabel =
      typeof input.hintLevel === 'number'
        ? `Hint ${input.hintLevel + 1} of ${Math.max(input.hintsAvailable, 1)}:`
        : 'Hint:';

    return `${coachingPrefix} ${hintLabel} ${input.hint} Then try your answer again in your own words.`;
  }

  const promptSnippet = input.prompt.length > 180 ? `${input.prompt.slice(0, 180)}...` : input.prompt;

  return `${coachingPrefix} Re-read the problem and focus on the key detail: "${promptSnippet}".`;
}

async function safeCheckChildAccess(childId: string): Promise<{ allowed: boolean; reason?: string }> {
  try {
    return await checkChildAccess(childId);
  } catch (error) {
    console.warn('[api/learn/tutor/turn] checkChildAccess fallback:', error);
    return { allowed: true };
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
