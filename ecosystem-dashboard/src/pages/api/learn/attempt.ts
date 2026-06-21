import { randomUUID } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';

import { authOptions } from '../auth/[...nextauth]';
import { getLearningPhase1Service } from '@/domains/learning/features/attempt-grading';
import { SkillProgressService } from '@/domains/learning/entities/skill-graph';
import { getLearningAccessState, recordLearningUsage } from '@/domains/learning/features/access-control';
import { captureMisconception } from '@/domains/learning/features/misconception-tracker';
import dbPool from '@/lib/db/client';
import { HARNESS_EVENT_TYPES } from '@/lib/harness/events/types';
import { emitHarnessEventSafe, runHarnessPipeline, toApiHarnessMetadata } from '@/lib/harness/runtime/pipeline';
import type { HarnessPipelineEventInput } from '@/lib/harness/runtime/pipeline';
import type { HarnessAgentRequest } from '@/lib/harness/types';

const skillProgressService = new SkillProgressService(dbPool);

const KIDS_PCG_URL = process.env.KIDS_PCG_URL || 'http://127.0.0.1:8771';
const KIDS_PCG_ADMIN_KEY = process.env.KIDS_PCG_ADMIN_KEY || '';
const KIDS_PCG_DEFAULT_OWNER_ID = process.env.KIDS_PCG_DEFAULT_OWNER_ID || '';
const KIDS_PCG_EVIDENCE_PATH = process.env.KIDS_PCG_EVIDENCE_PATH || '/api/learner/mastery/evidence';
const LEARN_REQUIRE_PCG_WRITE = parseBool(process.env.LEARN_REQUIRE_PCG_WRITE, false);
const LEARN_REQUIRE_POSTGRES_WRITE = parseBool(process.env.LEARN_REQUIRE_POSTGRES_WRITE, false);
const LEARN_ATTEMPT_MODEL = 'deterministic_grade_engine';
const LEARN_ATTEMPT_CONTRACT = 'learn-attempt-v1';
const LEARN_ATTEMPT_SOURCE = 'deterministic_learn_attempt';

type MasteryWriteStatus = { status: 'recorded' | 'skipped' | 'failed'; detail?: string };

interface AttemptRequestBody {
  childId?: string;
  ownerId?: string;
  contentItemId?: string;
  response?: unknown;
  attemptNumber?: number;
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
    const startedAt = Date.now();
    const policyDecisions: string[] = ['auth:allow', 'method:post'];

    const body = (req.body || {}) as AttemptRequestBody;
    const childId = `${body.childId || ''}`.trim();
    const contentItemId = `${body.contentItemId || ''}`.trim();

    if (!childId || !contentItemId) {
      return res.status(400).json({
        error: 'childId and contentItemId are required',
      });
    }
    policyDecisions.push('payload:valid');

    // Learning is child-facing and must respect the same parental controls as chat
    // (allowed hours + daily usage limit), keyed by the authenticated child USER id.
    const userId = readUserId(session);
    const harnessRequest: HarnessAgentRequest = {
      requestId: randomUUID(),
      domain: 'learning',
      agentId: 'learn_attempt',
      agentRole: 'evaluator',
      userId,
      goal: 'Evaluate learner response and update mastery signals',
      payload: {
        childId,
        contentItemId,
        attemptNumber: normalizeAttemptNumber(body.attemptNumber),
      },
      priority: 'normal',
      metadata: {
        route: '/api/learn/attempt',
      },
    };

    const access = await getLearningAccessState(dbPool, userId);
    if (!access.allowed) {
      policyDecisions.push('learning_access:block');
      await emitHarnessEventSafe(
        {
          domain: harnessRequest.domain,
          type: HARNESS_EVENT_TYPES.POLICY_BLOCKED,
          userId: harnessRequest.userId,
          payload: {
            requestId: harnessRequest.requestId,
            reason: access.reason || 'Learning time limit reached',
            control: 'learning_access',
          },
        },
        '[api/learn/attempt] harness event emission failed:',
      );

      return res.status(403).json({
        error: 'Learning time limit reached',
        message: access.reason || 'Learning is currently unavailable.',
        usageLimitReached: true,
        usage: {
          minutes: access.currentUsageMinutes,
          limit: access.dailyLimitMinutes,
          remaining: access.remainingMinutes,
        },
      });
    }
    policyDecisions.push('learning_access:allow');

    const gradeResult = await getLearningPhase1Service().gradeAttempt({
      childId,
      contentItemId,
      learnerResponse: body.response,
    });

