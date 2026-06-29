import { SkillModule, ToolContext, ToolExecutionResult } from '../shared/skill-module';

export const workspaceGetPagesSkill: SkillModule = {
  id: 'workspace_get_pages',
  label: 'List Pages',
  description: 'List all pages in the child workspace, or get the full content of a specific page.',
  category: 'creative',
  endpoint: '/api/child/workspace',
  async execute(args, ctx: ToolContext): Promise<ToolExecutionResult> {
    const pageId = String(args.pageId || args.page_id || '');
    const query = pageId ? `?pageId=${encodeURIComponent(pageId)}` : '';

    try {
      const res = await fetch(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/child/workspace${query}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        },
      );

      if (!res.ok) {
        return {
          output: `Could not retrieve pages from the workspace right now.`,
          success: false,
        };
      }

      const data = await res.json();

      if (pageId && data?.blocks) {
        const blockCount = data.blocks.length;
        const pageTitle = data.page?.title || data.title || 'Untitled';
        return {
          output: `Page "${pageTitle}" has ${blockCount} block(s). Types: ${data.blocks.map((b: { type: string }) => b.type).join(', ') || 'none'}.`,
          success: true,
        };
      }

      const pages = data?.pages || [];
      const pageList = pages
        .map((p: { id: string; title?: string; icon?: string }, i: number) => `${i + 1}. ${p.icon || '📄'} ${p.title || 'Untitled'} (id: ${p.id})`)
        .join('\n');

      return {
        output: `${ctx.pcgContext?.childName || 'The child'} has ${pages.length} page(s) in the workspace:\n${pageList || 'No pages yet.'}`,
        success: true,
      };
    } catch {
      return {
        output: `Could not reach the workspace API to list pages.`,
        success: false,
      };
    }
  },
};
