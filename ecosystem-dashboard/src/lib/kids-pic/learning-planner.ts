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
  /** True when this objective comes from a parent assignment (mandated, graded). */
  isAssignment?: boolean;
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
export function selectLowestScoreObjectives(
  summary: ChildSkillSummary,
  limit: number,
  excludeSkillCodes: Iterable<string> = [],
): PlannerObjective[] {
  if (limit <= 0) {
    return [];
  }

  const exclude = new Set(excludeSkillCodes);
  const skills = flattenSkills(summary).filter((entry) => !exclude.has(entry.skill.skillCode));
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

function orderedObjectivesFromCodes(
  byCode: Map<string, FlatSkill>,
  codes: string[],
  isAssignment: boolean,
  seen: Set<string>,
  limit: number,
): PlannerObjective[] {
  const out: PlannerObjective[] = [];
  if (limit <= 0) {
    return out;
  }

  for (const raw of codes) {
    const code = `${raw ?? ''}`.trim();
    if (!code || seen.has(code)) {
      continue;
    }
    seen.add(code);
    const found = byCode.get(code);
    const objective = found ? toObjective(found, 'practice') : synthesizeObjective(code);
    out.push(isAssignment ? { ...objective, isAssignment: true } : objective);
    if (out.length >= limit) {
      break;
    }
  }

  return out;
}

export interface ComposePlanInput {
  summary: ChildSkillSummary | null;
  /** Parent-assigned skill codes (mandated). Lead the plan and are tagged. */
  assignmentSkillCodes?: string[];
  /** kids-pcg prerequisite-aware sequence; when empty, focus is score-based. */
  nextObjectiveSkillCodes?: string[];
  limit: number;
}

/**
 * Single composition entry point for "Today's Plan" (roadmap 9.1/9.2). Inclusion
 * priority is assignments > warm-up > focus; display order is warm-up, then
 * assignments, then focus. Focus follows kids-pcg's prerequisite-aware next-objectives
 * when supplied, otherwise the lowest-score skills. The spaced-review warm-up is
 * derived from Postgres history and never displaces a parent assignment. Skill codes
 * absent from the Postgres summary are kept as minimal objectives so freshly-unlocked
 * or assigned skills can still be planned.
 */
export function composePlan(input: ComposePlanInput): PlannerObjective[] {
  const { summary, limit } = input;
  if (limit <= 0) {
    return [];
  }

  const byCode = summary ? indexSkills(summary) : new Map<string, FlatSkill>();
  const seen = new Set<string>();

  // 1) Parent assignments lead and may fill the whole plan if numerous.
  const assignments = orderedObjectivesFromCodes(byCode, input.assignmentSkillCodes ?? [], true, seen, limit);

  // 2) Focus: prereq-aware next-objectives when supplied, else score-based lowest,
  //    always excluding anything already chosen as an assignment.
  const focusLimit = limit - assignments.length;
  let focus: PlannerObjective[] = [];
  if (focusLimit > 0) {
    const nextCodes = (input.nextObjectiveSkillCodes ?? [])
      .map((code) => `${code ?? ''}`.trim())
      .filter((code) => code.length > 0);

    if (nextCodes.length > 0) {
      focus = orderedObjectivesFromCodes(byCode, nextCodes, false, seen, focusLimit);
    } else if (summary) {
      focus = selectLowestScoreObjectives(summary, focusLimit, seen);
      for (const objective of focus) {
        seen.add(objective.skillCode);
      }
    }
  }

  // 3) Spaced-review warm-up opens the session; it outranks the last focus item but
  //    only fills a slot left over after assignments (never displaces an assignment).
  const warmUp = summary ? selectReviewWarmUp(summary, seen) : null;
  const remaining = limit - assignments.length;
  const includeWarmUp = !!warmUp && remaining > 0;
  const focusKept = focus.slice(0, Math.max(0, remaining - (includeWarmUp ? 1 : 0)));
  const lead = includeWarmUp && warmUp ? [warmUp] : [];

  return [...lead, ...assignments, ...focusKept].slice(0, limit);
}

/**
 * Compose a plan as a spaced-review warm-up followed by lowest-score focus objectives.
 * Thin wrapper over composePlan (score-based focus, no assignments).
 */
export function composePlannedObjectives(summary: ChildSkillSummary, limit: number): PlannerObjective[] {
  return composePlan({ summary, limit });
}

/**
 * Compose a plan whose focus objectives follow kids-pcg's prerequisite-aware
 * `next-objectives` sequence, with a spaced-review warm-up leading when available.
 * Thin wrapper over composePlan; falls back to score-based focus when no codes are supplied.
 */
export function composePlanWithNextObjectives(
  summary: ChildSkillSummary | null,
  nextObjectiveSkillCodes: string[],
  limit: number,
): PlannerObjective[] {
  return composePlan({ summary, nextObjectiveSkillCodes, limit });
}
