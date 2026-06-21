/**
 * Learning domain widgets — UI-facing types and presentation helpers
 * consumed by the Learn hub page and family learning dashboard.
 *
 * Re-exports from:
 * - learning-plan-types.ts (LearnPlanActivity, LearnPlanResponse, etc.)
 * - learning-ui-presenter.ts (buildWorkspacePayloadFromActivity, etc.)
 * - family-learning-presenter.ts (buildFamilyLearningSnapshot)
 */
export type {
  LearnPlanActivity,
  LearnPlanSource,
  LearnPlanResponse,
} from '@/lib/kids-pic/learning-plan-types';

export {
  buildReflectionWorkspacePayload,
  buildReflectionWorkspacePrompt,
  buildWorkspacePayloadFromActivity,
  describePlanSource,
  getLearnThemePresentation,
  summarizeLearnPlanActivities,
} from '@/lib/kids-pic/learning-ui-presenter';

export {
  buildFamilyLearningSnapshot,
} from '@/lib/kids-pic/family-learning-presenter';