    // Escalating hints are resolved server-side so the answer key never leaves
    // the server. attemptNumber is 1-based; deeper attempts surface later hints.
    const attemptNumber = normalizeAttemptNumber(body.attemptNumber);
    const hintSet = gradeResult.contentItem.hintSet || [];
    const hintsAvailable = hintSet.length;
    let hint: string | undefined;
    let hintLevel: number | undefined;
    if (!gradeResult.correct && hintsAvailable > 0) {
      hintLevel = Math.min(attemptNumber - 1, hintsAvailable - 1);
      hint = hintSet[hintLevel];
    }

    // Capture misconception for later targeted review (Phase 3).
    if (!gradeResult.correct && gradeResult.contentItem.answerKey) {
      const correctAnswer = gradeResult.contentItem.answerKey.kind === 'number'
        ? String(gradeResult.contentItem.answerKey.value)
        : String(gradeResult.contentItem.answerKey.value);
      captureMisconception({
        childId,
        skillCode: gradeResult.contentItem.skillCode,
        incorrectResponse: gradeResult.normalizedResponse,
        correctApproach: correctAnswer,
      });
    }

    const notEligible: MasteryWriteStatus = {
      status: 'skipped',
      detail: 'attempt not eligible for mastery writes',
    };
    let postgresResult: MasteryWriteStatus = notEligible;
    let pcgResult: MasteryWriteStatus = notEligible;

    if (gradeResult.masteryEligible) {
      // Postgres is the analytics/proficiency snapshot layer (Decision D1) and is
      // best-effort: a missing/unseeded skills table or child profile must never
      // fail the attempt or block the authoritative kids-pcg write below.
      postgresResult = await writePostgresMasteryEvidence({
        childId,
        skillCode: gradeResult.contentItem.skillCode,
        attemptId: gradeResult.attemptId,
        contentItemId: gradeResult.contentItem.id,
        score: gradeResult.score,
        correct: gradeResult.correct,
        normalizedResponse: gradeResult.normalizedResponse,
      });

      // kids-pcg is the authoritative mastery store (Decision D1).
      pcgResult = await writeKidsPcgMasteryEvidence({
        childId,
        ownerId: body.ownerId,
        ownerIdHeader: readOwnerIdHeader(req),
        skillCode: gradeResult.contentItem.skillCode,
        score: gradeResult.score,
        correct: gradeResult.correct,
        attemptId: gradeResult.attemptId,
        contentItemId: gradeResult.contentItem.id,
      });
    }

    // One graded attempt = one minute of learning usage for controlled children.
    if (access.controlled) {
      await recordLearningUsage(dbPool, userId, 1);
    }

    const harnessEvents: HarnessPipelineEventInput[] = [
      {
        domain: harnessRequest.domain,
        type: HARNESS_EVENT_TYPES.ATTEMPT_SUBMITTED,
        userId: harnessRequest.userId,
        payload: {
          requestId: harnessRequest.requestId,
          attemptId: gradeResult.attemptId,
          childId,
          contentItemId,
          skillCode: gradeResult.contentItem.skillCode,
          correct: gradeResult.correct,
          score: gradeResult.score,
          masteryEligible: gradeResult.masteryEligible,
        },
      },
    ];

    if (gradeResult.masteryEligible) {
      harnessEvents.push({
        domain: harnessRequest.domain,
        type: HARNESS_EVENT_TYPES.MASTERY_UPDATED,
        userId: harnessRequest.userId,
        payload: {
          requestId: harnessRequest.requestId,
          attemptId: gradeResult.attemptId,
          childId,
          skillCode: gradeResult.contentItem.skillCode,
          correct: gradeResult.correct,
          score: gradeResult.score,
          postgres: postgresResult.status,
          kidsPcg: pcgResult.status,
        },
      });
    }

    const { response: harnessResponse } = await runHarnessPipeline({
      request: harnessRequest,
      startedAt,
      policyDecisions,
      safetyInputResult: 'pass',
      safetyOutputResult: 'pass',
      status: 'success',
      content: {
        correct: gradeResult.correct,
        score: gradeResult.score,
        feedback: gradeResult.feedback,
      },
      source: LEARN_ATTEMPT_SOURCE,
      model: LEARN_ATTEMPT_MODEL,
      contract: LEARN_ATTEMPT_CONTRACT,
      evaluation: {
        correct: gradeResult.correct,
        score: gradeResult.score,
        feedback: gradeResult.feedback,
        method: gradeResult.rubricResult ? 'rubric' : 'deterministic',
      },
      events: harnessEvents,
      eventWarnPrefix: '[api/learn/attempt] harness event emission failed:',
    });

