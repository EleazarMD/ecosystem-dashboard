import type { LearnPlanActivity } from '@/domains/learning/shared/plan-types';
import {
  buildReflectionWorkspacePayload,
  buildReflectionWorkspacePrompt,
  buildWorkspacePayloadFromActivity,
  describePlanSource,
  getLearnThemePresentation,
  summarizeLearnPlanActivities,
} from '@/domains/learning/shared/ui-presenter';

describe('learning-ui-presenter', () => {
  const assignmentActivity: LearnPlanActivity = {
    type: 'question',
    kind: 'practice',
    skillCode: 'math.addition',
    contentItemId: 'content.math.addition.1',
    title: '',
    prompt: 'What is 7 + 5?',
    difficulty: 1,
    isAssignment: true,
  };

  it('maps plan sources to user-facing labels', () => {
    expect(describePlanSource('kids_pcg_next_objectives')).toBe('Adaptive prerequisite path');
    expect(describePlanSource('catalog_fallback')).toBe('Starter content path');
    expect(describePlanSource(undefined)).toBe('Personalized learning path');
  });

  it('returns themed mission presentation for known and unknown themes', () => {
    expect(getLearnThemePresentation('minecraft')).toMatchObject({
      missionLabel: 'Quest Board',
      assignmentLabel: 'Family Quest',
      focusLabel: 'Build Challenges',
      paceLine: 'Take on one challenge block at a time.',
    });

    expect(getLearnThemePresentation('pusheen')).toMatchObject({
      missionLabel: 'Cozy Plan',
      reviewLabel: 'Gentle Warm-up',
      focusLabel: 'Focus Time',
      paceLine: 'Take one cozy step at a time.',
    });

    expect(getLearnThemePresentation('unknown-theme')).toMatchObject({
      missionLabel: "Today's Plan",
      assignmentLabel: 'Parent Assignment',
      focusLabel: 'Focus Activities',
      paceLine: 'Take one focused step at a time.',
    });
  });

  it('summarizes assignment/review/focus counts from activities', () => {
    const summary = summarizeLearnPlanActivities(
      [
        assignmentActivity,
        {
          ...assignmentActivity,
          contentItemId: 'content.math.review.1',
          isAssignment: false,
          kind: 'review',
          skillCode: 'math.review',
        },
        {
          ...assignmentActivity,
          contentItemId: 'content.reading.1',
          isAssignment: false,
          kind: 'practice',
          skillCode: 'reading.main_idea',
        },
      ],
      false,
    );

    expect(summary).toEqual({
      assignmentCount: 1,
      reviewCount: 1,
      focusCount: 2,
      hasAssignments: true,
    });
  });

  it('honors assignmentsApplied flag even when no activity is tagged as assignment', () => {
    const summary = summarizeLearnPlanActivities(
      [
        {
          ...assignmentActivity,
          isAssignment: false,
          contentItemId: 'content.math.practice.1',
        },
      ],
      true,
    );

    expect(summary.hasAssignments).toBe(true);
    expect(summary.assignmentCount).toBe(0);
  });

  it('builds workspace payload for activity handoff', () => {
    const payload = buildWorkspacePayloadFromActivity({
      activity: assignmentActivity,
      childName: 'Luca',
      subjectLabel: 'Math',
      fallbackTitle: 'Addition Warm-up',
    });

    expect(payload).toMatchObject({
      fromLearn: true,
      plannerItem: {
        id: 'learn.content.math.addition.1',
        title: 'Addition Warm-up',
        type: 'homework',
        subject: 'Math',
        skillCode: 'math.addition',
        isAssignment: true,
      },
    });
    expect(payload.prompt).toContain("Parent assignment workspace page for Luca's math.addition.");
    expect(payload.prompt).toContain('Prompt: What is 7 + 5?');
  });

  it('builds reflection prompt and payload with deterministic id', () => {
    const prompt = buildReflectionWorkspacePrompt({
      childName: 'Sophia',
      correctCount: 4,
      total: 5,
      reflection: 'I want more practice with word problems.',
    });

    expect(prompt).toContain("Learning reflection workspace page for Sophia's session recap.");
    expect(prompt).toContain('Score: 4/5.');
    expect(prompt).toContain('Current reflection note: I want more practice with word problems.');

    const payload = buildReflectionWorkspacePayload({
      childName: 'Sophia',
      correctCount: 4,
      total: 5,
      reflection: 'I want more practice with word problems.',
      now: 123,
    });

    expect(payload).toMatchObject({
      fromLearn: true,
      plannerItem: {
        id: 'learn.summary.123',
        title: 'Learning Reflection',
        type: 'note',
        subject: 'Learn',
      },
    });
    expect(payload.prompt).toContain('Score: 4/5.');
  });
});
