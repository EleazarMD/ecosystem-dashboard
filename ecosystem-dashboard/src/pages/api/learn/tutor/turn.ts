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
} from '@/domains/learning/features/tutor-turn';
import type { ConversationTurn, MasteryContext, SessionPhase } from '@/domains/learning/shared/agent-loop-types';
import type { ContextEnvelope, ContextFrame, ContextFocusKind } from '@/domains/learning/shared/context-hub';
import { getContextHub } from '@/domains/learning/shared/context-hub-service';
import { KNOWN_ACTIVITY_IDS, activityRegistry } from '@/domains/learning/shared/activity-types';
import { getPiCodeTransport } from '@/domains/learning/shared/activity-registry';
import { mergeRosters } from '@/domains/learning/shared/tool-roster';
import type { CompanionIntent } from '@/domains/learning/shared/agent-transport';
import { resolveDevelopmentalSummary } from '@/domains/learning/learner/developmental-profile-resolver';
import { getDreamEngine } from '@/domains/learning/analytics/dream-engine';
import { normalizeAttemptNumber, readUserId } from '../attempt';

interface TutorTurnRequestBody {
  childId?: unknown;
  contentItemId?: unknown;
  message?: unknown;
  response?: unknown;
  attemptNumber?: unknown;
  sessionId?: unknown;
  context?: unknown;
  conversationHistory?: unknown;
  mastery?: unknown;
  sessionPhase?: unknown;
  correct?: unknown;
}

/** Loosely-typed on-screen focus frame the client may send (Context Hub §3). */
export interface TutorContextFrameInput {
  kind?: string;
  activityId?: string;
  title?: string;
  summary?: string;
  entities?: Record<string, string | number | string[]>;
}

interface TutorTurnInput {
  childId: string;
  contentItemId: string;
  message: string;
  attemptNumber: number;
  sessionId?: string;
  context?: TutorContextFrameInput;
  conversationHistory?: ConversationTurn[];
  mastery?: MasteryContext;
  sessionPhase?: SessionPhase;
  correct?: boolean;
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

    // Wire the Context Hub for this turn — set focus to learn-hub, register an
    // ad-hoc provider from the client-supplied context frame, and set the
    // learner summary from PCG. The PiCodeTransport reads this when composing
    // the ContextEnvelope for the agent loop.
    const hub = getContextHub();
    hub.setFocus(KNOWN_ACTIVITY_IDS.LEARN_HUB);
    if (pcgContext) {
      // Resolve developmental profile from DB + performance
      let developmental;
      try {
        developmental = await resolveDevelopmentalSummary(childUserId, pcgContext.childName, pcgContext.ageGroup);
      } catch {}

      // Feed dream insights into the Context Hub so the tutor starts
      // each session already informed by overnight consolidation (Phase 8).
      const dreamInsights = getDreamEngine().getInsights(childUserId, 3);
      const recentInsights = dreamInsights
        .filter((i) => i.actionable)
        .map((i) => i.insight)
        .slice(0, 3);

      hub.setLearnerSummary({
        childName: pcgContext.childName,
        ageBand: developmental?.ageBand || pcgContext.ageGroup,
        skillMastery: undefined,
        recentTopics: pcgContext.interests?.slice(0, 5) || [],
        personaId: undefined,
        developmental,
        recentInsights: recentInsights.length > 0 ? recentInsights : undefined,
      });
    }

    // PI Code Convergence (§8.2): Run the agent via PiCodeTransport — the same
    // cognitive loop used by all child surfaces (chat, home, companion). The
    // transport reads the Context Hub envelope we just set up and uses the
    // learn-hub activity roster (which includes ask_socratic, give_hint, etc.).
    const intent: CompanionIntent = input.correct === true ? 'talk'
      : input.correct === false ? 'hint'
      : 'explain-this';

    // Register an ad-hoc provider so the transport sees the content item context
    hub.registerProvider({
      activityId: KNOWN_ACTIVITY_IDS.LEARN_HUB,
      getFrame: (): ContextFrame => ({
        kind: 'lesson',
        activityId: KNOWN_ACTIVITY_IDS.LEARN_HUB,
        title: contentItem.prompt.slice(0, 80),
        summary: learnerMessage,
        entities: {
          contentItemId: contentItem.id,
          lessonId: contentItem.id,
          skillCode: contentItem.skillCode,
          attemptNumber: input.attemptNumber,
        },
        payload: {
          prompt: contentItem.prompt,
          hintSet,
          conversationHistory: input.conversationHistory,
          mastery: input.mastery,
          sessionPhase: input.sessionPhase,
          correct: input.correct,
        },
      }),
    });