    return res.status(200).json({
      attemptId: gradeResult.attemptId,
      contentItemId: gradeResult.contentItem.id,
      skillCode: gradeResult.contentItem.skillCode,
      correct: gradeResult.correct,
      score: gradeResult.score,
      feedback: gradeResult.feedback,
      hint,
      hintLevel,
      hintsAvailable,
      rubricResult: gradeResult.rubricResult,
      mastery: {
        eligible: gradeResult.masteryEligible,
        postgres: postgresResult,
        kidsPcg: pcgResult,
      },
      usage: access.controlled
        ? {
            minutes: access.currentUsageMinutes + 1,
            limit: access.dailyLimitMinutes,
            remaining: Math.max(0, access.remainingMinutes - 1),
            limitReached: access.currentUsageMinutes + 1 >= access.dailyLimitMinutes,
          }
        : null,
      harness: toApiHarnessMetadata(harnessResponse),
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Unknown content item:')) {
      return res.status(404).json({ error: error.message });
    }

    console.error('[api/learn/attempt] failed:', error);
    return res.status(500).json({ error: 'Failed to evaluate learning attempt' });
  }
}

async function writePostgresMasteryEvidence(input: {
  childId: string;
  skillCode: string;
  attemptId: string;
  contentItemId: string;
  score: number;
  correct: boolean;
  normalizedResponse: unknown;
}): Promise<MasteryWriteStatus> {
  try {
    await skillProgressService.recordSkillAssessment({
      childId: input.childId,
      skillCode: input.skillCode,
      sourceType: 'learn_attempt',
      sourceId: input.attemptId,
      score: input.score,
      evidenceType: 'accuracy',
      evidenceData: {
        contentItemId: input.contentItemId,
        normalizedResponse: input.normalizedResponse,
        correct: input.correct,
      },
    });

    return { status: 'recorded' };
  } catch (error) {
    if (LEARN_REQUIRE_POSTGRES_WRITE) {
      throw error;
    }

    console.warn('[api/learn/attempt] postgres mastery snapshot skipped:', error);
    return {
      status: 'failed',
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function writeKidsPcgMasteryEvidence(input: {
  childId: string;
  ownerId?: string;
  ownerIdHeader?: string;
  skillCode: string;
  score: number;
  correct: boolean;
  attemptId: string;
  contentItemId: string;
}): Promise<{ status: 'recorded' | 'skipped' | 'failed'; detail?: string }> {
  const ownerId = (input.ownerId || input.ownerIdHeader || KIDS_PCG_DEFAULT_OWNER_ID || input.childId).trim();

  if (!ownerId) {
    return {
      status: 'skipped',
      detail: 'No owner id available for kids-pcg write',
    };
  }

  if (!KIDS_PCG_ADMIN_KEY) {
    return {
      status: 'skipped',
      detail: 'KIDS_PCG_ADMIN_KEY is not configured',
    };
  }

  const targetUrl = `${KIDS_PCG_URL}${KIDS_PCG_EVIDENCE_PATH}`;

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-PCG-Key': KIDS_PCG_ADMIN_KEY,
        'X-PCG-Owner-Id': ownerId,
      },
      body: JSON.stringify({
        // Schema for POST /api/learner/mastery/evidence is { skill_id, correct,
        // source?, detail? }. skill_id is the skill CODE registered at seed time.
        // score/attempt context is carried in `detail` since they are not
        // first-class fields on the kids-pcg evidence model.
        skill_id: input.skillCode,
        correct: input.correct,
        source: 'learn_attempt',
        detail: JSON.stringify({
          attemptId: input.attemptId,
          contentItemId: input.contentItemId,
          score: input.score,
        }),
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      if (LEARN_REQUIRE_PCG_WRITE) {
        throw new Error(`kids-pcg mastery write failed (${response.status}): ${detail}`);
      }
      return {
        status: 'failed',
        detail: `kids-pcg responded ${response.status}`,
      };
    }

    return { status: 'recorded' };
  } catch (error) {
    if (LEARN_REQUIRE_PCG_WRITE) {
      throw error;
    }

    return {
      status: 'failed',
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

export function readUserId(session: { user?: unknown } | null): string {
  const user = session?.user as { id?: unknown } | undefined;
  return typeof user?.id === 'string' ? user.id : '';
}

export function normalizeAttemptNumber(value: unknown): number {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
}

export function readOwnerIdHeader(req: NextApiRequest): string {
  const headerValue = req.headers['x-pcg-owner-id'];
  if (!headerValue) {
    return '';
  }

  return Array.isArray(headerValue) ? headerValue[0] || '' : headerValue;
}

export function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}
