/**
 * Adaptation Engine — reads mastery + persona + preferences → produces pacing,
 * difficulty, and coaching style adjustments.
 *
 * Contract: docs/MODULAR_ARCHITECTURE.md §4
 */

import type { LearnerProfile, AdaptationPlan } from './learner-types';
import type { MasteryContext, SessionPhase } from '../shared/agent-loop-types';

export function computeAdaptation(
  profile: LearnerProfile,
  mastery?: MasteryContext,
  sessionPhase?: SessionPhase,
): AdaptationPlan {
  const currentSkill = mastery?.currentSkill;
  const skillMastery = currentSkill
    ? profile.skillMastery[currentSkill] ?? mastery?.skillMastery?.[currentSkill] ?? 0.5
    : 0.5;

  const sessionCorrect = mastery?.sessionCorrect ?? 0;
  const sessionAttempts = mastery?.sessionAttempts ?? 0;
  const sessionRate = sessionAttempts > 0 ? sessionCorrect / sessionAttempts : 0.5;
  const streak = mastery?.currentStreak ?? 0;

  // Pacing: slow down if struggling, speed up if mastering
  let pacing: AdaptationPlan['pacing'] = 'medium';
  if (skillMastery <= 0.4 || sessionRate < 0.3) {
    pacing = 'slow';
  } else if (skillMastery >= 0.8 && sessionRate >= 0.7) {
    pacing = 'fast';
  }

  // Difficulty: adapt based on mastery + session performance
  let difficulty = profile.preferredDifficulty;
  if (skillMastery >= 0.85 && streak >= 3) {
    difficulty = Math.min(5, difficulty + 1);
  } else if (skillMastery <= 0.3 && sessionRate < 0.3) {
    difficulty = Math.max(1, difficulty - 1);
  }

  // Hint escalation: immediate for struggling learners, delayed for high mastery
  let hintEscalationSpeed: AdaptationPlan['hintEscalationSpeed'] = 'normal';
  if (skillMastery <= 0.4) {
    hintEscalationSpeed = 'immediate';
  } else if (skillMastery >= 0.8) {
    hintEscalationSpeed = 'delayed';
  }

  // Celebration intensity: adapt to observed response
  let celebrationIntensity: AdaptationPlan['celebrationIntensity'] = 'normal';
  if (profile.responseToCelebration === 'shy') {
    celebrationIntensity = 'subtle';
  } else if (profile.responseToCelebration === 'energized' && streak >= 3) {
    celebrationIntensity = 'exuberant';
  }

  // Stretch challenge probability: high mastery → more stretch
  const stretchChallengeProbability = skillMastery >= 0.8 ? 0.4 : skillMastery >= 0.6 ? 0.15 : 0;

  // Recommended next skills: simple prerequisite-based recommendation
  const recommendedNextSkills = profile.recentStrengths
    .filter((s) => !profile.recentStruggles.includes(s))
    .slice(0, 3);

  // Session phase overrides
  if (sessionPhase === 'opening') {
    return {
      pacing: 'medium',
      difficulty: Math.max(1, difficulty - 1), // start easier
      hintEscalationSpeed: 'normal',
      celebrationIntensity: 'normal',
      stretchChallengeProbability: 0,
      recommendedNextSkills,
    };
  }

  if (sessionPhase === 'closing') {
    return {
      pacing: 'medium',
      difficulty,
      hintEscalationSpeed: 'normal',
      celebrationIntensity: profile.responseToCelebration === 'shy' ? 'subtle' : 'normal',
      stretchChallengeProbability: 0,
      recommendedNextSkills,
    };
  }

  return {
    pacing,
    difficulty,
    hintEscalationSpeed,
    celebrationIntensity,
    stretchChallengeProbability,
    recommendedNextSkills,
  };
}
