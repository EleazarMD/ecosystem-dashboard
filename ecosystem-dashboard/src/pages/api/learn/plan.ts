import { randomUUID } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';

import { authOptions } from '../auth/[...nextauth]';
import { getLearningPhase1Service } from '@/domains/learning/features/attempt-grading';
import { SkillProgressService } from '@/domains/learning/entities/skill-graph';
import { getLearningAccessState } from '@/domains/learning/features/access-control';
import {
  composePlan,
  type PlannerObjective,
} from '@/domains/learning/features/plan-generation';
import type {
  LearnPlanActivity,
  LearnPlanSource,
  LearnPlanSpacedReview,
} from '@/domains/learning/shared/plan-types';
import { getSkillsNeedingReview, markMisconceptionAddressed } from '@/domains/learning/features/misconception-tracker';
import { buildReviewSchedule } from '@/domains/learning/processes/spaced-review';
import dbPool from '@/lib/db/client';
import { HARNESS_EVENT_TYPES } from '@/lib/harness/events/types';
import { emitHarnessEventSafe, runHarnessPipeline, toApiHarnessMetadata } from '@/lib/harness/runtime/pipeline';
import type { HarnessPipelineEventInput } from '@/lib/harness/runtime/pipeline';
import type { HarnessAgentRequest } from '@/lib/harness/types';
import { readUserId } from './attempt';
import type { LearnAgeBand } from '@/domains/learning/shared/phase1-content';
import type { ChildSkillSummary } from '@/domains/learning/entities/skill-graph';

const skillProgressService = new SkillProgressService(dbPool);

const KIDS_PCG_URL = process.env.KIDS_PCG_URL || 'http://127.0.0.1:8771';
const KIDS_PCG_READ_KEY = process.env.KIDS_PCG_READ_KEY || '';
// Prerequisite-aware planner endpoint on kids-pcg (returns skills not yet mastered
// whose prerequisites ARE mastered). Left blank by default so the integration stays
// OFF until an operator points it at the confirmed route (mirrors KIDS_PCG_EVIDENCE_PATH
// in attempt.ts); when unset, planning is score-based.
const KIDS_PCG_NEXT_OBJECTIVES_PATH = process.env.KIDS_PCG_NEXT_OBJECTIVES_PATH || '';
const LEARN_PLAN_MODEL = 'deterministic_plan_engine';
const LEARN_PLAN_CONTRACT = 'learn-plan-v1';
const LEARN_PLAN_SOURCE = 'deterministic_learn_plan';

