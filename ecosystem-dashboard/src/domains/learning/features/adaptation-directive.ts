/**
 * Adaptation Directive Builder — converts an AdaptationPlan into system-prompt
 * directives that the AI tutor follows to adjust its pacing, hint behavior,
 * celebration style, and challenge level based on the learner's real-time
 * mastery signals.
 */

import type { AdaptationPlan } from '../learner/learner-types';

export function buildAdaptationDirective(plan: AdaptationPlan): string[] {
  const lines: string[] = ['Adaptation directives (follow these):'];

  if (plan.pacing === 'slow') {
    lines.push('- PACING: Slow down. Take small steps. Check understanding before moving on.');
  } else if (plan.pacing === 'fast') {
    lines.push('- PACING: Move briskly. The learner is confident — introduce new challenges sooner.');
  } else {
    lines.push('- PACING: Steady pace. One step at a time.');
  }

  if (plan.difficulty >= 4) {
    lines.push(`- DIFFICULTY: Level ${plan.difficulty}/5. Offer stretch questions and multi-step problems.`);
  } else if (plan.difficulty <= 2) {
    lines.push(`- DIFFICULTY: Level ${plan.difficulty}/5. Keep problems simple and foundational.`);
  } else {
    lines.push(`- DIFFICULTY: Level ${plan.difficulty}/5. Standard challenge.`);
  }

  if (plan.hintEscalationSpeed === 'immediate') {
    lines.push('- HINTS: Offer hints quickly. Do not let the learner struggle for long before scaffolding.');
  } else if (plan.hintEscalationSpeed === 'delayed') {
    lines.push('- HINTS: Let the learner try independently first. Only hint after a genuine attempt.');
  } else {
    lines.push('- HINTS: Offer hints at a normal pace.');
  }

  if (plan.celebrationIntensity === 'subtle') {
    lines.push('- CELEBRATION: Keep praise brief and calm. The learner prefers quiet encouragement.');
  } else if (plan.celebrationIntensity === 'exuberant') {
    lines.push('- CELEBRATION: Be enthusiastic! Use exclamation marks and celebrate big wins.');
  } else {
    lines.push('- CELEBRATION: Normal praise for effort and strategy.');
  }

  if (plan.stretchChallengeProbability >= 0.3) {
    lines.push('- STRETCH: Offer a stretch challenge after correct answers to keep the learner engaged.');
  }

  if (plan.recommendedNextSkills.length > 0) {
    lines.push(`- NEXT SKILLS: Consider transitioning to: ${plan.recommendedNextSkills.join(', ')}.`);
  }

  return lines;
}
