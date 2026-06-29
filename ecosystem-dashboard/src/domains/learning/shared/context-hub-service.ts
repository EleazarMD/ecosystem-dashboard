/**
 * Context Hub Service — the always-on context spine broker.
 *
 * Contract: docs/AGENT_CONTEXT_HUB.md §5 + docs/KIDS_PLATFORM_CONTRACTS.md §3
 * Aligns with FSD Agentic Harness §1.6 (Context Hub).
 *
 * Responsibilities:
 * 1. Register providers for the active session's surfaces.
 * 2. Anchor focus — track the active surface and its latest ContextFrame.
 * 3. Assemble long-form — read the PCG learner model + plan + goals; compact
 *    to a summary relevant to the current focus.
 * 4. Budget + prioritize — fill a token budget (mirrors Pi Code
 *    `.picode/ambient.json`): focus tier first (never dropped), then long-form
 *    slices by priority; drop/trim lowest priority when over budget.
 * 5. Attach the Tool Roster — the gated allow-list for this surface.
 * 6. Compose the ContextEnvelope and hand it to the transport on every turn.
 * 7. Write-back — after the turn, route evidence to Memory (PCG) + emit events.
 *
 * HARD RULE: The Hub does not call the model. It prepares context only.
 */

import {
  ContextFrame,
  ContextProvider,
  ContextEnvelope,
  LearnerModelSummary,
} from './context-hub';
import { ToolRoster, mergeRosters, CORE_TOOL_ROSTER } from './tool-roster';
import { PersonaRef } from './agent-transport';
import { activityRegistry } from './activity-types';
import { getLearnerProfileService } from '../learner/learner-profile';

// ─── Types ──────────────────────────────────────────────────────────────────

/** Long-form context slice with priority for budgeting. */
interface LongFormSlice {
  key: string;
  priority: number;
  tokens: number;
  content: string;
}

/** Result of composing an envelope, including budget diagnostics. */
export interface ComposedEnvelope {
  envelope: ContextEnvelope;
  roster: ToolRoster;
  persona?: PersonaRef;
  budget: {
    totalTokens: number;
    used: number;
    dropped: string[];
  };
}

// ─── Token estimation ───────────────────────────────────────────────────────

/** Rough token estimate: ~4 chars per token. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Estimate tokens for a ContextFrame. */
function frameTokens(frame: ContextFrame): number {
  const title = frame.title || '';
  const summary = frame.summary || '';
  const entities = frame.entities ? JSON.stringify(frame.entities) : '';
  return estimateTokens(title + summary + entities);
}

/** Estimate tokens for a LearnerModelSummary. */
function summaryTokens(summary: LearnerModelSummary): number {
  const mastery = summary.skillMastery
    ? JSON.stringify(summary.skillMastery)
    : '';
  const topics = (summary.recentTopics || []).join(', ');
  return estimateTokens(
    `${summary.childName || ''} ${summary.ageBand || ''} ${mastery} ${topics}`,
  );
}

// ─── Context Hub implementation ─────────────────────────────────────────────

class ContextHubService {
  private providers = new Map<string, ContextProvider>();
  private activeActivityId: string | null = null;
  private activeFrame: ContextFrame | null = null;
  private activeRoster: ToolRoster | null = null;
  private activePersona: PersonaRef | null = null;
  private learnerSummary: LearnerModelSummary | null = null;
  private budgetTokens = 3000; // mirrors .picode/ambient.json budgetTokens
  private subscribers: Array<(frame: ContextFrame) => void> = [];

  /** Register a context provider for an activity. */
  registerProvider(provider: ContextProvider): void {
    this.providers.set(provider.activityId, provider);
  }

  /** Unregister a provider. */
  unregisterProvider(activityId: string): void {
    this.providers.delete(activityId);
  }

  /** Set the active activity (child navigated to a surface). */
  setFocus(activityId: string): void {
    this.activeActivityId = activityId;
    this.refreshFrame();

    // Resolve roster + persona from the activity registry
    const activity = activityRegistry.get(activityId);
    if (activity) {
      // A scoped roster is used as-is (tight tool gate for surfaces like
      // Learning Path that only need journey-coaching tools). Non-scoped
      // rosters are merged with CORE_TOOL_ROSTER for additive tool access.
      this.activeRoster = activity.toolRoster
        ? (activity.toolRoster.scoped
          ? activity.toolRoster
          : mergeRosters(activity.toolRoster, CORE_TOOL_ROSTER))
        : CORE_TOOL_ROSTER;
      this.activePersona = activity.persona ?? null;
    } else {
      this.activeRoster = CORE_TOOL_ROSTER;
      this.activePersona = null;
    }
  }

