import { SkillModule, ToolExecutionResult } from '../shared/skill-module';
import { activityRegistry } from '../shared/activity-types';

export const recommendActivitySkill: SkillModule = {
  id: 'recommend_activity',
  label: 'Recommend Activity',
  description: "Suggest a suitable next activity from the registry based on the child's context.",
  category: 'navigation',
  execute(args, ctx): ToolExecutionResult {
    const requestedCategory = String(args.category || '').toLowerCase();
    const excludeId = String(args.exclude || '');
    const all = activityRegistry.all();

    const candidates = all.filter((a) => {
      if (excludeId && a.id === excludeId) return false;
      if (requestedCategory && a.category !== requestedCategory) return false;
      if (a.navVisible === false) return false;
      return true;
    });

    if (candidates.length === 0) {
      return {
        output: 'I looked around but could not find a perfect match. Want to try the Art Studio or Pokémon Lab?',
        success: true,
      };
    }

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    const name = ctx.pcgContext?.childName || 'friend';

    return {
      output: `How about ${pick.name} ${pick.icon || ''}? ${pick.description || ''} Tap it to get started!`,
      success: true,
    };
  },
};
