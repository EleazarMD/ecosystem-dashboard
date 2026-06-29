/**
 * Daily Mission — composes a single "today's adventure" from three phases:
 *   1. Review Burst (spaced-review picks — confidence-building retention reps)
 *   2. Focus Step (today's plan ZPD objective — the new learning)
 *   3. Reflection (metacognition prompt — closes the loop)
 *
 * Contract: docs/LEARNING_PATH_STUDIO_REVIEW_2026-06.md §3.C
 *
 * The mission is pure given its inputs (skill summary + plan activities +
 * spaced-review schedule). The API route feeds real data; tests can feed
 * fixtures.
 */

import type { ChildSkillSummary } from '@/lib/kids-pic/SkillProgressService';
import {
  selectSpacedReviewSkills,
  type SpacedReviewPick,
} from '@/lib/kids-pic/spaced-review';
import type { LearnPlanActivity } from '@/lib/kids-pic/learning-plan-types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MissionReviewItem {
  skillCode: string;
  skillName: string;
  emoji: string;
}

export interface MissionFocusItem {
  skillCode: string;
  skillName: string;
  title: string;
  prompt: string;
  emoji: string;
  contentItemId?: string;
  pathId?: string;
  pathStepNumber?: number;
}

export interface MissionReflection {
  prompt: string;
  emoji: string;
}

export interface DailyMission {
  /** Stable id for the day (date-based, child-scoped). */
  id: string;
  childId: string;
  date: string;
  title: string;
  emoji: string;
  description: string;
  /** Phase 1: 3–5 spaced-review items for the opening burst. */
  reviewBurst: MissionReviewItem[];
  /** Phase 2: the ZPD focus step (today's new learning). */
  focus: MissionFocusItem | null;
  /** Phase 3: metacognition reflection prompt. */
  reflection: MissionReflection;
  /** Total estimated cards (review + focus + reflection). */
  estimatedCards: number;
  /** Skill codes covered by this mission (for mastery tracking). */
  skillCodes: string[];
  /** Launch route — where the child goes to start the mission. */
  route: string;
}

// ---------------------------------------------------------------------------
// Domain → emoji / theme mapping
// ---------------------------------------------------------------------------

const DOMAIN_EMOJI: Record<string, string> = {
  math: '🔢',
  reading: '📖',
  writing: '✍️',
  analytical: '🧩',
  science: '🔬',
  social: '🌍',
  art: '🎨',
  default: '⭐',
};

const MISSION_EMOJIS = ['🗺️', '🚀', '🌟', '🎯', '🌈', '⚡', '🎪', '🏆'];
const REFLECTION_PROMPTS = [
  { prompt: 'How did that feel — easy, just right, or very hard?', emoji: '🤔' },
  { prompt: 'What was the trickiest part? What made it click?', emoji: '💡' },
  { prompt: 'What would you tell a friend who is about to try this?', emoji: '💬' },
  { prompt: 'What is one thing you want to remember from today?', emoji: '🧠' },
];

function domainEmoji(domainCode: string): string {
  return DOMAIN_EMOJI[domainCode] || DOMAIN_EMOJI.default;
}

function missionEmoji(date: string): string {
  const dayOfYear = Math.floor(
    (new Date(date).getTime() - new Date(new Date(date).getFullYear(), 0, 0).getTime()) /
      (24 * 60 * 60 * 1000),
  );
  return MISSION_EMOJIS[dayOfYear % MISSION_EMOJIS.length];
}

function reflectionForDate(date: string): MissionReflection {
  const dayOfYear = Math.floor(
    (new Date(date).getTime() - new Date(new Date(date).getFullYear(), 0, 0).getTime()) /
      (24 * 60 * 60 * 1000),
  );
  return REFLECTION_PROMPTS[dayOfYear % REFLECTION_PROMPTS.length];
}

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

export interface ComposeDailyMissionInput {
  childId: string;
  /** ISO date string (YYYY-MM-DD). Defaults to today. */
  date?: string;
  /** Child's skill summary for spaced-review selection. */
  summary: ChildSkillSummary | null;
  /** Today's plan activities (from /api/learn/plan). The first non-review
   *  activity becomes the focus step. */
  activities: LearnPlanActivity[];
}

/**
 * Compose a daily mission from spaced-review picks + today's plan + reflection.
 *
 * The mission always has a reflection prompt. If there are no activities and
 * no review items, the mission is still returned with a "cold start" message
 * so the UI can show an encouraging empty state.
 */
export function composeDailyMission(input: ComposeDailyMissionInput): DailyMission {
  const date = input.date || new Date().toISOString().slice(0, 10);
  const id = `mission-${input.childId}-${date}`;

  // Phase 1: spaced-review burst (3–5 items)
  const reviewPicks: SpacedReviewPick[] = input.summary
    ? selectSpacedReviewSkills(input.summary, 5, [])
    : [];

  const reviewBurst: MissionReviewItem[] = reviewPicks.map((pick) => ({
    skillCode: pick.skillCode,
    skillName: pick.skillName,
    emoji: domainEmoji(pick.domainCode),
  }));

  // Phase 2: focus step — first non-review activity from today's plan
  const focusActivity = input.activities.find(
    (a) => a.kind !== 'review' || a.isAssignment,
  );

  let focus: MissionFocusItem | null = null;
  if (focusActivity) {
    focus = {
      skillCode: focusActivity.skillCode,
      skillName: focusActivity.title || focusActivity.skillCode,
      title: focusActivity.title,
      prompt: focusActivity.prompt,
      emoji: focusActivity.pathEmoji || domainEmoji(focusActivity.skillCode.split('.')[0]),
      contentItemId: focusActivity.contentItemId,
      pathId: focusActivity.pathId,
      pathStepNumber: focusActivity.pathStepNumber,
    };
  }

  // Phase 3: reflection
  const reflection = reflectionForDate(date);

  // Skill codes covered
  const skillCodes = [
    ...reviewBurst.map((r) => r.skillCode),
    ...(focus ? [focus.skillCode] : []),
  ];

  const estimatedCards = reviewBurst.length + (focus ? 1 : 0) + 1; // +1 for reflection

  // Title & description
  const hasReview = reviewBurst.length > 0;
  const hasFocus = !!focus;

  let title: string;
  let description: string;

  if (hasFocus && hasReview) {
    title = `${focus!.emoji} ${focus!.skillName} Adventure`;
    description = `Warm up with ${reviewBurst.length} quick review${reviewBurst.length > 1 ? 's' : ''}, then learn something new!`;
  } else if (hasFocus) {
    title = `${focus!.emoji} ${focus!.skillName} Adventure`;
    description = 'A brand new skill to explore today!';
  } else if (hasReview) {
    title = `🔄 Power Review Day`;
    description = `Refresh ${reviewBurst.length} skills you've learned before!`;
  } else {
    title = '🌟 First Adventure';
    description = 'Let\'s start your very first learning adventure!';
  }

  // Route: if the focus has a pathId, go to the learning path; otherwise learn hub
  const route = focus?.pathId ? '/child/learn' : '/child/learn';

  return {
    id,
    childId: input.childId,
    date,
    title,
    emoji: missionEmoji(date),
    description,
    reviewBurst,
    focus,
    reflection,
    estimatedCards,
    skillCodes,
    route,
  };
}