type PlanActivity = LearnPlanActivity & {
  type: 'practice';
  kind: 'review' | 'practice';
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const startedAt = Date.now();
    const policyDecisions: string[] = ['auth:allow', 'method:get'];

    const childId = asSingleQuery(req.query.childId).trim();
    if (!childId) {
      return res.status(400).json({ error: 'childId is required' });
    }
    policyDecisions.push('payload:valid');

    const childUserId = readUserId(session);
    const harnessRequest: HarnessAgentRequest = {
      requestId: randomUUID(),
      domain: 'learning',
      agentId: 'learn_plan',
      agentRole: 'planner',
      userId: childUserId,
      goal: 'Generate adaptive learning plan objectives and activities',
      payload: {
        childId,
      },
      priority: 'normal',
      metadata: {
        route: '/api/learn/plan',
      },
    };

    // Block the plan entirely when the child is out of allowed hours / daily time so
    // they see a friendly "time's up" screen rather than activities they can't submit.
    const access = await getLearningAccessState(dbPool, childUserId);
    if (!access.allowed) {
      policyDecisions.push('learning_access:block');
      await emitHarnessEventSafe(
        {
          domain: harnessRequest.domain,
          type: HARNESS_EVENT_TYPES.POLICY_BLOCKED,
          userId: harnessRequest.userId,
          payload: {
            requestId: harnessRequest.requestId,
            reason: access.reason || 'Learning time limit reached',
            control: 'learning_access',
          },
        },
        '[api/learn/plan] harness event emission failed:',
      );

      return res.status(403).json({
        error: 'Learning time limit reached',
        message: access.reason || 'Learning is currently unavailable.',
        usageLimitReached: true,
      });
    }
    policyDecisions.push('learning_access:allow');

    const ageBandRaw = asSingleQuery(req.query.ageBand);
    if (ageBandRaw && !isAgeBand(ageBandRaw)) {
      return res.status(400).json({ error: 'ageBand must be one of: early, middle, tween' });
    }
    const ageBand: LearnAgeBand | undefined = isAgeBand(ageBandRaw) ? ageBandRaw : undefined;

    const objectivesLimitRaw = asSingleQuery(req.query.objectivesLimit);
    const objectivesLimit = objectivesLimitRaw ? Number.parseInt(objectivesLimitRaw, 10) : 3;
    if (objectivesLimitRaw && (!Number.isFinite(objectivesLimit) || objectivesLimit <= 0)) {
      return res.status(400).json({ error: 'objectivesLimit must be a positive integer' });
    }

    const ownerId = (asSingleQuery(req.query.ownerId) || readOwnerIdHeader(req)).trim();
    if (ageBand) {
      (harnessRequest.payload as Record<string, unknown>).ageBand = ageBand;
    }
    if (ownerId) {
      (harnessRequest.payload as Record<string, unknown>).ownerId = ownerId;
    }

    const cappedObjectivesLimit = Math.min(objectivesLimit || 3, 5);
    (harnessRequest.payload as Record<string, unknown>).objectivesLimit = cappedObjectivesLimit;
    const result = await buildPlan({
      childId,
      ownerId: ownerId || undefined,
      ageBand,
      objectivesLimit: cappedObjectivesLimit,
    });

    const harnessEvents: HarnessPipelineEventInput[] = [
      {
        domain: harnessRequest.domain,
        type: HARNESS_EVENT_TYPES.PLAN_GENERATED,
        userId: harnessRequest.userId,
        payload: {
          requestId: harnessRequest.requestId,
          childId,
          source: result.source,
          objectivesCount: result.objectives.length,
          activitiesCount: result.activities.length,
          assignmentsApplied: result.assignmentsApplied,
        },
      },
    ];

    const { response: harnessResponse } = await runHarnessPipeline({
      request: harnessRequest,
      startedAt,
      policyDecisions,
      safetyInputResult: 'pass',
      safetyOutputResult: 'pass',
      status: 'success',
      content: {
        source: result.source,
        objectivesCount: result.objectives.length,
        activitiesCount: result.activities.length,
      },
      source: LEARN_PLAN_SOURCE,
      model: LEARN_PLAN_MODEL,
      contract: LEARN_PLAN_CONTRACT,
      evaluation: {
        method: 'deterministic',
      },
      events: harnessEvents,
      eventWarnPrefix: '[api/learn/plan] harness event emission failed:',
    });

    return res.status(200).json({
      childId,
      childName: result.childName,
      generatedAt: new Date().toISOString(),
      objectives: result.objectives,
      activities: result.activities,
      source: result.source,
      assignmentsApplied: result.assignmentsApplied,
      spacedReview: result.spacedReview,
      harness: toApiHarnessMetadata(harnessResponse),
    });
  } catch (error) {
    console.error('[api/learn/plan] failed:', error);
    return res.status(500).json({ error: 'Failed to generate learning plan' });
  }
}

