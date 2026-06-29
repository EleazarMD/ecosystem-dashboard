import { SkillModule, ToolExecutionResult } from '../shared/skill-module';

export const showPassageSkill: SkillModule = {
  id: 'show_passage',
  label: 'Show Passage',
  description: 'Display the current reading passage and suggest tapping words for definitions.',
  category: 'reading',
  execute(): ToolExecutionResult {
    return {
      output: `Display the current reading passage. If the child is stuck on a word, suggest tapping it for a definition.`,
      success: true,
    };
  },
};
