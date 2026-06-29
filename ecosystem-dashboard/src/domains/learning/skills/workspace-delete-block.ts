import { SkillModule, ToolContext, ToolExecutionResult } from '../shared/skill-module';

export const workspaceDeleteBlockSkill: SkillModule = {
  id: 'workspace_delete_block',
  label: 'Delete Block',
  description: 'Delete (archive) a block from a page in the child workspace.',
  category: 'creative',
  endpoint: '/api/child/workspace',
  async execute(args, ctx: ToolContext): Promise<ToolExecutionResult> {
    const blockId = String(args.blockId || args.block_id || '');

    if (!blockId) {
      return {
        output: `I need to know which block to delete. Please provide a blockId.`,
        success: false,
      };
    }

    const permanent = args.permanent === true;

    try {
      const res = await fetch(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/child/workspace?blockId=${encodeURIComponent(blockId)}${permanent ? '&permanent=true' : ''}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        },
      );

      if (!res.ok) {
        return {
          output: `Could not delete the block right now.`,
          success: false,
        };
      }

      return {
        output: `${permanent ? 'Permanently deleted' : 'Archived'} the block (id: ${blockId}) from the workspace. ${ctx.pcgContext?.childName || 'The child'} will see it's gone.`,
        success: true,
      };
    } catch {
      return {
        output: `Could not reach the workspace API to delete the block.`,
        success: false,
      };
    }
  },
};