    const activity = activityRegistry.get(KNOWN_ACTIVITY_IDS.LEARN_HUB);
    const transport = getPiCodeTransport();
    const composed = await hub.composeEnvelope().catch(() => null);

    const transportResult = await transport.send({
      messages: [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          role: 'user',
          content: learnerMessage,
          timestamp: Date.now(),
          intent,
        },
        ...(input.conversationHistory || []).map((turn) => ({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          role: turn.role,
          content: turn.content,
          timestamp: turn.timestamp || Date.now(),
        })),
      ],
      intent,
      context: composed?.envelope || {
        focus: {
          kind: 'lesson',
          activityId: KNOWN_ACTIVITY_IDS.LEARN_HUB,
          title: contentItem.prompt.slice(0, 80),
          summary: learnerMessage,
        },
        safety: { contentFilter: 'strict', user_type: 'child' },
        assembledAt: new Date().toISOString(),
      },
      persona: activity?.persona,
      roster: mergeRosters(composed?.roster || activity?.toolRoster || undefined),
      childUserId: childUserId,
    });

    const rawTutorMessage = transportResult.content;
    const orchestratorSource = transportResult.metadata?.source || 'picode_agent_loop';
    const toolsUsed = transportResult.metadata?.toolsUsed || [];
    const hopsExecuted = transportResult.metadata?.hops || 0;
    const budgetExhausted = transportResult.metadata?.budgetExhausted || false;

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
        aiModel: LEARN_TUTOR_MODEL,
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
        aiSource: orchestratorSource,
        aiModel: LEARN_TUTOR_MODEL,
        aiContract: LEARN_TUTOR_CONTRACT,
        toolsUsed,
        hopsExecuted,
        safetyFlagged,
        safetyBlocked,
      },
    });

    const harnessEvents: HarnessPipelineEventInput[] = [];
    if (orchestratorSource !== 'picode_agent_loop') {
      harnessEvents.push({
        domain: harnessRequest.domain,
        type: HARNESS_EVENT_TYPES.AGENT_FALLBACK,
        userId: harnessRequest.userId,
        sessionId: harnessRequest.sessionId,
        payload: {
          requestId: harnessRequest.requestId,
          source: orchestratorSource,
          model: LEARN_TUTOR_MODEL,
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
        source: orchestratorSource,
        toolsUsed,
        hopsExecuted,
      },
    });

    const { response: harnessResponse } = await runHarnessPipeline({
      request: harnessRequest,
      startedAt,
      policyDecisions,
      safetyInputResult,
      safetyOutputResult,
      status: orchestratorSource === 'picode_agent_loop' ? 'success' : 'fallback',
      content: finalTutorMessage,
      source: orchestratorSource,
      model: LEARN_TUTOR_MODEL,
      contract: LEARN_TUTOR_CONTRACT,
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
      source: orchestratorSource,
      model: LEARN_TUTOR_MODEL,
      contract: LEARN_TUTOR_CONTRACT,
      trajectory: [],
      hopsExecuted,
      toolsUsed,
      budgetExhausted,
      conceptCheck: transportResult.conceptCheck,
      hintCard: transportResult.hintCard,
      exampleCard: transportResult.exampleCard,
      celebration: transportResult.celebration,
      passage: transportResult.passage,
      personaName: activity?.persona?.name,
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
      context: coerceContextFrame(body.context),
      conversationHistory: coerceConversationHistory(body.conversationHistory),
      mastery: coerceMastery(body.mastery),
      sessionPhase: coerceSessionPhase(body.sessionPhase),
      correct: typeof body.correct === 'boolean' ? body.correct : undefined,
    },
  };
}

/**
 * Defensively coerce a client-supplied context payload into a focus frame.
 * Accepts either a full ContextEnvelope (with `.focus`) or a bare ContextFrame,
 * and caps string/collection sizes to keep the prompt bounded.
 */
