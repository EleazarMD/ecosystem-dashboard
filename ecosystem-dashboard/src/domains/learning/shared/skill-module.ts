/**
 * Skill Module — the self-contained abstraction for a single agent tool.
 *
 * Contract: docs/KIDS_PLATFORM_CONTRACTS.md §5 (Tool Roster) + §4.6 (Agent Loop)
 *
 * A SkillModule bundles everything the agent loop needs to discover, gate,
 * and execute a tool:
 *   - Descriptor (id, label, description) → feeds the Tool Roster automatically
 *   - Safety metadata (requiresApproval, blockedForChildren) → feeds the Tool Gate
 *   - Executor function → called by the dispatcher, no switch/case needed
 *   - Category → for grouping, filtering, and UI rendering
 *
 * Adding a new tool = create one file in `src/domains/learning/skills/`,
 * export a SkillModule, and import it in `skills/index.ts`. That's it.
 * The roster, gate, and dispatcher all update automatically.
 */

import type { ToolRoster, ToolDescriptor } from './tool-roster';

// ─── Types (shared with agent-tools.ts) ─────────────────────────────────────

export interface ToolContext {
  childUserId: string;
  contentPrompt: string;
  contentItemId: string;
  skillCode: string;
  attemptNumber: number;
  hintSet: string[];
  safetySystemPrompt?: string;
  pcgContext?: {
    childName?: string;
    ageGroup?: string;
    interests?: string[];
    goals?: string[];
  } | null;
  focus?: {
    title?: string;
    summary?: string;
    entities?: Record<string, string | number | string[]>;
  } | null;
}

export interface ToolExecutionResult {
  output: string;
  success: boolean;
}

// ─── Skill categorization ───────────────────────────────────────────────────

export type SkillCategory =
  | 'tutoring'     // Socratic guidance, hints, answer checking
  | 'stats'        // Usage/progress data retrieval
  | 'navigation'   // Activity recommendation and switching
  | 'creative'     // Art, journal, drawing prompts
  | 'reading'      // Passages, read-aloud, comprehension
  | 'celebration'  // Encouragement and praise
  | 'reference'    // Dictionary, definitions, lookups
  | 'exploration'  // Knowledge graph, Pokémon Lab lessons
  | 'practice';    // Problem generation, drills

// ─── SkillModule interface ──────────────────────────────────────────────────

export interface SkillModule {
  /** Unique tool id (matches ToolId in tool-roster.ts). */
  id: string;
  /** Human-readable label for UI and logs. */
  label: string;
  /** Brief description for the agent's tool-use prompt. */
  description: string;
  /** Category for grouping, filtering, and safety classification. */
  category: SkillCategory;
  /** Whether this tool requires parental approval before execution. */
  requiresApproval?: boolean;
  /** Whether this tool is blocked for child accounts. */
  blockedForChildren?: boolean;
  /** Whether this is a UI-only tool (no server-side executor). */
  uiOnly?: boolean;
  /** Optional endpoint reference for documentation. */
  endpoint?: string;
  /**
   * The executor function. Called by the dispatcher when the agent selects
   * this tool. Can be sync or async.
   */
  execute(
    args: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<ToolExecutionResult> | ToolExecutionResult;
}

// ─── Skill Registry ─────────────────────────────────────────────────────────

class SkillRegistryImpl {
  private modules = new Map<string, SkillModule>();

  register(mod: SkillModule): void {
    if (this.modules.has(mod.id)) {
      console.warn(`[SkillRegistry] Overwriting existing skill: ${mod.id}`);
    }
    this.modules.set(mod.id, mod);
  }

  get(id: string): SkillModule | undefined {
    return this.modules.get(id);
  }

  all(): SkillModule[] {
    return Array.from(this.modules.values());
  }

  byCategory(category: SkillCategory): SkillModule[] {
    return this.all().filter((m) => m.category === category);
  }

  /** Whether a skill with this id is registered. */
  has(id: string): boolean {
    return this.modules.has(id);
  }

  /**
   * Derive a ToolRoster from all registered skills.
   * This replaces hardcoded CORE_TOOL_ROSTER — the roster is always in sync
   * with the registered executors.
   */
  toRoster(id = 'core'): ToolRoster {
    const tools: ToolDescriptor[] = this.all()
      .filter((m) => !m.uiOnly)
      .map((m) => ({
        id: m.id as any,
        label: m.label,
        description: m.description,
        requiresApproval: m.requiresApproval,
        blockedForChildren: m.blockedForChildren,
        endpoint: m.endpoint,
      }));
    return { id, tools };
  }

  /**
   * Derive a scoped ToolRoster from a subset of categories.
   * Used to build the CORE roster with only learning-relevant tools,
   * excluding domain-specific tools (exploration, creative) that
   * should only be available via activity-specific rosters.
   */
  toScopedRoster(id: string, categories: SkillCategory[]): ToolRoster {
    const tools: ToolDescriptor[] = this.all()
      .filter((m) => !m.uiOnly && categories.includes(m.category))
      .map((m) => ({
        id: m.id as any,
        label: m.label,
        description: m.description,
        requiresApproval: m.requiresApproval,
        blockedForChildren: m.blockedForChildren,
        endpoint: m.endpoint,
      }));
    return { id, tools };
  }

  /**
   * Execute a registered skill by id. Throws if the skill is not found
   * (the caller should catch and return a fallback).
   */
  async execute(
    id: string,
    args: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<ToolExecutionResult> {
    const mod = this.modules.get(id);
    if (!mod) {
      return { output: `Unknown tool: ${id}`, success: false };
    }
    if (mod.uiOnly) {
      return {
        output: `Tool "${id}" is UI-only and has no server-side executor.`,
        success: true,
      };
    }
    return mod.execute(args, ctx);
  }
}

/** Singleton registry instance. */
export const skillRegistry = new SkillRegistryImpl();
