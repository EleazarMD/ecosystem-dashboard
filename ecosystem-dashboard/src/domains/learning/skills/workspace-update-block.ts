import { SkillModule, ToolContext, ToolExecutionResult } from '../shared/skill-module';

export const workspaceUpdateBlockSkill: SkillModule = {
  id: 'workspace_update_block',
  label: 'Update Block',
  description: 'Update an existing block\'s content, type, or properties in the child workspace.',
  category: 'creative',
  endpoint: '/api/child/workspace',
  async execute(args, ctx: ToolContext): Promise<ToolExecutionResult> {
    const blockId = String(args.blockId || args.block_id || '');
    const blockType = String(args.blockType || args.type || '');
    const content = args.content !== undefined ? String(args.content) : '';
    const properties = args.properties && typeof args.properties === 'object' ? args.properties : undefined;

    if (!blockId) {
      return {
        output: `I need to know which block to update. Please provide a blockId.`,
        success: false,
      };
    }

    const body: Record<string, unknown> = { blockId };
    if (blockType) body.type = blockType;
    if (content) body.content = content;
    if (properties) body.properties = properties;

    try {
      const res = await fetch(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/child/workspace`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );

      if (!res.ok) {
        return {
          output: `Could not update the block right now.`,
          success: false,
        };
      }

      return {
        output: `Updated the block (id: ${blockId}) in the workspace. ${ctx.pcgContext?.childName || 'The child'} can see the change!`,
        success: true,
      };
    } catch {
      return {
        output: `Could not reach the workspace API to update the block.`,
        success: false,
      };
    }
  },
};
