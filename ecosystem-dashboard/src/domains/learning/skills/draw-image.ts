import { SkillModule, ToolExecutionResult } from '../shared/skill-module';

export const drawImageSkill: SkillModule = {
  id: 'draw_image',
  label: 'Draw Image',
  description: 'Encourage the child to use canvas tools with a creative prompt.',
  category: 'creative',
  requiresApproval: true,
  execute(_args, ctx): ToolExecutionResult {
    return {
      output: `The child wants to create art. Encourage them to use the canvas tools. Suggest a creative prompt based on what they're interested in.`,
      success: true,
    };
  },
};