async function buildPlan(input: {
  childId: string;
  ownerId?: string;
  ageBand?: LearnAgeBand;
  objectivesLimit: number;
}): Promise<{
  childName: string | null;
  objectives: PlannerObjective[];
  activities: PlanActivity[];
  source: LearnPlanSource;
  assignmentsApplied: boolean;
  spacedReview?: LearnPlanSpacedReview;
}> {
  let summary: ChildSkillSummary | null = null;

  try {
    summary = await skillProgressService.getChildSkillSummary(input.childId);
  } catch (error) {
    console.warn('[api/learn/plan] getChildSkillSummary fallback:', error);
  }

  // Compose the plan (roadmap 9.1/9.2): parent assignments lead, then a spaced-review
  // warm-up, then focus objectives. Focus prefers kids-pcg's prerequisite-aware
  // next-objectives (the authoritative adaptive sequence) when configured, otherwise
  // Postgres scores. Both external reads are best-effort and run in parallel.
  const [nextObjectiveCodes, assignmentCodes] = await Promise.all([
    fetchKidsPcgNextObjectives({
      ownerId: input.ownerId || input.childId,
      ageBand: input.ageBand,
      limit: input.objectivesLimit,
    }),
    fetchAssignmentSkillCodes(input.childId, input.objectivesLimit),
  ]);
  const usedNextObjectives = nextObjectiveCodes.length > 0;

  // Phase 3: Re-surface unaddressed misconceptions as priority review objectives.
  const misconceptionSkills = getSkillsNeedingReview(input.childId);
  const misconceptionCodes = misconceptionSkills
    .slice(0, 2) // Cap at 2 misconception reviews per plan
    .map((m) => m.skillCode);

  // Mark them as addressed so they don't re-surface every single plan
  for (const skillCode of misconceptionCodes) {
    markMisconceptionAddressed(input.childId, skillCode);
  }

  const objectives = composePlan({
    summary,
    assignmentSkillCodes: assignmentCodes,
    nextObjectiveSkillCodes: [...misconceptionCodes, ...nextObjectiveCodes],
    limit: input.objectivesLimit,
  });

  const activities: PlanActivity[] = [];

  for (const objective of objectives) {
    const item = (
      await getLearningPhase1Service().listContent({
        skillCode: objective.skillCode,
        ageBand: input.ageBand,
        limit: 1,
      })
    )[0];

    if (!item) {
      continue;
    }

    activities.push({
      type: 'practice',
      kind: objective.kind,
      isAssignment: objective.isAssignment,
      skillCode: objective.skillCode,
      contentItemId: item.id,
      title: objective.skillName,
      prompt: item.prompt,
      difficulty: item.difficulty,
      analyticalTags: item.analyticalTags,
      hintSet: item.hintSet,
      contentType: item.type,
      rubricCriteria: item.rubricCriteria,
    });
  }

  if (activities.length > 0) {
    const spacedReview = summarizeSpacedReview(summary);
    return {
      childName: summary?.childName || null,
      objectives,
      activities,
      source: usedNextObjectives ? 'kids_pcg_next_objectives' : 'skill_progress_plus_catalog',
      assignmentsApplied: objectives.some((objective) => objective.isAssignment === true),
      spacedReview,
    };
  }

  const fallbackItems = await getLearningPhase1Service().listContent({
    ageBand: input.ageBand,
    limit: input.objectivesLimit,
  });

  return {
    childName: summary?.childName || null,
    objectives: fallbackItems.map((item) => ({
      skillCode: item.skillCode,
      skillName: item.skillCode,
      domainCode: item.subject,
      domainName: item.subject,
      currentScore: 0,
      proficiencyLevel: 'unknown',
      kind: 'practice',
    })),
    activities: fallbackItems.map((item) => ({
      type: 'practice',
      kind: 'practice',
      skillCode: item.skillCode,
      contentItemId: item.id,
      title: item.skillCode,
      prompt: item.prompt,
      difficulty: item.difficulty,
      analyticalTags: item.analyticalTags,
      hintSet: item.hintSet,
      contentType: item.type,
      rubricCriteria: item.rubricCriteria,
    })),
    source: 'catalog_fallback',
    assignmentsApplied: false,
  };
}

function summarizeSpacedReview(summary: ChildSkillSummary | null): LearnPlanSpacedReview | undefined {
  if (!summary) return undefined;
  try {
    const schedule = buildReviewSchedule(summary);
    if (schedule.length === 0) return undefined;
    const overdueCount = schedule.filter((e) => e.isOverdue).length;
    const next = schedule[0];
    return {
      eligibleCount: schedule.length,
      overdueCount,
      nextReview: {
        skillCode: next.skillCode,
        skillName: next.skillName,
        daysUntilReview: next.daysUntilReview,
        isOverdue: next.isOverdue,
      },
    };
  } catch {
    return undefined;
  }
}

function readOwnerIdHeader(req: NextApiRequest): string {
  const header = req.headers['x-pcg-owner-id'];
  return (Array.isArray(header) ? header[0] : header) || '';
}

