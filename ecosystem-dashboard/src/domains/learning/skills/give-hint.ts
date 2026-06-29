import { SkillModule, ToolExecutionResult } from '../shared/skill-module';

export const giveHintSkill: SkillModule = {
  id: 'give_hint',
  label: 'Give Hint',
  description: 'Reveal the next laddered hint, bounded by the attempt number.',
  category: 'tutoring',
  execute(args, ctx): ToolExecutionResult {
    const hintsAvailable = ctx.hintSet.length;
    if (hintsAvailable === 0) {
      return {
        output: 'No hints available for this problem. Try re-reading it carefully.',
        success: true,
      };
    }

    const hintLevel = args.hintLevel as number | undefined;
    const level = hintLevel != null
      ? Math.min(hintLevel, hintsAvailable - 1)
      : Math.min(ctx.attemptNumber - 1, hintsAvailable - 1);

    const hint = ctx.hintSet[level];
    return {
      output: `Hint ${level + 1} of ${hintsAvailable}: ${hint}`,
      success: true,
    };
  },
};
