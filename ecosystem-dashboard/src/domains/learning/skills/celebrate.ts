import { SkillModule, ToolExecutionResult } from '../shared/skill-module';

export const celebrateSkill: SkillModule = {
  id: 'celebrate',
  label: 'Celebrate',
  description: 'Acknowledge effort and strategy (anti-sycophancy monitored).',
  category: 'celebration',
  execute(_args, ctx): ToolExecutionResult {
    return {
      output: `Great effort, ${ctx.pcgContext?.childName || 'friend'}! 🎉 You showed real persistence and smart thinking. Keep it up!`,
      success: true,
    };
  },
};
