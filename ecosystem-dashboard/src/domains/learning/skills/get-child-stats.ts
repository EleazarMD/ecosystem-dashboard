import { SkillModule, ToolExecutionResult } from '../shared/skill-module';
import { getTodayUsage } from '@/lib/parental-controls/usageTracker';

export const getChildStatsSkill: SkillModule = {
  id: 'get_child_stats',
  label: 'Get Child Stats',
  description: "Fetch the child's real platform usage and progress stats (e.g., time spent today).",
  category: 'stats',
  async execute(_args, ctx): Promise<ToolExecutionResult> {
    const childId = ctx.childUserId;
    if (!childId || childId === 'unknown') {
      return {
        output: 'Child user id is not available, so I cannot look up stats right now.',
        success: true,
      };
    }

    try {
      const usage = await getTodayUsage(childId);
      const minutes = usage.todayMinutes || 0;
      const limit = usage.limitMinutes || 0;
      const remaining = usage.remainingMinutes || 0;

      return {
        output: `Today: ${minutes} minutes spent on the platform. ${limit > 0 ? `Daily limit is ${limit} minutes, ${remaining} minutes remaining.` : 'No daily time limit is set.'} Keep up the great work!`,
        success: true,
      };
    } catch {
      return {
        output: 'I could not fetch your stats right now. Try again in a moment!',
        success: false,
      };
    }
  },
};
