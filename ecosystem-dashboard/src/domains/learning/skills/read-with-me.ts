import { SkillModule, ToolExecutionResult } from '../shared/skill-module';

export const readWithMeSkill: SkillModule = {
  id: 'read_with_me',
  label: 'Read With Me',
  description: 'Offer to read the current passage aloud and ask a comprehension question.',
  category: 'reading',
  execute(): ToolExecutionResult {
    return {
      output: `Offer to read the current passage aloud. Break long sentences into shorter parts. Ask a gentle comprehension question after.`,
      success: true,
    };
  },
};
