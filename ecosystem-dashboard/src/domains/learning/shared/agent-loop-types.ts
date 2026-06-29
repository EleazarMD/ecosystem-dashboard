/**
 * Agent Loop Types — contract for the cognitive loop that replaces the
 * single-shot LLM call with a tool-using agent loop (Phase 6 / Phase E).
 *
 * Contract: docs/FSD_AGENTIC_HARNESS.md §1.3 (cognitive loop) + §1.5 (Pi Code CLI)
 *           docs/KIDS_DASHBOARD_HARNESS_AUDIT.md Phase 6
 *
 * The loop runs perceive → reason → plan → act → reflect, and during the
 * act phase it may autonomously select tools from the gated roster. Every
 * tool hop passes the Tool Gate (allow-list + safety lane + budget).
 */

import type { ToolRoster, ToolId, ToolGateResult } from './tool-roster';
import type { ContextEnvelope } from './context-hub';
import type { PersonaRef } from './agent-transport';
import type { AdaptationPlan } from '../learner/learner-types';
import type { HarnessSafetyResult } from '@/lib/harness/types';

// ─── Tool call trajectory (audit trail) ─────────────────────────────────────

export interface ToolCall {
  toolId: ToolId;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolId: ToolId;
  success: boolean;
  output: string;
  /** Gate decision for this hop. */
  gate: ToolGateResult;
  /** Safety result for this hop's output. */
  safetyResult: HarnessSafetyResult;
  /** Latency in ms. */
  latencyMs: number;
}

export interface ToolTrajectoryEntry {
  call: ToolCall;
  result: ToolResult;
  /** Hop index (0-based). */
  hop: number;
}

// ─── Conversation history (session memory) ──────────────────────────────────

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  /** Timestamp (ms epoch). */
  timestamp?: number;
  /** Tool calls made during this turn (assistant turns only). */
  toolsUsed?: string[];
}

// ─── Mastery context ────────────────────────────────────────────────────────

export interface MasteryContext {
  /** Skill code → mastery score (0–1). */
  skillMastery?: Record<string, number>;
  /** Current skill being practiced. */
  currentSkill?: string;
  /** Number of correct answers this session. */
  sessionCorrect?: number;
  /** Number of total attempts this session. */
  sessionAttempts?: number;
  /** Current streak (consecutive correct). */
  currentStreak?: number;
}

// ─── Agent loop input / output ──────────────────────────────────────────────

export interface AgentLoopInput {
  /** The learner's message or request. */
  learnerMessage: string;
  /** Content item prompt (the problem / question being worked on). */
  contentPrompt: string;
  /** Content item ID. */
  contentItemId: string;
  /** Skill code for the content item. */
  skillCode: string;
  /** Current attempt number (1-based). */
  attemptNumber: number;
  /** Available hints for the content item. */
  hintSet: string[];
  /** The tool roster for this activity (gated allow-list). */
  roster: ToolRoster;
  /** Context envelope (in-focus + long-form PCG context). */
  context: ContextEnvelope;
  /** Persona for the tutor. */
  persona?: PersonaRef;
  /** Safety system prompt from child service context. */
  safetySystemPrompt?: string;
  /** PCG learner context (name, age, interests, goals). */
  pcgContext?: {
    childName?: string;
    ageGroup?: string;
    interests?: string[];
    goals?: string[];
  } | null;
  /** Per-turn tool-call budget (max hops). Default: 3. */
  maxHops?: number;
  /** Child user ID for safety filtering. */
  childUserId: string;
  /** Prior conversation turns in this session (session memory). */
  conversationHistory?: ConversationTurn[];
  /** Current mastery signals for the learner. */
  mastery?: MasteryContext;
  /** Phase of the learning session this turn is in. */
  sessionPhase?: SessionPhase;
  /** Adaptation plan from AdaptationEngine (pacing, difficulty, hints, celebration). */
  adaptationPlan?: AdaptationPlan;
}

/** Where in the session lifecycle this agent turn is firing. */
export type SessionPhase =
  | 'opening'    // session just started — greet + set goals
  | 'coaching'   // mid-session coaching after an incorrect attempt
  | 'celebrating' // correct answer — celebrate + recommend next
  | 'closing'    // session ending — reflect + recap
  | 'free_chat';  // free-form conversation (not tied to a content item)

export interface AgentLoopResult {
  /** The final tutor message delivered to the learner. */
  message: string;
  /** Source: 'agent_loop' or 'fallback_deterministic'. */
  source: 'agent_loop' | 'fallback_deterministic';
  /** Model used for reasoning. */
  model: string;
  /** Contract identifier. */
  contract: string;
  /** Full tool-call trajectory for audit. */
  trajectory: ToolTrajectoryEntry[];
  /** Number of hops executed. */
  hopsExecuted: number;
  /** Whether the loop hit the budget cap. */
  budgetExhausted: boolean;
  /** Which tools were called (by id). */
  toolsUsed: ToolId[];
}
