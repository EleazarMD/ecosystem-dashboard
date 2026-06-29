/**
 * Unified Companion Agent Turn API
 *
 * Contract: docs/FSD_AGENTIC_HARNESS.md §1.5 (Pi Code CLI)
 *           docs/AGENT_CONTEXT_HUB.md §5 (Context Hub)
 *
 * This is the single endpoint every child activity surface calls to get an
 * agent response. It:
 * 1. Resolves the active activity from the registry
 * 2. Composes a ContextEnvelope via the Context Hub
 * 3. Runs the Pi Code agent loop (cognitive loop with tool selection)
 * 4. Applies the Safety Lane (input/output filtering)
 * 5. Returns the agent's message + metadata
 *
 * The caller provides:
 * - message: what the child said
 * - activityId: which surface they're on (from the Activity Registry)
 * - contextState: a snapshot of the surface's state (for the ContextProvider)
 * - intent: optional routing hint (explain-this, hint, check-answer, talk)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { getChildServiceContext } from '@/lib/platform/child-service-middleware';
import { filterChildContent, logChildActivity } from '@/lib/platform/content-filter-service';
import { getAIChildSafetyMonitor } from '@/lib/kids-pic/AIChildSafetyMonitor';
import dbPool from '@/lib/db/client';
import { resolveDevelopmentalSummary } from '@/domains/learning/learner/developmental-profile-resolver';
import {
  activityRegistry,
  KNOWN_ACTIVITY_IDS,
  getContextHub,
  getPiCodeTransport,
  mergeRosters,
  type ContextFrame,
  type ContextProvider,
  type ToolRoster,
  type PersonaRef,
  type CompanionIntent,
  type ConceptCheckPayload,
  type HintCardPayload,
  type ExampleCardPayload,
  type CelebrationPayload,
  type PassagePayload,
} from '@/domains/learning/shared/activity-registry';

interface AgentTurnRequest {
  message: string;
  activityId?: string;
  intent?: CompanionIntent;
  contextState?: Record<string, unknown>;
  childId?: string;
}

interface AgentTurnResponse {
  response: string;
  source: string;
  activityId: string;
  toolsUsed: string[];
  hops: number;
  budgetExhausted: boolean;
  personaName?: string;
  /** Optional interactive concept-check the tutor posed (Brilliant-style). */
  conceptCheck?: ConceptCheckPayload;
  /** Optional rich message payloads. */
  hintCard?: HintCardPayload;
  exampleCard?: ExampleCardPayload;
  celebration?: CelebrationPayload;
  passage?: PassagePayload;
}

/** SSE event types streamed to the client. */
type SSEEvent =
  | { type: 'hop'; toolId: string; label: string; emoji: string }
  | { type: 'chunk'; text: string }
  | { type: 'done'; data: AgentTurnResponse }
  | { type: 'error'; error: string };

// ─── Inline context provider for ad-hoc state ──────────────────────────────

function createAdHocProvider(
  activityId: string,
  state: Record<string, unknown>,
): ContextProvider {
  return {
    activityId,
    getFrame: (): ContextFrame => {
      const title = (state.title as string) || activityId;
      const summary = (state.summary as string) || `The child is on ${activityId}.`;
      const entities = (state.entities as Record<string, string | number | string[]>) || {};
      const kind = (state.kind as ContextFrame['kind']) || 'custom';

      return {
        kind,
        activityId,
        title,
        summary,
        entities,
        payload: state,
      };
    },
  };
}

