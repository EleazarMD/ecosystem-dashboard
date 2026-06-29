import { SkillModule, ToolContext, ToolExecutionResult } from '../shared/skill-module';

export const workspaceCreatePageSkill: SkillModule = {
  id: 'workspace_create_page',
  label: 'Create Page',
  description: 'Create a new page in the child workspace with an optional title, icon, and blocks.',
  category: 'creative',
  endpoint: '/api/child/workspace?action=from-builder',
  async execute(args, ctx: ToolContext): Promise<ToolExecutionResult> {
    const title = String(args.title || 'Untitled');
    const icon = String(args.icon || '📄');
    const blocks = Array.isArray(args.blocks) ? args.blocks : [];

    const body = {
      action: 'from-builder',
      title,
      icon,
      blocks,
    };

    try {
      const res = await fetch(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/child/workspace?action=from-builder`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );

      if (!res.ok) {
        return {
          output: `Could not create the page right now. The workspace API returned an error.`,
          success: false,
        };
      }

      const data = await res.json();
      const pageId = data?.page?.id || data?.id || 'unknown';
      return {
        output: `Created a new page "${title}" ${icon} in the workspace (id: ${pageId}). The page has ${blocks.length} block(s). You can tell ${ctx.pcgContext?.childName || 'the child'} it's ready to edit!`,
        success: true,
      };
    } catch {
      return {
        output: `Could not reach the workspace API to create the page.`,
        success: false,
      };
    }
  },
};
