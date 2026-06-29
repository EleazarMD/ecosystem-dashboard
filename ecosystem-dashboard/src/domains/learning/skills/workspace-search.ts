import { SkillModule, ToolContext, ToolExecutionResult } from '../shared/skill-module';

export const workspaceSearchSkill: SkillModule = {
  id: 'workspace_search',
  label: 'Search Workspace',
  description: 'Search for pages or blocks in the child workspace by keyword.',
  category: 'creative',
  endpoint: '/api/child/workspace',
  async execute(args, ctx: ToolContext): Promise<ToolExecutionResult> {
    const query = String(args.query || args.q || '');

    if (!query) {
      return {
        output: `What should I search for in the workspace? Please provide a search query.`,
        success: false,
      };
    }

    try {
      const res = await fetch(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/child/workspace?search=${encodeURIComponent(query)}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        },
      );

      if (!res.ok) {
        return {
          output: `Could not search the workspace right now.`,
          success: false,
        };
      }

      const data = await res.json();
      const results = Array.isArray(data?.results) ? data.results : Array.isArray(data?.pages) ? data.pages : [];

      if (results.length === 0) {
        return {
          output: `No pages found matching "${query}" in the workspace.`,
          success: true,
        };
      }

      const resultList = results
        .map((r: { id: string; title?: string; icon?: string }, i: number) => `${i + 1}. ${r.icon || '📄'} ${r.title || 'Untitled'} (id: ${r.id})`)
        .join('\n');

      return {
        output: `Found ${results.length} page(s) matching "${query}" for ${ctx.pcgContext?.childName || 'the child'}:\n${resultList}`,
        success: true,
      };
    } catch {
      return {
        output: `Could not reach the workspace API to search.`,
        success: false,
      };
    }
  },
};
