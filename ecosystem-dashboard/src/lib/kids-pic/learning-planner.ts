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

function indexSkills(summary: ChildSkillSummary): Map<string, FlatSkill> {
  const map = new Map<string, FlatSkill>();
  for (const entry of flattenSkills(summary)) {
    if (!map.has(entry.skill.skillCode)) {
      map.set(entry.skill.skillCode, entry);
    }
  }
  return map;
}

/** A skill code known to kids-pcg but not (yet) present in the Postgres summary. */
function synthesizeObjective(skillCode: string): PlannerObjective {
  return {
    skillCode,
    skillName: skillCode,
    domainCode: '',
    domainName: '',
    currentScore: 0,
    proficiencyLevel: 'unknown',
    kind: 'practice',
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

/**
 * Compose a plan whose focus objectives follow kids-pcg's prerequisite-aware
 * `next-objectives` sequence (skills not yet mastered whose prerequisites ARE
 * mastered) rather than raw lowest-score ordering. A spaced-review warm-up (derived
 * from Postgres history) still leads when available. Skill codes not present in the
 * Postgres summary are kept as minimal objectives so freshly-unlocked skills can be
 * planned. Falls back to score-based composition when no usable codes are supplied.
 */
export function composePlanWithNextObjectives(
  summary: ChildSkillSummary | null,
  nextObjectiveSkillCodes: string[],
  limit: number,
): PlannerObjective[] {
  if (limit <= 0) {
    return [];
  }

  const byCode = summary ? indexSkills(summary) : new Map<string, FlatSkill>();
  const seen = new Set<string>();
  const focus: PlannerObjective[] = [];

  for (const raw of nextObjectiveSkillCodes) {
    const code = `${raw ?? ''}`.trim();
    if (!code || seen.has(code)) {
      continue;
    }
    seen.add(code);
    const found = byCode.get(code);
    focus.push(found ? toObjective(found, 'practice') : synthesizeObjective(code));
    if (focus.length >= limit) {
      break;
    }
  }

  if (focus.length === 0) {
    // No usable next-objectives -> defer to score-based composition.
    return summary ? composePlannedObjectives(summary, limit) : [];
  }

  const warmUp = summary
    ? selectReviewWarmUp(summary, focus.map((objective) => objective.skillCode))
    : null;

  if (!warmUp) {
    return focus.slice(0, limit);
  }

  return [warmUp, ...focus].slice(0, limit);
}
