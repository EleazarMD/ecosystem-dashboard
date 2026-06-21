/**
 * Learning platform configuration — resolved open decisions O5, O6, O7.
 *
 * O5: Default session length + daily learning target per age band.
 * O6: External tutoring APIs policy.
 * O7: Curriculum priority when enabled.
 *
 * Research basis for O5: AAP guidelines (quality + balance for school-age),
 * pediatric practice benchmarks (≤2h/day recreational for 5-17), and
 * educational research on attention spans by age. See LEARNING_PLATFORM_ROADMAP.md
 * Section 16 for the full decision record.
 */

import type { LearnAgeBand } from './phase1-starter-content';

// ---------------------------------------------------------------------------
// O5: Session defaults per age band
// ---------------------------------------------------------------------------

export interface AgeBandSessionConfig {
  /** Recommended focused session length in minutes. */
  defaultSessionMinutes: number;
  /** Recommended daily learning target in minutes (across all sessions). */
  dailyLearningTargetMinutes: number;
  /** Default daily usage limit in minutes (parental controls override). */
  defaultDailyLimitMinutes: number;
  /** Recommended break after each session (minutes). */
  breakMinutes: number;
  /** Max activities per session (warm-up + focus objectives). */
  maxActivitiesPerSession: number;
}

const SESSION_CONFIGS: Record<LearnAgeBand, AgeBandSessionConfig> = {
  early: {
    defaultSessionMinutes: 15,
    dailyLearningTargetMinutes: 30,
    defaultDailyLimitMinutes: 45,
    breakMinutes: 10,
    maxActivitiesPerSession: 3,
  },
  middle: {
    defaultSessionMinutes: 20,
    dailyLearningTargetMinutes: 45,
    defaultDailyLimitMinutes: 60,
    breakMinutes: 5,
    maxActivitiesPerSession: 4,
  },
  tween: {
    defaultSessionMinutes: 25,
    dailyLearningTargetMinutes: 60,
    defaultDailyLimitMinutes: 90,
    breakMinutes: 5,
    maxActivitiesPerSession: 5,
  },
};

/**
 * Get session configuration for an age band.
 * Falls back to `middle` for unknown bands.
 */
export function getAgeBandSessionConfig(ageBand: LearnAgeBand | string | undefined): AgeBandSessionConfig {
  if (ageBand && ageBand in SESSION_CONFIGS) {
    return SESSION_CONFIGS[ageBand as LearnAgeBand];
  }
  return SESSION_CONFIGS.middle;
}

/**
 * Get the default daily limit minutes for an age band.
 * This is the fallback when parental controls don't specify a limit.
 */
export function getDefaultDailyLimitMinutes(ageBand?: LearnAgeBand | string): number {
  return getAgeBandSessionConfig(ageBand).defaultDailyLimitMinutes;
}

// ---------------------------------------------------------------------------
// O6: External tutoring API policy
// ---------------------------------------------------------------------------

/**
 * O6 Decision: Local AI Gateway only for the pilot phase.
 *
 * The learning platform routes all AI generation through the local AI Gateway
 * (env `AI_GATEWAY_URL`) using the child-safety API key. No external/3rd-party
 * tutoring APIs are permitted during Phase 2–5. The Agent Runtime adapter
 * pattern (harness spec Section 4.1) allows adding external adapters in the
 * future without changing the pipeline.
 */
export const EXTERNAL_TUTORING_APIS_ALLOWED = false;

/**
 * The AI Gateway endpoint for child-facing learning generation.
 * Uses the child-safety API key to enforce minor-restricted content policies.
 */
export const CHILD_AI_GATEWAY_PATH = '/api/v1/chat/completions';

// ---------------------------------------------------------------------------
// O7: Curriculum priority
// ---------------------------------------------------------------------------

/**
 * O7 Decision: TEKS (Texas Essential Knowledge and Skills) is the priority
 * framework when curriculum alignment is enabled.
 *
 * The platform remains platform-skills-first by default (Principle 1).
 * When a parent opts into curriculum alignment, TEKS is the default framework
 * given existing data coverage. CCSS and UK_NC remain available as alternatives.
 */
export const DEFAULT_CURRICULUM_FRAMEWORK = 'TEKS' as const;

/**
 * Available curriculum frameworks, in priority order.
 */
export const CURRICULUM_FRAMEWORKS = ['TEKS', 'CCSS', 'UK_NC'] as const;

export type CurriculumFrameworkCode = typeof CURRICULUM_FRAMEWORKS[number];

/**
 * Whether curriculum alignment is enabled by default for a new child.
 * Always false — curriculum is opt-in only (roadmap Principle 1).
 */
export const CURRICULUM_ENABLED_BY_DEFAULT = false;