// Best-effort: parent-assigned skill codes lead the plan. The `learning_assignments`
// table is a Phase 4 deliverable (roadmap §12.1: parent -> child, skill ref, status,
// due date). Until it exists this is a guarded no-op (returns []), so today's behavior
// is unchanged; it auto-activates once the table lands. The provisional column contract
// below mirrors the roadmap design; if Phase 4 names columns differently the query
// throws and we degrade to [] rather than breaking the plan.
async function fetchAssignmentSkillCodes(childId: string, limit: number): Promise<string[]> {
  try {
    const exists = await dbPool.query("SELECT to_regclass('public.learning_assignments') AS reg");
    if (!exists.rows?.[0]?.reg) {
      return [];
    }

    // Order strictly by the documented columns (roadmap §12.1) so this activates as
    // soon as the contracted table lands; due_date is the only documented ordering key.
    const result = await dbPool.query(
      `SELECT skill_code
         FROM public.learning_assignments
        WHERE child_id = $1
          AND COALESCE(status, 'assigned') NOT IN ('completed', 'archived', 'cancelled')
        ORDER BY due_date ASC NULLS LAST
        LIMIT $2`,
      [childId, Math.max(1, limit)],
    );

    const codes: string[] = [];
    for (const row of result.rows ?? []) {
      const code = `${(row as { skill_code?: unknown }).skill_code ?? ''}`.trim();
      if (code) {
        codes.push(code);
      }
    }
    return codes;
  } catch (error) {
    console.warn('[api/learn/plan] assignments lookup skipped (table absent or schema mismatch):', error);
    return [];
  }
}

// Best-effort: returns prerequisite-aware skill codes from kids-pcg, or [] when the
// integration is unconfigured or the call fails, so planning always degrades to the
// score-based path rather than erroring.
async function fetchKidsPcgNextObjectives(input: {
  ownerId: string;
  ageBand?: LearnAgeBand;
  limit: number;
}): Promise<string[]> {
  if (!KIDS_PCG_NEXT_OBJECTIVES_PATH || !KIDS_PCG_READ_KEY || !input.ownerId) {
    return [];
  }

  const params = new URLSearchParams({ limit: String(input.limit) });
  if (input.ageBand) {
    params.set('ageBand', input.ageBand);
  }
  const targetUrl = `${KIDS_PCG_URL}${KIDS_PCG_NEXT_OBJECTIVES_PATH}?${params.toString()}`;

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-PCG-Key': KIDS_PCG_READ_KEY,
        'X-PCG-Owner-Id': input.ownerId,
      },
    });

    if (!response.ok) {
      console.warn(
        `[api/learn/plan] kids-pcg next-objectives responded ${response.status}; using score-based plan`,
      );
      return [];
    }

    return parseNextObjectiveCodes(await response.json());
  } catch (error) {
    console.warn('[api/learn/plan] kids-pcg next-objectives fetch failed; using score-based plan:', error);
    return [];
  }
}

function parseNextObjectiveCodes(data: unknown): string[] {
  const list = Array.isArray(data)
    ? data
    : data && typeof data === 'object'
      ? (['objectives', 'next_objectives', 'nextObjectives', 'skills'] as const)
          .map((key) => (data as Record<string, unknown>)[key])
          .find((value): value is unknown[] => Array.isArray(value)) || []
      : [];

  const codes: string[] = [];
  for (const entry of list) {
    const code = extractSkillCode(entry);
    if (code) {
      codes.push(code);
    }
  }
  return codes;
}

function extractSkillCode(entry: unknown): string | null {
  if (typeof entry === 'string') {
    return entry.trim() || null;
  }
  if (entry && typeof entry === 'object') {
    const obj = entry as Record<string, unknown>;
    for (const key of ['skill_id', 'skillId', 'skillCode', 'skill_code', 'code', 'skill', 'id']) {
      const value = obj[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
  }
  return null;
}

export function asSingleQuery(value: string | string[] | undefined): string {
  if (!value) {
    return '';
  }

  return Array.isArray(value) ? value[0] || '' : value;
}

export function isAgeBand(value: string): value is LearnAgeBand {
  return value === 'early' || value === 'middle' || value === 'tween';
}
