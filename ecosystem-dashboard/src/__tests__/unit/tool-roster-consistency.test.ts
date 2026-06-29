/**
 * Tool roster / dispatcher consistency test.
 *
 * Every tool id declared on the CORE roster or on any registered activity
 * must either have a dispatcher in features/agent-tools.ts or be a known
 * UI-only route tool. This prevents the agent from selecting a tool that
 * cannot execute (the root cause of silent fallback loops).
 */

import { CORE_TOOL_ROSTER, checkToolGate } from '@/domains/learning/shared/tool-roster';
import { activityRegistry } from '@/domains/learning/shared/activity-types';
import { executeTool } from '@/domains/learning/features/agent-tools';
import { skillRegistry } from '@/domains/learning/shared/skill-module';

// Mock the DB-dependent getTodayUsage so get_child_stats doesn't time out.
jest.mock('@/lib/parental-controls/usageTracker', () => ({
  getTodayUsage: jest.fn().mockResolvedValue({
    todayMinutes: 30,
    limitMinutes: 60,
    remainingMinutes: 30,
  }),
}));

// Mock fetch so ask_socratic doesn't hang trying to reach the AI Gateway.
const originalFetch = global.fetch;
beforeAll(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: 'Mocked Socratic response.' } }],
    }),
  }) as any;
});
afterAll(() => {
  global.fetch = originalFetch;
});

// Tools that are intentionally UI-only or route hooks; they appear on rosters
// but do not need a server-side executor.
const UI_ONLY_TOOLS = new Set<string>([
  'tutor-turn', // route to tutor turn API
  'learn-attempt', // route to learn attempt API
  'learn-plan', // route to learning planner API
  'pokedex-query', // client-side pokedex lookup
  'pokedex-nl', // client-side pokedex NL query
  'calculator', // client-side calculator widget
  'dictionary-lookup', // client-side dictionary widget
  'read_with_me', // handled as a final-answer instruction
  'show_passage', // handled as a final-answer instruction
  'journal_write', // handled as a final-answer instruction
  'draw_image', // handled as a final-answer instruction
  'celebrate', // handled as a final-answer instruction
]);

const ctx: any = {
  childUserId: 'child-test',
  contentPrompt: 'test',
  contentItemId: '',
  skillCode: '',
  attemptNumber: 1,
  hintSet: [],
  pcgContext: null,
  focus: null,
};

async function toolHasExecutor(toolId: string): Promise<boolean> {
  // Try to execute the tool with empty args; unknown tools return a known failure.
  const result = await executeTool(toolId as any, {}, ctx);
  return result.output !== `Unknown tool: ${toolId}`;
}

function collectToolIds(): Set<string> {
  const ids = new Set<string>();
  for (const tool of CORE_TOOL_ROSTER.tools) {
    ids.add(tool.id);
  }
  for (const activity of activityRegistry.all()) {
    if (activity.toolRoster) {
      for (const tool of activity.toolRoster.tools) {
        ids.add(tool.id);
      }
    }
  }
  return ids;
}

describe('Tool roster / dispatcher consistency', () => {
  it('CORE roster tools have executors or are UI-only', async () => {
    // Increase timeout for async tools that may hit network/DB.
    jest.setTimeout(15000);
    const failures: string[] = [];
    for (const tool of CORE_TOOL_ROSTER.tools) {
      if (UI_ONLY_TOOLS.has(tool.id)) continue;
      if (!(await toolHasExecutor(tool.id))) {
        failures.push(tool.id);
      }
    }
    expect(failures).toEqual([]);
  });

  it('activity roster tools have executors or are UI-only', async () => {
    const failures: string[] = [];
    for (const activity of activityRegistry.all()) {
      if (!activity.toolRoster) continue;
      for (const tool of activity.toolRoster.tools) {
        if (UI_ONLY_TOOLS.has(tool.id)) continue;
        if (!(await toolHasExecutor(tool.id))) {
          failures.push(`${activity.id}:${tool.id}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it('newly-added learning tools have executors', async () => {
    expect(await toolHasExecutor('get_child_stats')).toBe(true);
    expect(await toolHasExecutor('recommend_activity')).toBe(true);
    expect(await toolHasExecutor('generate_problem')).toBe(true);
  });

  it('SkillRegistry has all CORE roster tools registered', () => {
    for (const tool of CORE_TOOL_ROSTER.tools) {
      expect(skillRegistry.has(tool.id)).toBe(true);
    }
  });

  it('CORE_TOOL_ROSTER is a category-scoped subset of SkillRegistry.toRoster()', () => {
    // CORE_TOOL_ROSTER is built via skillRegistry.toScopedRoster(CORE_CATEGORIES),
    // so it is a subset of the full registry (toRoster() returns all non-UI-only
    // skills, including exploration/creative tools excluded from CORE). Every CORE
    // id must therefore be registered; the registry may legitimately have more.
    const registryIds = new Set(skillRegistry.toRoster().tools.map((t) => t.id));
    const missing = CORE_TOOL_ROSTER.tools.map((t) => t.id).filter((id) => !registryIds.has(id));
    expect(missing).toEqual([]);
  });
});