// ─── API handler ────────────────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AgentTurnResponse | { error: string }>,
) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Auth check
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { message, activityId, intent, contextState, childId } = req.body as AgentTurnRequest;

  console.log(`[agent-turn] Incoming request: activityId=${activityId} intent=${intent} message="${(message || '').slice(0, 100)}" wantsStream=${req.headers['accept'] === 'text/event-stream'}`);

  // Check if client wants SSE streaming
  const wantsStream = req.headers['accept'] === 'text/event-stream';

  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'Missing or invalid "message" field' });
    return;
  }

  // Resolve activity
  const resolvedActivityId = activityId || KNOWN_ACTIVITY_IDS.FREE_CHAT;
  const activity = activityRegistry.get(resolvedActivityId);
  console.log(`[agent-turn] Resolved activity: ${resolvedActivityId} — found=${!!activity} name=${activity?.name || '(none)'}`);

  // Get child service context (safety, access control)
  let safetySystemPrompt: string | undefined;
  let childName: string | undefined;
  try {
    const childCtx = await getChildServiceContext(req, res);
    safetySystemPrompt = childCtx.safetySystemPrompt;
    childName = childCtx.childName;
  } catch {
    // Not a child session — proceed without child-specific safety
  }

  // Input safety filter
  const filterChildId = childId || session.user.id;
  let filteredMessage = message;
  try {
    const inputFilter = await filterChildContent(filterChildId, message, 'input');
    filteredMessage = inputFilter.filteredContent || message;
  } catch {
    // Filter failure — use original message
  }

  // Set up the Context Hub
  const hub = getContextHub();

  // Register an ad-hoc provider if contextState is provided
  if (contextState && Object.keys(contextState).length > 0) {
    hub.registerProvider(createAdHocProvider(resolvedActivityId, contextState));
  }

  // Set focus to the active activity
  hub.setFocus(resolvedActivityId);

  // Set learner summary if we have child context
  if (childName || filterChildId) {
    // Resolve developmental profile from DB + performance data
    let developmental;
    try {
      developmental = await resolveDevelopmentalSummary(filterChildId, childName);
      console.log(`[agent-turn] Developmental profile resolved: ${developmental ? `age=${developmental.age} cognitive=${developmental.cognitiveLevel}` : '(none)'}`);
    } catch (e) {
      console.log(`[agent-turn] Developmental profile resolution failed: ${(e as Error).message}`);
    }

    hub.setLearnerSummary({
      childUserId: filterChildId,
      childName,
      ageBand: developmental?.ageBand,
      skillMastery: undefined,
      recentTopics: [],
      developmental,
    });
  }

  // Get the transport
  const transport = getPiCodeTransport();

  // Build the transport request
  const composed = await hub.composeEnvelope().catch(() => null);

  const request = {
    messages: [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role: 'user' as const,
        content: filteredMessage,
        timestamp: Date.now(),
        intent: intent || ('talk' as CompanionIntent),
      },
    ],
    intent: intent || ('talk' as CompanionIntent),
    context: composed?.envelope || {
      focus: {
        kind: 'conversation' as const,
        activityId: resolvedActivityId,
        title: activity?.name || 'Chat',
        summary: `The child is on ${activity?.name || 'a surface'}.`,
      },
      safety: { contentFilter: 'strict' as const, user_type: 'child' as const },
      assembledAt: new Date().toISOString(),
    },
    persona: activity?.persona,
    roster: mergeRosters(composed?.roster || activity?.toolRoster || undefined),
    childUserId: filterChildId,
  };

  console.log(`[agent-turn] Request roster tools: [${request.roster?.tools?.map(t => t.id).join(', ') || '(empty)'}]`);
  console.log(`[agent-turn] Envelope focus: activityId=${request.context?.focus?.activityId} title="${request.context?.focus?.title}" summary="${request.context?.focus?.summary?.slice(0, 100)}"`);
  console.log(`[agent-turn] Persona: ${request.persona?.name || '(none)'}`);

  // Run the agent loop
  if (wantsStream) {
    // ─── SSE Streaming path ───────────────────────────────────────────────
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendSSE = (event: SSEEvent) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    try {
      let finalMessage = '';
      let finalResult: any = null;

      for await (const event of transport.stream(request)) {
        if (event.type === 'hop') {
          sendSSE({ type: 'hop', toolId: event.toolId, label: event.label, emoji: event.emoji });
        } else if (event.type === 'chunk') {
          // Stream hop output as chunks
          if (event.text) {
            sendSSE({ type: 'chunk', text: event.text });
          }
        } else if (event.type === 'done') {
          finalResult = event.message;
          finalMessage = event.message.content;
        } else if (event.type === 'error') {
          sendSSE({ type: 'error', error: event.error });
          res.end();
          return;
        }
      }

      if (!finalResult) {
        sendSSE({ type: 'error', error: 'Agent loop produced no result' });
        res.end();
        return;
      }

      // Post-loop safety + logging (same as non-streaming path)
      const toolsUsed = finalResult.metadata?.toolsUsed || [];
      const hops = finalResult.metadata?.hops || 0;
      const budgetExhausted = finalResult.metadata?.budgetExhausted || false;

      let filteredResponse = finalResult.content;
      try {
        const outputFilter = await filterChildContent(filterChildId, finalResult.content, 'output');
        filteredResponse = outputFilter.filteredContent || finalResult.content;
      } catch {}

      try {
        const monitor = getAIChildSafetyMonitor(dbPool);
        await monitor.analyzeMessage({
          childId: filterChildId,
          sessionId: `agent_turn_${Date.now()}`,
          childMessage: filteredMessage,
          aiResponse: filteredResponse,
          characterId: resolvedActivityId,
          aiModel: 'picode_agent_loop',
          timestamp: new Date(),
        });
      } catch {}

      try {
        await logChildActivity(filterChildId, `agent-turn:${resolvedActivityId}`, {
          serviceId: 'picode_agent_loop',
          userMessage: filteredMessage,
          aiResponse: filteredResponse,
          metadata: {
            intent: intent || 'talk',
            toolsUsed,
            source: finalResult.metadata?.source || 'picode_agent_loop',
          },
        });
      } catch {}

      await hub.recordOutcome({
        childId: filterChildId,
        activityId: resolvedActivityId,
        message: filteredMessage,
        response: filteredResponse,
        toolsUsed,
        source: finalResult.metadata?.source || 'picode_agent_loop',
      });

      const responseData: AgentTurnResponse = {
        response: filteredResponse,
        source: finalResult.metadata?.source || 'picode_agent_loop',
        activityId: resolvedActivityId,
        toolsUsed,
        hops,
        budgetExhausted,
        personaName: activity?.persona?.name,
        conceptCheck: finalResult.conceptCheck,
        hintCard: finalResult.hintCard,
        exampleCard: finalResult.exampleCard,
        celebration: finalResult.celebration,
        passage: finalResult.passage,
      };

      sendSSE({ type: 'done', data: responseData });
      res.end();
      return;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      sendSSE({ type: 'error', error: errorMsg });
      res.end();
      return;
    }
  }

  // ─── Non-streaming path (original) ────────────────────────────────────
  let result;
  try {
    result = await transport.send(request);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Agent loop failed: ${errorMsg}` });
    return;
  }

  const toolsUsed = result.metadata?.toolsUsed || [];
  const hops = result.metadata?.hops || 0;
  const budgetExhausted = result.metadata?.budgetExhausted || false;

  // Output safety filter
  let filteredResponse = result.content;
  try {
    const outputFilter = await filterChildContent(filterChildId, result.content, 'output');
    filteredResponse = outputFilter.filteredContent || result.content;
  } catch {
    // Filter failure — use original response
  }

  // AI Safety Monitor pass
  try {
    const monitor = getAIChildSafetyMonitor(dbPool);
    await monitor.analyzeMessage({
      childId: filterChildId,
      sessionId: `agent_turn_${Date.now()}`,
      childMessage: filteredMessage,
      aiResponse: filteredResponse,
      characterId: resolvedActivityId,
      aiModel: 'picode_agent_loop',
      timestamp: new Date(),
    });
  } catch {
    // Safety monitor failure is non-blocking
  }

  // Log activity
  try {
    await logChildActivity(filterChildId, `agent-turn:${resolvedActivityId}`, {
      serviceId: 'picode_agent_loop',
      userMessage: filteredMessage,
      aiResponse: filteredResponse,
      metadata: {
        intent: intent || 'talk',
        toolsUsed,
        source: result.metadata?.source || 'picode_agent_loop',
      },
    });
  } catch {
    // Logging failure is non-blocking
  }

  // Record outcome in the Context Hub
  await hub.recordOutcome({
    childId: filterChildId,
    activityId: resolvedActivityId,
    message: filteredMessage,
    response: filteredResponse,
    toolsUsed,
    source: result.metadata?.source || 'picode_agent_loop',
  });

  const response: AgentTurnResponse = {
    response: filteredResponse,
    source: result.metadata?.source || 'picode_agent_loop',
    activityId: resolvedActivityId,
    toolsUsed,
    hops,
    budgetExhausted,
    personaName: activity?.persona?.name,
    conceptCheck: result.conceptCheck,
    hintCard: result.hintCard,
    exampleCard: result.exampleCard,
    celebration: result.celebration,
    passage: result.passage,
  };

  res.status(200).json(response);
}
