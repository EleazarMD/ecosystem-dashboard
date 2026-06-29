import { SkillModule, ToolContext, ToolExecutionResult } from '../shared/skill-module';

export const workspaceAddBlockSkill: SkillModule = {
  id: 'workspace_add_block',
  label: 'Add Block',
  description: 'Add a new block (paragraph, heading, list, to-do, callout, quote, code, divider) to a page in the child workspace.',
  category: 'creative',
  endpoint: '/api/child/workspace',
  async execute(args, ctx: ToolContext): Promise<ToolExecutionResult> {
    const pageId = String(args.pageId || args.page_id || '');
    const blockType = String(args.blockType || args.type || 'paragraph');
    const content = String(args.content || '');
    const properties = args.properties && typeof args.properties === 'object' ? args.properties : {};

    if (!pageId) {
      return {
        output: `I need to know which page to add the block to. Please provide a pageId.`,
        success: false,
      };
    }

    const body = {
      action: 'create-block',
      pageId,
      blockType,
      content,
      properties,
    };

    try {
      const res = await fetch(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/child/workspace`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );

      if (!res.ok) {
        return {
          output: `Could not add the block to the page right now.`,
          success: false,
        };
      }

      const data = await res.json();
      const blockId = data?.block?.id || data?.id || 'unknown';
      return {
        output: `Added a ${blockType} block to the page (block id: ${blockId}). ${ctx.pcgContext?.childName || 'The child'} can see it now!`,
        success: true,
      };
    } catch {
      return {
        output: `Could not reach the workspace API to add the block.`,
        success: false,
      };
    }
  },
};
