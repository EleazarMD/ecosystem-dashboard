/**
 * Tutor Companion + Agent Transport — the always-present agent UI and its
 * transport seam.
 *
 * Contract: docs/KIDS_PLATFORM_CONTRACTS.md §4
 */

import { ContextEnvelope } from './context-hub';
import { ToolRoster } from './tool-roster';

/** Persona reference — maps to PCGCharacterContext. */
export interface PersonaRef {
  id: string;
  name: string;
  /** System-prompt fragment injected into the transport. */
  systemPrompt?: string;
  /** Avatar URL or emoji. */
  avatar?: string;
}

/** Intents the companion can route (§9.1: intent-routed transport).
 *
 * All intents now route through the unified /api/child/companion/agent-turn
 * endpoint (PiCodeTransport + Context Hub). */
export type CompanionIntent =
  | 'explain-this'  // learning affordance → agent-turn (intent: 'explain-this')
  | 'hint'          // learning affordance → agent-turn (intent: 'hint')
  | 'check-answer'  // learning affordance → agent-turn (intent: 'check-answer')
  | 'talk'          // free-chat → agent-turn (intent: 'talk')
  | 'custom';

/**
 * An interactive concept-check the tutor can pose inline (Brilliant "Koji"
 * mechanic: teach by letting the learner predict, then reveal the "why").
 * The UI renders this as a ConceptCheckCard.
 */
export interface ConceptCheckPayload {
  question: string;
  choices: { id: string; label: string; correct: boolean }[];
  /** The "why" revealed after the learner commits an answer. */
  explanation: string;
  /** Optional Socratic nudge after a first wrong attempt. */
  hint?: string;
  /** Skill this check maps to (feeds mastery tracking). */
  skillCode?: string;
}

/** Tiered hint card — Brilliant-style hint ladder that never gives the answer. */
export interface HintCardPayload {
  hints: string[];
  currentLevel: number;
}

/** Worked example with step-by-step reveal. */
export interface ExampleCardPayload {
  title: string;
  steps: string[];
}

/** Celebration burst — animated praise + XP gain. */
export interface CelebrationPayload {
  emoji: string;
  message: string;
  xpGained: number;
}

/** Embedded reading passage with optional read-aloud. */
export interface PassagePayload {
  title: string;
  text: string;
}

/** A single message in the companion conversation. */
export interface CompanionMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  /** Intent that produced this message (if any). */
  intent?: CompanionIntent;
  /** Optional interactive concept-check rendered beneath the message. */
  conceptCheck?: ConceptCheckPayload;
  /** Optional tiered hint card. */
  hintCard?: HintCardPayload;
  /** Optional worked example card. */
  exampleCard?: ExampleCardPayload;
  /** Optional celebration burst. */
  celebration?: CelebrationPayload;
  /** Optional embedded reading passage. */
  passage?: PassagePayload;
  metadata?: {
    source?: string;
    toolsUsed?: string[];
    hops?: number;
    budgetExhausted?: boolean;
  };
}

/** Streamed event from the transport (hop, chunk, done, error). */
export type AgentEvent =
  | { type: 'hop'; toolId: string; label: string; emoji: string }
  | { type: 'chunk'; text: string }
  | { type: 'done'; message: CompanionMessage }
  | { type: 'error'; error: string };

/** Request payload sent to the transport. */
export interface AgentTransportRequest {
  messages: CompanionMessage[];
  intent: CompanionIntent;
  context: ContextEnvelope;
  persona?: PersonaRef;
  roster?: ToolRoster;
  /** Authenticated child user id — lets tools fetch real learner data. */
  childUserId?: string;
}

/** The swap-point seam: any transport implements this. */
export interface AgentTransport {
  /** Stream events as they arrive. */
  stream(req: AgentTransportRequest): AsyncIterable<AgentEvent>;
  /** Non-streaming convenience. */
  send?(req: AgentTransportRequest): Promise<CompanionMessage>;
}

/** Props the Tutor Companion UI consumes. */
export interface CompanionProps {
  /** Current activity id (drives theming + context). */
  activityId: string;
  /** Transport instance (injected — Companion AI now, PiCode later). */
  transport: AgentTransport;
  /** Context provider for the current surface. */
  contextEnvelope: ContextEnvelope;
  /** Persona for this activity. */
  persona?: PersonaRef;
  /** Tool roster for this activity. */
  roster?: ToolRoster;
  /** Callback when the companion emits a learning outcome. */
  onOutcome?: (outcome: { activityId: string; skillCode?: string; correct: boolean }) => void;
}
