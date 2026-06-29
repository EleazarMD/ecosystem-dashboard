import { SkillModule, ToolExecutionResult } from '../shared/skill-module';

export const defineWordSkill: SkillModule = {
  id: 'define_word',
  label: 'Define Word',
  description: 'Offer a kid-friendly definition of a word the learner is stuck on.',
  category: 'reference',
  execute(args): ToolExecutionResult {
    const word = String(args.word || '').trim();
    if (!word) {
      return { output: 'No word provided to define.', success: false };
    }
    return {
      output: `"${word}" — look this up in the dictionary for a kid-friendly definition. Suggest the learner tap the word to see its meaning.`,
      success: true,
    };
  },
};
