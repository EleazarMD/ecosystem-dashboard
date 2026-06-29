/**
 * Roster / Dispatcher Consistency Test
 *
 * Verifies that every tool id on any registered activity roster (plus the
 * CORE_TOOL_ROSTER) either:
 *   (a) has a matching case in the executeTool dispatcher (agent-tools.ts), OR
 *   (b) is explicitly a route-only tool (has an `endpoint` property and no
 *       dispatcher case — the agent references it but execution is delegated
 *       to the HTTP route, not the in-process tool executor).
 *
 * This catches the class of bug where a tool is on a roster (so the Tool Gate
 * allows it) but the dispatcher returns "Unknown tool" at runtime.
 */

import '@/domains/learning/skills'; // ensure all SkillModules register
import '@/domains/learning/shared/activity-registry'; // ensure activities register
import { activityRegistry } from '@/domains/learning/shared/activity-types';
import { CORE_TOOL_ROSTER, mergeRosters, ToolRoster, ToolDescriptor } from '@/domains/learning/shared/tool-roster';
import { skillRegistry } from '@/domains/learning/shared/skill-module';

// Single source of truth: a tool can be dispatched in-process iff it is a
// registered, non-UI-only SkillModule. executeTool() delegates to the same
// registry, so deriving the set here means it can never drift from the
// dispatcher again (the bug this hardcoded list previously caused).
const DISPATCHED_TOOLS = new Set(
  skillRegistry.all().filter((m) => !m.uiOnly).map((m) => m.id),
);

// Tools that are intentionally route-backed or client/UI-only: they appear on
// rosters but have no in-process executor (the agent references them; execution
// is delegated to an HTTP route or a client-side widget).
const ROUTE_OR_UI_ONLY = new Set<string>([
  'tutor-turn', // route to tutor turn API
  'learn-attempt', // route to learn attempt API
  'learn-plan', // route to learning planner API
  'pokedex-query', // client-side pokedex lookup
  'pokedex-nl', // client-side pokedex NL query
  'calculator', // client-side calculator widget
  'dictionary-lookup', // client-side dictionary widget
]);

function isRouteOnly(tool: ToolDescriptor): boolean {
  return (!!tool.endpoint || ROUTE_OR_UI_ONLY.has(tool.id)) && !DISPATCHED_TOOLS.has(tool.id);
}

function collectAllRosterTools(): Map<string, ToolDescriptor> {
  const map = new Map<string, ToolDescriptor>();

  for (const tool of CORE_TOOL_ROSTER.tools) {
    map.set(tool.id, tool);
  }

  for (const activity of activityRegistry.all()) {
    if (!activity.toolRoster) continue;
    const merged = mergeRosters(activity.toolRoster);
    for (const tool of merged.tools) {
      if (!map.has(tool.id)) {
        map.set(tool.id, tool);
      }
    }
  }

  return map;
}

describe('Roster / Dispatcher Consistency', () => {
  const allTools = collectAllRosterTools();

  it('collects tools from all registered activities + CORE roster', () => {
    expect(allTools.size).toBeGreaterThan(0);
  });

  it('every CORE_TOOL_ROSTER tool has a dispatcher case', () => {
    const missing: string[] = [];
    for (const tool of CORE_TOOL_ROSTER.tools) {
      if (!DISPATCHED_TOOLS.has(tool.id)) {
        missing.push(tool.id);
      }
    }
    expect(missing).toEqual([]);
  });

  it('every activity roster tool is either dispatched or route-only', () => {
    const undispatched: Array<{ tool: string; activity: string; reason: string }> = [];

    for (const activity of activityRegistry.all()) {
      if (!activity.toolRoster) continue;
      const merged = mergeRosters(activity.toolRoster);
      for (const tool of merged.tools) {
        if (!DISPATCHED_TOOLS.has(tool.id) && !isRouteOnly(tool)) {
          undispatched.push({
            tool: tool.id,
            activity: activity.id,
            reason: 'No dispatcher case and no endpoint property',
          });
        }
      }
    }

    if (undispatched.length > 0) {
      console.warn(
        '[roster-consistency] Tools on rosters without dispatcher or endpoint:\n' +
          undispatched.map((u) => `  ${u.tool} (${u.activity}): ${u.reason}`).join('\n'),
      );
    }

    expect(undispatched).toEqual([]);
  });

  it('non-dispatched tools are route-backed (endpoint) or known UI-only', () => {
    for (const [id, tool] of Array.from(allTools)) {
      if (DISPATCHED_TOOLS.has(id)) continue;
      // Every non-dispatched roster tool must be executable via an HTTP route
      // (endpoint) or be an explicitly-known client/UI-only widget. This is the
      // invariant that prevents the agent from selecting a tool that returns
      // "Unknown tool" at runtime.
      const ok = !!tool.endpoint || ROUTE_OR_UI_ONLY.has(id);
      expect(ok).toBe(true);
    }
  });

  it('no tool is blockedForChildren on any activity roster', () => {
    for (const activity of activityRegistry.all()) {
      if (!activity.toolRoster) continue;
      for (const tool of activity.toolRoster.tools) {
        expect(tool.blockedForChildren).not.toBe(true);
      }
    }
  });

  it('approval-gated tools are correctly flagged', () => {
    const approvalTools: string[] = [];
    for (const [id, tool] of Array.from(allTools)) {
      if (tool.requiresApproval) {
        approvalTools.push(id);
      }
    }
    // draw_image should be approval-gated
    expect(approvalTools).toContain('draw_image');
  });
});