export function coerceContextFrame(raw: unknown): TutorContextFrameInput | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const frame = (obj.focus && typeof obj.focus === 'object' ? obj.focus : obj) as Record<string, unknown>;

  const out: TutorContextFrameInput = {};
  if (typeof frame.kind === 'string') out.kind = frame.kind.slice(0, 40);
  if (typeof frame.activityId === 'string') out.activityId = frame.activityId.slice(0, 80);
  if (typeof frame.title === 'string') out.title = frame.title.slice(0, 200);
  if (typeof frame.summary === 'string') out.summary = frame.summary.slice(0, 1000);
  if (frame.entities && typeof frame.entities === 'object') {
    const entities: Record<string, string | number | string[]> = {};
    for (const [key, value] of Object.entries(frame.entities as Record<string, unknown>).slice(0, 20)) {
      if (typeof value === 'string') entities[key] = value.slice(0, 200);
      else if (typeof value === 'number') entities[key] = value;
      else if (Array.isArray(value)) {
        entities[key] = value.filter((x): x is string => typeof x === 'string').slice(0, 20);
      }
    }
    out.entities = entities;
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * Defensively coerce client-supplied conversation history into typed turns.
 * Caps to last 20 turns and truncates content to 500 chars each.
 */
export function coerceConversationHistory(raw: unknown): ConversationTurn[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const turns: ConversationTurn[] = [];
  for (const item of raw.slice(-20)) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const role = obj.role === 'user' || obj.role === 'assistant' ? obj.role : null;
    if (!role) continue;
    const content = typeof obj.content === 'string' ? obj.content.slice(0, 500) : '';
    if (!content) continue;
    const turn: ConversationTurn = { role, content };
    if (typeof obj.timestamp === 'number') turn.timestamp = obj.timestamp;
    if (Array.isArray(obj.toolsUsed)) {
      turn.toolsUsed = obj.toolsUsed.filter((t): t is string => typeof t === 'string').slice(0, 10);
    }
    turns.push(turn);
  }
  return turns.length > 0 ? turns : undefined;
}

/**
 * Defensively coerce client-supplied mastery signals.
 */
export function coerceMastery(raw: unknown): MasteryContext | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const mastery: MasteryContext = {};
  if (obj.skillMastery && typeof obj.skillMastery === 'object') {
    const sm: Record<string, number> = {};
    for (const [k, v] of Object.entries(obj.skillMastery as Record<string, unknown>)) {
      if (typeof v === 'number' && v >= 0 && v <= 1) sm[k] = v;
    }
    if (Object.keys(sm).length > 0) mastery.skillMastery = sm;
  }
  if (typeof obj.currentSkill === 'string') mastery.currentSkill = obj.currentSkill;
  if (typeof obj.sessionCorrect === 'number') mastery.sessionCorrect = obj.sessionCorrect;
  if (typeof obj.sessionAttempts === 'number') mastery.sessionAttempts = obj.sessionAttempts;
  if (typeof obj.currentStreak === 'number') mastery.currentStreak = obj.currentStreak;
  return Object.keys(mastery).length > 0 ? mastery : undefined;
}

/**
 * Defensively coerce client-supplied session phase string.
 */
export function coerceSessionPhase(raw: unknown): SessionPhase | undefined {
  if (typeof raw !== 'string') return undefined;
  const valid: SessionPhase[] = ['opening', 'coaching', 'celebrating', 'closing', 'free_chat'];
  return valid.includes(raw as SessionPhase) ? (raw as SessionPhase) : undefined;
}

/**
 * Build a server-side ContextEnvelope from the coerced focus frame. Client focus
 * (the specific card / Pokémon / quiz on screen) wins; content-item defaults
 * (contentItemId / attemptNumber) are always merged in so tools can reference them.
 */
export function buildTutorContextEnvelope(
  frame: TutorContextFrameInput | undefined,
  contentPrompt: string,
  defaults?: { contentItemId?: string; subject?: string; attemptNumber?: number },
): ContextEnvelope {
  const defaultEntities: Record<string, string | number | string[]> = {};
  if (defaults?.contentItemId) {
    defaultEntities.contentItemId = defaults.contentItemId;
    defaultEntities.lessonId = defaults.contentItemId;
  }
  if (defaults?.attemptNumber != null) defaultEntities.attemptNumber = defaults.attemptNumber;

  const focus: ContextFrame = {
    kind: (frame?.kind as ContextFocusKind) || 'lesson',
    activityId: frame?.activityId || 'learn-hub',
    title: frame?.title || defaults?.subject || contentPrompt.slice(0, 80),
    summary: frame?.summary,
    entities: { ...defaultEntities, ...(frame?.entities || {}) },
  };
  return {
    focus,
    safety: { contentFilter: 'strict', user_type: 'child' },
    assembledAt: new Date().toISOString(),
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
