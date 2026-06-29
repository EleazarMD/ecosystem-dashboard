/**
 * Context Hub — typed units for feeding the agent context spine.
 *
 * Contract: docs/KIDS_PLATFORM_CONTRACTS.md §3
 * Supersedes the inline sketches in docs/AGENT_CONTEXT_HUB.md.
 */

/** Discriminated union of focus-frame kinds the agent can receive. */
export type ContextFocusKind =
  | 'lesson'      // structured lesson step / card
  | 'explorer'    // free-exploration surface (e.g. Pokemon explorer)
  | 'quiz'        // active quiz question
  | 'conversation' // free-chat
  | 'dashboard'   // child home / overview
  | 'custom';     // activity-specific extension

/** In-focus context: what is on screen right now. */
export interface ContextFrame {
  kind: ContextFocusKind;
  activityId: string;
  /** Human-readable title of the current surface. */
  title: string;
  /** Short text the agent can narrate or reference. */
  summary?: string;
  /** Structured key-value pairs the agent can reason about (e.g. { pokemon: 'pikachu', type: 'electric' }). */
  entities?: Record<string, string | number | string[]>;
  /** Optional blob for richer context (JSON-serialisable). */
  payload?: Record<string, unknown>;
}

/** Long-form summary of the learner's state, fed as background context. */
export interface LearnerModelSummary {
  childUserId?: string;
  childName?: string;
  ageBand?: string;
  /** Skill codes the child is working on, mapped to mastery 0–1. */
  skillMastery?: Record<string, number>;
  /** Recent activity highlights. */
  recentTopics?: string[];
  /** PCG persona / character context id. */
  personaId?: string;
  /** Compact developmental profile for LLM adaptation. */
  developmental?: import('../learner/developmental-profile').DevelopmentalSummary;
  /** Recent insights from the Dream Engine (overnight consolidation). */
  recentInsights?: string[];
}

/** Per-surface adapter that emits a ContextFrame. */
export interface ContextProvider {
  activityId: string;
  /** Called by the host to get the current focus frame. */
  getFrame: () => ContextFrame | null;
  /** Optional long-form learner summary. */
  getLearnerSummary?: () => LearnerModelSummary | null;
}

/** Composed bundle the agent runtime receives. */
export interface ContextEnvelope {
  focus: ContextFrame;
  learner?: LearnerModelSummary;
  /** Tool roster id active for this activity (see tool-roster.ts). */
  toolRosterId?: string;
  /** Safety metadata. */
  safety: {
    contentFilter: 'strict' | 'moderate';
    user_type: 'child';
  };
  /** ISO timestamp of envelope assembly. */
  assembledAt: string;
}
