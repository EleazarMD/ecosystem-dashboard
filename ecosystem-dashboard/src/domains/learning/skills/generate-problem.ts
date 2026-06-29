import { SkillModule, ToolExecutionResult } from '../shared/skill-module';

export const generateProblemSkill: SkillModule = {
  id: 'generate_problem',
  label: 'Generate Problem',
  description: 'Create a fresh, kid-friendly practice problem for the current skill.',
  category: 'practice',
  execute(args, ctx): ToolExecutionResult {
    const skill = (args.skillCode as string) || ctx.skillCode || 'general-math';
    const difficulty = typeof args.difficulty === 'number' ? args.difficulty : 1;
    const name = ctx.pcgContext?.childName || 'friend';

    const problems: Record<string, string[]> = {
      'addition': ['What is 7 + 5?', 'What is 12 + 8?', 'What is 9 + 6?'],
      'subtraction': ['What is 15 - 7?', 'What is 20 - 9?', 'What is 14 - 6?'],
      'general-math': ['What is 4 × 6?', 'What is 24 ÷ 3?', 'What is 9 + 7?'],
      'spelling': ['How do you spell "friend"?', 'How do you spell "together"?', 'How do you spell "learn"?'],
      'reading': ['Read this sentence: "The cat sat on the mat."', 'Read this word: "adventure"', 'Read this word: "curious"'],
    };

    const bucket = problems[skill] || problems['general-math'];
    const pick = bucket[Math.min(difficulty, bucket.length - 1)];

    return {
      output: `Here is a practice problem for you, ${name}: ${pick} Take your time and give it your best try!`,
      success: true,
    };
  },
};
