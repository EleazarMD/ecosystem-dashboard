/**
 * Activity / Module Registry — the keystone abstraction.
 *
 * Contract: docs/KIDS_PLATFORM_CONTRACTS.md §1
 *
 * One `LearningActivity` entry replaces the scattered edits in
 * RightPanelContext PANEL_CONFIGS, ChildDashboardLayout contextMap, and
 * ad-hoc theme switching.  The registry is the single source of truth.
 */

import { ActivityThemeTokens } from './activity-theme';
import { ContextProvider } from './context-hub';
import { ToolRoster } from './tool-roster';
import { PersonaRef, CompanionIntent } from './agent-transport';

/** Open string for multi-tenant/plugin extensibility (§9.3). */
export type ActivityId = string;

/** Activity category for nav grouping and filtering. */
export type ActivityCategory =
  | 'learning'    // structured lessons, quizzes, paths
  | 'exploration' // free-exploration surfaces
  | 'creative'    // art, writing, journal
  | 'communication' // chat, email
  | 'utility'     // planner, dictionary, clock
  | 'meta';       // dashboard, settings

/** Right-panel configuration (mirrors RightPanelContext PanelConfig). */
export interface ActivityPanelConfig {
  width: number;
  tabs: Array<{
    id: string;
    label: string;
    icon?: string;
  }>;
  defaultTab: string;
}

/** Outcome emitted when a child completes a step / quiz / interaction. */
export interface ActivityOutcome {
  activityId: ActivityId;
  skillCode?: string;
  correct: boolean;
  timestamp: number;
  /** Optional evidence payload (answer text, duration, etc.). */
  evidence?: Record<string, unknown>;
}

/** Lazy-loaded React component for the activity surface. */
export type ActivityLoader = () => Promise<{ default: React.ComponentType<any> }>;

/** The registry entry. */
export interface LearningActivity {
  /** Stable unique id, e.g. 'pokemon-lab'. */
  id: ActivityId;
  /** Display name. */
  name: string;
  /** Short description for nav / cards. */
  description: string;
  /** Emoji or icon path for nav. */
  icon: string;
  /** Category for grouping. */
  category: ActivityCategory;

  /** Route path, e.g. '/child/pokemon-lab'. */
  route: string;
  /** pageType value consumed by ChildDashboardLayout. */
  pageType: string;

  /** Theme overlay for this activity. */
  theme?: ActivityThemeTokens;

  /** Right-panel config (replaces PANEL_CONFIGS entry). */
  panel?: ActivityPanelConfig;

  /** Context provider factory (called when the activity mounts). */
  contextProvider?: () => ContextProvider;

  /** Tool roster for this activity. */
  toolRoster?: ToolRoster;

  /** Skill codes this activity exercises (for PCG mastery tracking). */
  skillCodes?: string[];

  /** Persona for the tutor companion on this activity. */
  persona?: PersonaRef;

  /** Activity-specific quick actions for the companion (replaces generic Explain/Hint/Check). */
  quickActions?: Array<{
    label: string;
    intent: CompanionIntent;
    emoji: string;
    /** Optional prompt prefix appended to the context summary. */
    prompt?: string;
  }>;

  /** Activity-specific greeting shown when the companion first appears. */
  greeting?: string;

  /** Activity-specific agent rules (system prompt lines).
   * When present, these replace the default rules in buildSystemPrompt,
   * centralizing per-activity coaching logic in the registry instead of
   * hardcoded if-branches in the transport. */
  agentRules?: string[];

  /** Lazy component loader. */
  load: ActivityLoader;

  /** Whether this activity is visible in nav. */
  navVisible?: boolean;

  /** Minimum age for this activity (optional gating). */
  minAge?: number;
}

// ---------------------------------------------------------------------------
// Registry singleton
// ---------------------------------------------------------------------------

class ActivityRegistryImpl {
  private activities = new Map<ActivityId, LearningActivity>();

  register(activity: LearningActivity): void {
    if (this.activities.has(activity.id)) {
      console.warn(`[ActivityRegistry] Overwriting existing activity: ${activity.id}`);
    }
    this.activities.set(activity.id, activity);
  }

  get(id: ActivityId): LearningActivity | undefined {
    return this.activities.get(id);
  }

  all(): LearningActivity[] {
    return Array.from(this.activities.values());
  }

  byCategory(category: ActivityCategory): LearningActivity[] {
    return this.all().filter((a) => a.category === category);
  }

  navItems(): LearningActivity[] {
    return this.all().filter((a) => a.navVisible !== false);
  }

  /** Find by route path (used by layout to resolve active activity). */
  findByRoute(route: string): LearningActivity | undefined {
    return this.all().find((a) => a.route === route);
  }

  /** Find by ChildDashboardLayout pageType. */
  findByPageType(pageType: string): LearningActivity | undefined {
    return this.all().find((a) => a.pageType === pageType);
  }
}

/** Singleton registry instance. */
export const activityRegistry = new ActivityRegistryImpl();

// ---------------------------------------------------------------------------
// Known ids (§9.3: const map for compile-time autocomplete)
// ---------------------------------------------------------------------------

export const KNOWN_ACTIVITY_IDS = {
  POKEMON_LAB: 'pokemon-lab',
  LEARN_HUB: 'learn-hub',
  LEARNING_PATH: 'learning-path',
  TEAMS: 'teams',
  FREE_CHAT: 'free-chat',
  HOME: 'home',
  ART_STUDIO: 'art-studio',
  WORKSPACE: 'workspace',
  DICTIONARY: 'dictionary',
  JOURNAL: 'journal',
  EMAIL: 'email',
  PLANNER: 'planner',
  BOOKS: 'books',
} as const;

export type KnownActivityId = (typeof KNOWN_ACTIVITY_IDS)[keyof typeof KNOWN_ACTIVITY_IDS];
