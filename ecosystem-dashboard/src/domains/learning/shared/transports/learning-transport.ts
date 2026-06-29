/**
 * Learning Agent Transport — interim transport that routes by intent.
 *
 * Contract: docs/KIDS_PLATFORM_CONTRACTS.md §4 + §9.1
 *
 * DEPRECATED: All surfaces now call /api/child/companion/agent-turn directly
 * (PiCodeTransport + Context Hub). This transport is kept as a fallback seam.
 * The original routing was:
 * - Learning intents (explain-this, hint, check-answer) → POST /api/learn/tutor/turn
 * - Free-chat intent (talk) → POST /api/child/companion/chat
 * Both are now superseded by the unified agent-turn endpoint.
 */

import {
  AgentTransport,
  AgentTransportRequest,
  AgentEvent,
  CompanionMessage,
  CompanionIntent,
} from '../agent-transport';
import { ContextEnvelope } from '../context-hub';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Intent → endpoint mapping. */
const LEARNING_INTENTS: CompanionIntent[] = ['explain-this', 'hint', 'check-answer'];

function isLearningIntent(intent: CompanionIntent): boolean {
  return LEARNING_INTENTS.includes(intent);
}

/** Build the request body for the unified agent-turn endpoint. */
function buildAgentTurnBody(req: AgentTransportRequest): Record<string, unknown> {
  const lastUserMsg = [...req.messages].reverse().find((m) => m.role === 'user');
  const entities = req.context.focus.entities ?? {};

  return {
    message: lastUserMsg?.content ?? '',
    activityId: req.context.focus.activityId ?? 'free-chat',
    intent: req.intent ?? 'talk',
    childId: entities.childId ?? undefined,
    contextState: {
      contentItemId: entities.lessonId ?? entities.contentItemId ?? undefined,
      attemptNumber: entities.attemptNumber ?? undefined,
      sessionId: req.context.focus.payload?.sessionId,
      ...req.context.focus.payload,
    },
  };
}

/** Extract the response text from either endpoint's JSON. */
function extractResponseText(data: any): string {
  if (typeof data === 'string') return data;
  if (data.response) return data.response;
  if (data.tutorMessage) return data.tutorMessage;
  if (data.message) return data.message;
  if (data.content) return data.content;
  return 'Sorry, I did not understand that. Can you try again?';
}

/**
 * LearningTransport: non-streaming (collects full response, emits as a single
 * chunk + done event). Streaming will come with PiCodeTransport.
 */
export class LearningTransport implements AgentTransport {
  async *stream(req: AgentTransportRequest): AsyncIterable<AgentEvent> {
    const endpoint = '/api/child/companion/agent-turn';
    const body = buildAgentTurnBody(req);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText);
        yield { type: 'error', error: `Transport error (${res.status}): ${errText}` };
        return;
      }

      const data = await res.json();
      const text = extractResponseText(data);

      // Emit as a single chunk (non-streaming interim).
      yield { type: 'chunk', text };

      const message: CompanionMessage = {
        id: generateId(),
        role: 'assistant',
        content: text,
        timestamp: Date.now(),
        intent: req.intent,
      };

      yield { type: 'done', message };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      yield { type: 'error', error: errorMsg };
    }
  }

  async send(req: AgentTransportRequest): Promise<CompanionMessage> {
    let result: CompanionMessage | null = null;
    for await (const event of this.stream(req)) {
      if (event.type === 'done') {
        result = event.message;
      }
      if (event.type === 'error') {
        result = {
          id: generateId(),
          role: 'assistant',
          content: 'Oops! Something went wrong. Can you try again? 🤔',
          timestamp: Date.now(),
          intent: req.intent,
        };
      }
    }
    return result ?? {
      id: generateId(),
      role: 'assistant',
      content: '...',
      timestamp: Date.now(),
      intent: req.intent,
    };
  }
}

/** Singleton instance (swap to PiCodeTransport later). */
export const learningTransport = new LearningTransport();

/**
 * Build a ContextEnvelope from a ContextFrame and optional learner summary.
 * Convenience for activity hosts.
 */
export function buildContextEnvelope(
  focus: ContextEnvelope['focus'],
  opts?: {
    learner?: ContextEnvelope['learner'];
    toolRosterId?: string;
  },
): ContextEnvelope {
  return {
    focus,
    learner: opts?.learner,
    toolRosterId: opts?.toolRosterId,
    safety: {
      contentFilter: 'strict',
      user_type: 'child',
    },
    assembledAt: new Date().toISOString(),
  };
}
