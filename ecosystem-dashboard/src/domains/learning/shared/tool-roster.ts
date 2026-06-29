/**
 * Tool Roster + Tool Gate — allow-list of tools an agent may call.
 *
 * Contract: docs/KIDS_PLATFORM_CONTRACTS.md §5
 * Aligns with FSD Agentic Harness §4.6.
 */

import type { SkillCategory } from './skill-module';

/** Stable tool identifiers (extensible — third-party tools use string). */
export type ToolId =
  | 'pokedex-query'
  | 'pokedex-nl'
  | 'explore_graph'
  | 'learn-attempt'
  | 'learn-plan'
  | 'tutor-turn'
  | 'calculator'
  | 'dictionary-lookup'
  // Child CORE learning tools (§4.6)
  | 'ask_socratic'
  | 'give_hint'
  | 'check_answer'
  | 'define_word'
  | 'read_with_me'
  | 'show_passage'
  | 'journal_write'
  | 'draw_image'
  | 'celebrate'
  | 'get_child_stats'
  | 'recommend_activity'
  | 'generate_problem'
  // Workspace CRUD tools
  | 'workspace_create_page'
  | 'workspace_add_block'
  | 'workspace_update_block'
  | 'workspace_delete_block'
  | 'workspace_get_pages'
  | 'workspace_search'
  // Pokédex graph tools
  | 'pokedex_search'
  | 'pokedex_detail'
  | 'pokedex_type_effectiveness'
  | 'pokedex_evolution'
  | 'pokedex_nl_query'
  | (string & {});  // allow arbitrary ids without breaking autocomplete

export interface ToolDescriptor {
  id: ToolId;
  label: string;
  /** Brief description for the agent's tool-use prompt. */
  description: string;
  /** HTTP endpoint or function reference the Tool Gate calls. */
  endpoint?: string;
  /** Whether this tool requires parental approval before execution. */
  requiresApproval?: boolean;
  /** Whether this tool is blocked for child accounts (CIG tools, etc.). */
  blockedForChildren?: boolean;
}

/** Allow-list of tools active for a given activity. */
export interface ToolRoster {
  id: string;
  tools: ToolDescriptor[];
  /** When true, this roster is used as-is without merging CORE_TOOL_ROSTER.
   * Use for activities that need a tightly scoped tool gate (e.g. Learning Path
   * should only expose journey-coaching tools, not tutoring tools). */
  scoped?: boolean;
}

/**
 * Pre-tool checkpoint: validates the tool call against the roster and safety rules.
 * Returns `allowed: false` if the tool is not on the roster, blocked for children,
 * or requires approval that hasn't been granted.
 */
export interface ToolGateResult {
  allowed: boolean;
  reason?: string;
  tool?: ToolDescriptor;
}

export function checkToolGate(
  roster: ToolRoster | undefined,
  toolId: ToolId,
  opts?: { approvalGranted?: boolean },
): ToolGateResult {
  if (!roster) {
    return { allowed: false, reason: 'No tool roster for this activity' };
  }

  const tool = roster.tools.find((t) => t.id === toolId);
  if (!tool) {
    return { allowed: false, reason: `Tool "${toolId}" not on roster` };
  }

  if (tool.blockedForChildren) {
    return { allowed: false, reason: `Tool "${toolId}" is blocked for child accounts`, tool };
  }

  if (tool.requiresApproval && !opts?.approvalGranted) {
    return { allowed: false, reason: `Tool "${toolId}" requires parental approval`, tool };
  }

  return { allowed: true, tool };
}

/** Default empty roster for activities that don't expose tools. */
export const EMPTY_ROSTER: ToolRoster = { id: 'empty', tools: [] };

/**
 * CORE tool roster — derived from the SkillRegistry.
 *
 * The roster is always in sync with the registered executors because it is
 * built from the same SkillModule objects. Activity rosters add surface tools
 * on top via {@link mergeRosters}.
 *
 * To add a tool, create a SkillModule in `src/domains/learning/skills/` and
 * register it in `skills/index.ts`. The roster updates automatically.
 */
export const CORE_TOOL_ROSTER: ToolRoster = buildCoreRoster();

/** Categories included in the CORE roster — learning-relevant only. */
const CORE_CATEGORIES: SkillCategory[] = [
  'tutoring',
  'stats',
  'navigation',
  'celebration',
  'reference',
  'practice',
  'reading',
];

function buildCoreRoster(): ToolRoster {
  // Lazy import to avoid circular dependency at module load time.
  // The skills barrel registers all modules as a side effect of import.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { skillRegistry } = require('../skills');
    return skillRegistry.toScopedRoster('core', CORE_CATEGORIES);
  } catch {
    // Fallback: if the skills barrel isn't available yet (e.g. during
    // early module resolution), return a minimal static roster.
    return {
      id: 'core',
      tools: [
        { id: 'ask_socratic', label: 'Ask Socratic', description: 'Generate a Socratic next-step prompt.' },
        { id: 'give_hint', label: 'Give Hint', description: 'Reveal the next laddered hint.' },
        { id: 'check_answer', label: 'Check Answer', description: 'Reason about a learner answer.' },
        { id: 'define_word', label: 'Define Word', description: 'Kid-friendly word definition.' },
        { id: 'celebrate', label: 'Celebrate', description: 'Acknowledge effort and strategy.' },
        { id: 'get_child_stats', label: 'Get Child Stats', description: "Fetch the child's real platform usage and progress stats." },
        { id: 'recommend_activity', label: 'Recommend Activity', description: 'Suggest the next best activity for the child.' },
        { id: 'generate_problem', label: 'Generate Problem', description: 'Create a fresh practice problem for the current skill.' },
      ],
    };
  }
}

/**
 * Merge the CORE roster with an activity roster, de-duplicating by tool id
 * (activity descriptors win, so a surface can override a CORE tool's metadata).
 */
export function mergeRosters(
  activity: ToolRoster | undefined,
  core: ToolRoster = CORE_TOOL_ROSTER,
): ToolRoster {
  const byId = new Map<ToolId, ToolDescriptor>();
  for (const tool of core.tools) byId.set(tool.id, tool);
  if (activity) {
    for (const tool of activity.tools) byId.set(tool.id, tool);
  }
  return {
    id: activity ? `${core.id}+${activity.id}` : core.id,
    tools: Array.from(byId.values()),
  };
}
