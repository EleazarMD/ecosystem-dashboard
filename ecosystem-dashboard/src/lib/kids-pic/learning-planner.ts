/**
 * Learning planner selection logic (pure, DB-free).
 *
 * A "Today's Plan" is composed (roadmap 9.1/9.2) as:
 *   Warm-up (review 1 spaced skill) -> focus objectives (skills to push on).
 *
 * The focus objectives are the lowest-scoring skills (where the child needs the
 * most help). The warm-up is a *spaced-review* pick: a skill the child has already
 * shown some competence on but hasn't practiced recently, so the session opens with
 * a confidence-building retention rep rather than the hardest item.
 *
 * These helpers are intentionally pure so they can be unit-tested without a DB; the
 * plan route feeds them a ChildSkillSummary read from Postgres.
 */
import type { ChildSkillSummary, SkillProgress } from './SkillProgressService';

export interface PlannerObjective {
  skillCode: string;
  skillName: string;
  domainCode: string;
  domainName: string;
  currentScore: number;
  proficiencyLevel: string;
  kind: 'review' | 'practice';
}

/** Minimum competence for a skill to be eligible as a spaced-review warm-up. */
export const REVIEW_MIN_SCORE = 0.5;

interface FlatSkill {
  domainCode: string;
  domainName: string;
  skill: SkillProgress;
}

function flattenSkills(summary: ChildSkillSummary): FlatSkill[] {
  return summary.domains.flatMap((domain) =>
    domain.skills.map((skill) => ({
      domainCode: domain.domain.code,
      domainName: domain.domain.name,
      skill,
    })),
  );
}

function assessmentTime(skill: SkillProgress): number {
  if (!skill.lastAssessmentDate) {
    return 0;
  }
  const time = new Date(skill.lastAssessmentDate).getTime();
  return Number.isFinite(time) ? time : 0;
}

function toObjective(entry: FlatSkill, kind: 'review' | 'practice'): PlannerObjective {
  return {
    skillCode: entry.skill.skillCode,
    skillName: entry.skill.skillName,
    domainCode: entry.domainCode,
    domainName: entry.domainName,
    currentScore: entry.skill.currentScore,
    proficiencyLevel: entry.skill.proficiencyLevel.name,
    kind,
  };
}

/**
 * Lowest-scoring skills first (most in need of practice), tie-broken by fewest
 * assessments, then least-recently assessed.
 */
export function selectLowestScoreObjectives(summary: ChildSkillSummary, limit: number): PlannerObjective[] {
  if (limit <= 0) {
    return [];
  }

  const skills = flattenSkills(summary);
  skills.sort((a, b) => {
    if (a.skill.currentScore !== b.skill.currentScore) {
      return a.skill.currentScore - b.skill.currentScore;
    }
    if (a.skill.assessmentsCount !== b.skill.assessmentsCount) {
      return a.skill.assessmentsCount - b.skill.assessmentsCount;
    }
    return assessmentTime(a.skill) - assessmentTime(b.skill);
  });

  return skills.slice(0, limit).map((entry) => toObjective(entry, 'practice'));
}

/**
 * Pick one spaced-review warm-up: a previously-practiced skill with at least
 * REVIEW_MIN_SCORE competence, ordered least-recently-assessed first (most "due"
 * for review), tie-broken toward the weaker score. Skills in `excludeSkillCodes`
 * (e.g. the focus objectives) are never returned. Returns null on cold start.
 */
export function selectReviewWarmUp(
  summary: ChildSkillSummary,
  excludeSkillCodes: Iterable<string> = [],
): PlannerObjective | null {
  const exclude = new Set(excludeSkillCodes);

  const candidates = flattenSkills(summary).filter((entry) => {
    const skill = entry.skill;
    return (
      !exclude.has(skill.skillCode) &&
      skill.assessmentsCount > 0 &&
      skill.currentScore >= REVIEW_MIN_SCORE
    );
  });

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => {
    const at = assessmentTime(a.skill);
    const bt = assessmentTime(b.skill);
    if (at !== bt) {
      return at - bt; // oldest assessment first => most due for spaced review
    }
    return a.skill.currentScore - b.skill.currentScore;
  });

  return toObjective(candidates[0], 'review');
}

/**
 * Compose the ordered objective list for a plan: a spaced-review warm-up (if one is
 * available) followed by the lowest-score focus objectives, de-duplicated and capped
 * to `limit` total activities. Returns focus-only on cold start (no warm-up yet).
 */
export function composePlannedObjectives(summary: ChildSkillSummary, limit: number): PlannerObjective[] {
  if (limit <= 0) {
    return [];
  }

  const focus = selectLowestScoreObjectives(summary, limit);
  const warmUp = selectReviewWarmUp(summary, focus.map((objective) => objective.skillCode));

  if (!warmUp) {
    return focus;
  }

  // Warm-up takes the first slot; trim focus so the total respects `limit`.
  return [warmUp, ...focus].slice(0, limit);
}
