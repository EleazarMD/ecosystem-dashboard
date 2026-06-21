/**
 * Spaced-review scheduler — determines which previously-practiced skills are due
 * for a retention rep and when the next review should occur.
 *
 * Design (roadmap 9.1, 12.1):
 * - Warm-up slot in each session opens with a spaced-review pick.
 * - Interval expands when the child demonstrates retention (score >= 0.8),
 *   contracts when they struggle (score < 0.6).
 * - Skills with no assessment history are never scheduled (cold start).
 * - The scheduler is pure / DB-free: the plan route feeds a ChildSkillSummary
 *   and gets back ordered review picks + next-review timestamps.
 */

import type { ChildSkillSummary, SkillProgress } from '@/lib/kids-pic/SkillProgressService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReviewScheduleEntry {
  skillCode: string;
  skillName: string;
  domainCode: string;
  domainName: string;
  currentScore: number;
  lastAssessmentDate: Date | null;
  /** Epoch ms when the next review should happen. */
  nextReviewAt: number;
  /** How many days until the next review (rounded, min 1). */
  daysUntilReview: number;
  /** Whether this skill is overdue for review. */
  isOverdue: boolean;
  /** Consecutive successful reviews (inferred from streak + score). */
  reviewStreak: number;
}

export interface SpacedReviewPick {
  skillCode: string;
  skillName: string;
  domainCode: string;
  domainName: string;
  currentScore: number;
  /** "review" to match PlannerObjective.kind. */
  kind: 'review';
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Minimum competence for a skill to be eligible for spaced review. */
export const SPACED_REVIEW_MIN_SCORE = 0.5;

/** Base interval (days) for a skill with 1 assessment at decent score. */
export const BASE_INTERVAL_DAYS = 2;

/** Maximum interval (days) between reviews for a well-retained skill. */
export const MAX_INTERVAL_DAYS = 30;

/** Minimum interval (days) — a skill never reviews sooner than this. */
export const MIN_INTERVAL_DAYS = 1;

/** Score threshold above which the interval expands. */
export const EXPANSION_SCORE_THRESHOLD = 0.8;

/** Score threshold below which the interval contracts. */
export const CONTRACTION_SCORE_THRESHOLD = 0.6;

// ---------------------------------------------------------------------------
// Core scheduling logic (pure)
// ---------------------------------------------------------------------------

/**
 * Compute the next-review interval (in days) for a skill based on its current
 * score and streak of successful reviews. Uses an SM-2-inspired expansion:
 *
 * - score >= 0.8: interval *= 1.6 (expanding)
 * - score 0.6–0.79: interval stays the same
 * - score < 0.6: interval *= 0.5 (contracting, but never below MIN)
 *
 * The streak acts as the repetition count: higher streak → longer base interval.
 */
export function computeReviewIntervalDays(
  currentScore: number,
  streakDays: number,
): number {
  const repetition = Math.max(1, streakDays);
  let interval = BASE_INTERVAL_DAYS * repetition;

  if (currentScore >= EXPANSION_SCORE_THRESHOLD) {
    interval *= 1.6;
  } else if (currentScore < CONTRACTION_SCORE_THRESHOLD) {
    interval *= 0.5;
  }

  interval = Math.round(interval);
  return Math.min(MAX_INTERVAL_DAYS, Math.max(MIN_INTERVAL_DAYS, interval));
}

/**
 * Compute the next-review timestamp (epoch ms) for a skill, given its last
 * assessment date and the computed interval.
 */
export function computeNextReviewAt(
  lastAssessmentDate: Date | null | undefined,
  intervalDays: number,
): number {
  const base = lastAssessmentDate ? new Date(lastAssessmentDate).getTime() : Date.now();
  return base + intervalDays * 24 * 60 * 60 * 1000;
}

/**
 * Build a ReviewScheduleEntry for a single skill.
 */
export function buildScheduleEntry(skill: SkillProgress, now: number = Date.now()): ReviewScheduleEntry {
  const interval = computeReviewIntervalDays(skill.currentScore, skill.streakDays);
  const nextReviewAt = computeNextReviewAt(skill.lastAssessmentDate, interval);
  const daysUntilReview = Math.ceil((nextReviewAt - now) / (24 * 60 * 60 * 1000));

  return {
    skillCode: skill.skillCode,
    skillName: skill.skillName,
    domainCode: skill.domainCode,
    domainName: skill.domainName,
    currentScore: skill.currentScore,
    lastAssessmentDate: skill.lastAssessmentDate ?? null,
    nextReviewAt,
    daysUntilReview: Math.max(0, daysUntilReview),
    isOverdue: nextReviewAt <= now,
    reviewStreak: skill.streakDays,
  };
}

// ---------------------------------------------------------------------------
// Selection (pure, operates on ChildSkillSummary)
// ---------------------------------------------------------------------------

function flattenSkills(summary: ChildSkillSummary): SkillProgress[] {
  return summary.domains.flatMap((domain) => domain.skills);
}

/**
 * Build the full review schedule for a child. Returns entries sorted by
 * nextReviewAt ascending (most due first).
 */
export function buildReviewSchedule(
  summary: ChildSkillSummary,
  now: number = Date.now(),
): ReviewScheduleEntry[] {
  const entries = flattenSkills(summary)
    .filter((skill) => skill.assessmentsCount > 0 && skill.currentScore >= SPACED_REVIEW_MIN_SCORE)
    .map((skill) => buildScheduleEntry(skill, now));

  entries.sort((a, b) => a.nextReviewAt - b.nextReviewAt);
  return entries;
}

/**
 * Select the most-due spaced-review skills for a session warm-up.
 * Returns up to `limit` picks, ordered by most overdue first.
 * Skills in `excludeSkillCodes` (e.g. focus objectives) are skipped.
 *
 * Returns an empty array on cold start (no assessment history).
 */
export function selectSpacedReviewSkills(
  summary: ChildSkillSummary,
  limit: number,
  excludeSkillCodes: Iterable<string> = [],
  now: number = Date.now(),
): SpacedReviewPick[] {
  if (limit <= 0) {
    return [];
  }

  const exclude = new Set(excludeSkillCodes);
  const schedule = buildReviewSchedule(summary, now);

  return schedule
    .filter((entry) => !exclude.has(entry.skillCode))
    .slice(0, limit)
    .map((entry) => ({
      skillCode: entry.skillCode,
      skillName: entry.skillName,
      domainCode: entry.domainCode,
      domainName: entry.domainName,
      currentScore: entry.currentScore,
      kind: 'review' as const,
    }));
}

/**
 * Select a single spaced-review warm-up pick (the most overdue skill).
 * Returns null on cold start or when all skills are excluded.
 */
export function selectSpacedReviewWarmUp(
  summary: ChildSkillSummary,
  excludeSkillCodes: Iterable<string> = [],
  now: number = Date.now(),
): SpacedReviewPick | null {
  const picks = selectSpacedReviewSkills(summary, 1, excludeSkillCodes, now);
  return picks.length > 0 ? picks[0] : null;
}
