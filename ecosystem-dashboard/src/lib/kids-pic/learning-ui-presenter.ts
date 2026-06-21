import type { LearnPlanActivity, LearnPlanSource } from '@/lib/kids-pic/learning-plan-types';

export type LearnThemeName = 'minecraft' | 'pusheen' | 'default';

export interface LearnThemePresentation {
  missionLabel: string;
  missionSubtitle: string;
  paceLine: string;
  assignmentLabel: string;
  reviewLabel: string;
  focusLabel: string;
  heroGradient: string;
  panelBorderColor: string;
}

export interface LearnPlanActivitySummary {
  assignmentCount: number;
  reviewCount: number;
  focusCount: number;
  hasAssignments: boolean;
}

export interface LearnWorkspacePromptPayload {
  prompt: string;
  fromLearn: true;
  plannerItem: {
    id: string;
    title: string;
    type: 'homework' | 'activity';
    subject: string;
    skillCode: string;
    isAssignment: boolean;
  };
}

export interface ReflectionWorkspacePromptPayload {
  prompt: string;
  fromLearn: true;
  plannerItem: {
    id: string;
    title: 'Learning Reflection';
    type: 'note';
    subject: 'Learn';
  };
}

const SOURCE_LABELS: Record<LearnPlanSource, string> = {
  kids_pcg_next_objectives: 'Adaptive prerequisite path',
  skill_progress_plus_catalog: 'Progress-based path',
  catalog_fallback: 'Starter content path',
};

export function describePlanSource(source?: LearnPlanSource): string {
  if (!source) {
    return 'Personalized learning path';
  }
  return SOURCE_LABELS[source] || 'Personalized learning path';
}

export function getLearnThemeName(themeName?: string): LearnThemeName {
  if (themeName === 'minecraft' || themeName === 'pusheen') {
    return themeName;
  }
  return 'default';
}

export function getLearnThemePresentation(themeName?: string): LearnThemePresentation {
  const theme = getLearnThemeName(themeName);

  if (theme === 'minecraft') {
    return {
      missionLabel: 'Quest Board',
      missionSubtitle: 'Build mastery one block at a time.',
      paceLine: 'Take on one challenge block at a time.',
      assignmentLabel: 'Family Quest',
      reviewLabel: 'Power-up Review',
      focusLabel: 'Build Challenges',
      heroGradient: 'linear-gradient(135deg, #2f6b2f 0%, #478947 55%, #5da65d 100%)',
      panelBorderColor: '#3F6828',
    };
  }

  if (theme === 'pusheen') {
    return {
      missionLabel: 'Cozy Plan',
      missionSubtitle: 'Small steps, big sparkle progress.',
      paceLine: 'Take one cozy step at a time.',
      assignmentLabel: 'Family Focus',
      reviewLabel: 'Gentle Warm-up',
      focusLabel: 'Focus Time',
      heroGradient: 'linear-gradient(135deg, #d797b6 0%, #e8b1c9 55%, #f3cfdf 100%)',
      panelBorderColor: '#B8849C',
    };
  }

  return {
    missionLabel: 'Today\'s Plan',
    missionSubtitle: 'A focused path that adapts to your growth.',
    paceLine: 'Take one focused step at a time.',
    assignmentLabel: 'Parent Assignment',
    reviewLabel: 'Warm-up Review',
    focusLabel: 'Focus Activities',
    heroGradient: 'linear-gradient(135deg, #4d67b5 0%, #5f8bea 55%, #7aa9ff 100%)',
    panelBorderColor: '#4D67B5',
  };
}

export function buildWorkspacePromptFromActivity(activity: LearnPlanActivity, childName?: string): string {
  const namePrefix = childName ? `${childName}'s` : 'My';
  const assignmentPrefix = activity.isAssignment ? 'Parent assignment' : 'Practice';
  const skillLabel = activity.title || activity.skillCode;

  return [
    `${assignmentPrefix} workspace page for ${namePrefix} ${skillLabel}.`,
    `Skill code: ${activity.skillCode}.`,
    `Prompt: ${activity.prompt}`,
    'Create sections for: plan, draft answer, explain my thinking, and what to practice next.',
  ].join(' ');
}

export function summarizeLearnPlanActivities(
  activities: LearnPlanActivity[],
  assignmentsApplied?: boolean,
): LearnPlanActivitySummary {
  const assignmentCount = activities.filter((item) => item.isAssignment === true).length;
  const reviewCount = activities.filter((item) => item.kind === 'review').length;
  const focusCount = Math.max(0, activities.length - reviewCount);

  return {
    assignmentCount,
    reviewCount,
    focusCount,
    hasAssignments: Boolean(assignmentsApplied) || assignmentCount > 0,
  };
}

export function buildWorkspacePayloadFromActivity(input: {
  activity: LearnPlanActivity;
  childName?: string;
  subjectLabel: string;
  fallbackTitle: string;
}): LearnWorkspacePromptPayload {
  const { activity, childName, subjectLabel, fallbackTitle } = input;

  return {
    prompt: buildWorkspacePromptFromActivity(activity, childName),
    fromLearn: true,
    plannerItem: {
      id: `learn.${activity.contentItemId}`,
      title: activity.title || fallbackTitle,
      type: activity.isAssignment ? 'homework' : 'activity',
      subject: subjectLabel,
      skillCode: activity.skillCode,
      isAssignment: activity.isAssignment === true,
    },
  };
}

export function buildReflectionWorkspacePrompt(input: {
  childName?: string;
  correctCount: number;
  total: number;
  reflection?: string;
}): string {
  const namePrefix = input.childName ? `${input.childName}'s` : 'My';
  const reflectionPrompt = `${input.reflection ?? ''}`.trim();

  return [
    `Learning reflection workspace page for ${namePrefix} session recap.`,
    `Score: ${input.correctCount}/${input.total}.`,
    reflectionPrompt ? `Current reflection note: ${reflectionPrompt}` : '',
    'Create sections for: wins, tricky spots, and next practice goals.',
  ]
    .filter(Boolean)
    .join(' ');
}

export function buildReflectionWorkspacePayload(input: {
  childName?: string;
  correctCount: number;
  total: number;
  reflection?: string;
  now?: number;
}): ReflectionWorkspacePromptPayload {
  return {
    prompt: buildReflectionWorkspacePrompt(input),
    fromLearn: true,
    plannerItem: {
      id: `learn.summary.${input.now ?? Date.now()}`,
      title: 'Learning Reflection',
      type: 'note',
      subject: 'Learn',
    },
  };
}