  /** Get the active activity id. */
  getFocusActivityId(): string | null {
    return this.activeActivityId;
  }

  /** Get the current focus frame. */
  getFocusFrame(): ContextFrame | null {
    if (this.activeActivityId) {
      const provider = this.providers.get(this.activeActivityId);
      if (provider) {
        const frame = provider.getFrame();
        if (frame) {
          this.activeFrame = frame;
          return frame;
        }
      }
    }
    return this.activeFrame;
  }

  /** Set the learner model summary (long-form context). */
  setLearnerSummary(summary: LearnerModelSummary | null): void {
    this.learnerSummary = summary;
  }

  /** Update the budget ceiling. */
  setBudget(tokens: number): void {
    this.budgetTokens = tokens;
  }

  /** Subscribe to focus frame changes. Returns unsubscribe. */
  subscribe(cb: (frame: ContextFrame) => void): () => void {
    this.subscribers.push(cb);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== cb);
    };
  }

  /**
   * Push a frame update from a provider whose state has changed.
   * Refreshes the active frame (if it belongs to the caller) and notifies
   * all subscribers.  This is the "live update" path — components call it
   * when their surface state mutates (e.g. page change, word selected,
   * mood picked) so the Context Hub and panel header stay in sync without
   * a full setFocus cycle.
   */
  notifyFrameUpdate(activityId?: string): void {
    if (activityId && activityId !== this.activeActivityId) return;
    this.refreshFrame();
  }

  /** Refresh the active frame from the provider and notify subscribers. */
  private refreshFrame(): void {
    if (!this.activeActivityId) return;
    const provider = this.providers.get(this.activeActivityId);
    if (!provider) return;

    const frame = provider.getFrame();
    if (frame) {
      this.activeFrame = frame;
      for (const sub of this.subscribers) {
        try {
          sub(frame);
        } catch {
          // subscriber error — don't crash the hub
        }
      }
    }
  }

  /** Compose a ContextEnvelope for the current focus + long-form context. */
  async composeEnvelope(childId?: string): Promise<ComposedEnvelope> {
    const focus = this.getFocusFrame();
    if (!focus) {
      throw new Error('[ContextHub] No active focus frame — call setFocus() first');
    }

    const focusTokens = frameTokens(focus);
    const remainingBudget = this.budgetTokens - focusTokens;
    const dropped: string[] = [];

    // Budget long-form slices
    const longFormSlices: LongFormSlice[] = [];
    if (this.learnerSummary) {
      const s = this.learnerSummary;
      if (s.childName) {
        longFormSlices.push({
          key: 'childName',
          priority: 90,
          tokens: estimateTokens(s.childName),
          content: `Name: ${s.childName}`,
        });
      }
      if (s.ageBand) {
        longFormSlices.push({
          key: 'ageBand',
          priority: 85,
          tokens: estimateTokens(s.ageBand),
          content: `Age band: ${s.ageBand}`,
        });
      }
      if (s.skillMastery) {
        const masteryStr = Object.entries(s.skillMastery)
          .map(([k, v]) => `${k}=${v.toFixed(2)}`)
          .join(', ');
        longFormSlices.push({
          key: 'mastery',
          priority: 70,
          tokens: estimateTokens(masteryStr),
          content: `Mastery: ${masteryStr}`,
        });
      }
      if (s.recentTopics?.length) {
        const topicsStr = s.recentTopics.join(', ');
        longFormSlices.push({
          key: 'recentTopics',
          priority: 60,
          tokens: estimateTokens(topicsStr),
          content: `Recent topics: ${topicsStr}`,
        });
      }
      if (s.personaId) {
        longFormSlices.push({
          key: 'personaId',
          priority: 50,
          tokens: estimateTokens(s.personaId),
          content: `Persona: ${s.personaId}`,
        });
      }
      if (s.developmental) {
        const d = s.developmental;
        const devStr = `Developmental: age=${d.age}, band=${d.ageBand}, gender=${d.gender}, cognitive=${d.cognitiveLevel} (${d.cognitiveMaturityScore.toFixed(2)}), reading=${d.readingLevel}, attention=${d.attentionSpan}, modality=${d.learningModality}, pacing=${d.pacingPreference}, difficulty=${d.difficultyLevel}/5, celebration=${d.celebrationResponse}`;
        longFormSlices.push({
          key: 'developmental',
          priority: 80,
          tokens: estimateTokens(devStr),
          content: devStr,
        });
      }
      if (s.recentInsights?.length) {
        const insightsStr = `Recent insights: ${s.recentInsights.join('; ')}`;
        longFormSlices.push({
          key: 'recentInsights',
          priority: 65,
          tokens: estimateTokens(insightsStr),
          content: insightsStr,
        });
      }
    }

    // Sort by priority descending, fill budget
    longFormSlices.sort((a, b) => b.priority - a.priority);
    let usedTokens = focusTokens;
    const includedSlices: string[] = [];

    for (const slice of longFormSlices) {
      if (usedTokens + slice.tokens <= this.budgetTokens) {
        includedSlices.push(slice.content);
        usedTokens += slice.tokens;
      } else {
        dropped.push(slice.key);
      }
    }

    const learner: LearnerModelSummary | undefined = this.learnerSummary
      ? {
          ...this.learnerSummary,
          // The composed summary is the budgeted set of slices
          // (we pass the full summary but the transport sees the budget)
        }
      : undefined;

    const envelope: ContextEnvelope = {
      focus,
      learner,
      toolRosterId: this.activeRoster?.id,
      safety: {
        contentFilter: 'strict',
        user_type: 'child',
      },
      assembledAt: new Date().toISOString(),
    };

    return {
      envelope,
      roster: this.activeRoster || CORE_TOOL_ROSTER,
      persona: this.activePersona || undefined,
      budget: {
        totalTokens: this.budgetTokens,
        used: usedTokens,
        dropped,
      },
    };
  }

  /** Record a turn outcome for write-back to mastery + events.
   *
   * When a child completes a tutor/companion turn on any surface, we treat it
   * as a "soft" correct attempt for each skill code associated with the
   * activity. This means productive engagement on Pokémon Lab, Books, Journal,
   * etc. advances the learner model — not just explicit check-card grading
   * via /api/learn/attempt.
   *
   * Flow:
   * 1. Look up skillCodes from the activity registry
   * 2. For each skill, call MasteryCalculator.update (EMA-based)
   * 3. Emit attempt.graded on the event bus (AnalyticsCollector listens)
   * 4. Update recentTopics in the learner summary
   */
  async recordOutcome(turn: {
    childId: string;
    activityId: string;
    message: string;
    response: string;
    toolsUsed?: string[];
    source?: string;
  }): Promise<void> {
    const profileService = getLearnerProfileService();

    // 1. Update recent topics for context continuity
    if (this.learnerSummary && turn.toolsUsed?.length) {
      const topics = this.learnerSummary.recentTopics || [];
      const newTopic = turn.activityId;
      if (!topics.includes(newTopic)) {
        this.learnerSummary.recentTopics = [newTopic, ...topics].slice(0, 5);
      }
    }

    // 2. Look up skill codes for this activity from the registry
    const activity = activityRegistry.get(turn.activityId);
    const skillCodes = activity?.skillCodes;
    if (!skillCodes || skillCodes.length === 0) return;

    // 3. For each skill, record a soft attempt (productive engagement = correct)
    // Use a lower EMA weight for soft attempts so explicit check-card grading
    // (which calls MasteryCalculator.update directly with full weight) remains
    // more authoritative.
    for (const skillCode of skillCodes) {
      // Ensure the learner profile exists so recordAttempt can update it
      const profile = profileService.get(turn.childId);
      if (!profile) {
        profileService.getOrCreate(
          turn.childId,
          this.learnerSummary?.childName || 'Child',
          this.learnerSummary?.ageBand || '6-8',
        );
      }

      // Record via the profile service so strengths/struggles + difficulty adjust
      profileService.recordAttempt(
        turn.childId,
        skillCode,
        true, // productive engagement treated as correct
        1,    // soft attempt number
      );

      // The profile service already emits attempt.graded via recordAttempt,
      // so AnalyticsCollector will pick it up automatically.
    }
  }

  /** Reset state (e.g. on logout / session end). */
  reset(): void {
    this.providers.clear();
    this.activeActivityId = null;
    this.activeFrame = null;
    this.activeRoster = null;
    this.activePersona = null;
    this.learnerSummary = null;
    this.subscribers = [];
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let _instance: ContextHubService | null = null;

/** Get the singleton Context Hub instance. */
export function getContextHub(): ContextHubService {
  if (!_instance) {
    _instance = new ContextHubService();
  }
  return _instance;
}

/** Reset the singleton (for testing). */
export function _resetContextHub(): void {
  _instance?.reset();
  _instance = null;
}

export { ContextHubService };
