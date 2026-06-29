import { SkillModule, ToolExecutionResult } from '../shared/skill-module';

export const journalWriteSkill: SkillModule = {
  id: 'journal_write',
  label: 'Journal Write',
  description: 'Help the child reflect with a gentle, open-ended question.',
  category: 'creative',
  execute(): ToolExecutionResult {
    return {
      output: `Help the child reflect. Ask a gentle, open-ended question about their day or feelings. Keep it warm and non-judgmental.`,
      success: true,
    };
  },
};
