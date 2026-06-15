import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';

import { authOptions } from '../auth/[...nextauth]';
import { getLearningPhase1Service } from '@/lib/kids-pic/LearningPhase1Service';
import { SkillProgressService } from '@/lib/kids-pic/SkillProgressService';
import { getLearningAccessState } from '@/lib/kids-pic/learning-access';
import {
  composePlannedObjectives,
  composePlanWithNextObjectives,
  type PlannerObjective,
} from '@/lib/kids-pic/learning-planner';
import dbPool from '@/lib/db/client';
import { readUserId } from './attempt';
import type { LearnAgeBand } from '@/lib/kids-pic/phase1-starter-content';
import type { ChildSkillSummary } from '@/lib/kids-pic/SkillProgressService';

const skillProgressService = new SkillProgressService(dbPool);

const KIDS_PCG_URL = process.env.KIDS_PCG_URL || 'http://127.0.0.1:8771';
const KIDS_PCG_READ_KEY = process.env.KIDS_PCG_READ_KEY || '';
// Prerequisite-aware planner endpoint on kids-pcg (returns skills not yet mastered
// whose prerequisites ARE mastered). Left blank by default so the integration stays
// OFF until an operator points it at the confirmed route (mirrors KIDS_PCG_EVIDENCE_PATH
// in attempt.ts); when unset, planning is score-based.
const KIDS_PCG_NEXT_OBJECTIVES_PATH = process.env.KIDS_PCG_NEXT_OBJECTIVES_PATH || '';

interface PlanActivity {
  type: 'practice';
  kind: 'review' | 'practice';
  skillCode: string;
  contentItemId: string;
  title: string;
  prompt: string;
  difficulty: number;
}

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
    const childId = asSingleQuery(req.query.childId).trim();
    if (!childId) {
      return res.status(400).json({ error: 'childId is required' });
    }

    // Block the plan entirely when the child is out of allowed hours / daily time so
    // they see a friendly "time's up" screen rather than activities they can't submit.
    const access = await getLearningAccessState(dbPool, readUserId(session));
    if (!access.allowed) {
      return res.status(403).json({
        error: 'Learning time limit reached',
        message: access.reason || 'Learning is currently unavailable.',
        usageLimitReached: true,
      });
    }

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

    const cappedObjectivesLimit = Math.min(objectivesLimit || 3, 5);
    const result = await buildPlan({
      childId,
      ownerId: ownerId || undefined,
      ageBand,
      objectivesLimit: cappedObjectivesLimit,
    });

    return res.status(200).json({
      childId,
      childName: result.childName,
      generatedAt: new Date().toISOString(),
      objectives: result.objectives,
      activities: result.activities,
      source: result.source,
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
  source: 'kids_pcg_next_objectives' | 'skill_progress_plus_catalog' | 'catalog_fallback';
}> {
  let summary: ChildSkillSummary | null = null;

  try {
    summary = await skillProgressService.getChildSkillSummary(input.childId);
  } catch (error) {
    console.warn('[api/learn/plan] getChildSkillSummary fallback:', error);
  }

  // Prefer kids-pcg's prerequisite-aware next-objectives (the authoritative adaptive
  // sequence) when configured; otherwise compose from Postgres scores. Either way a
  // spaced-review warm-up leads when the child has history (roadmap 9.1/9.2).
  const nextObjectiveCodes = await fetchKidsPcgNextObjectives({
    ownerId: input.ownerId || input.childId,
    ageBand: input.ageBand,
    limit: input.objectivesLimit,
  });
  const usedNextObjectives = nextObjectiveCodes.length > 0;
  const objectives = usedNextObjectives
    ? composePlanWithNextObjectives(summary, nextObjectiveCodes, input.objectivesLimit)
    : summary
      ? composePlannedObjectives(summary, input.objectivesLimit)
      : [];

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
      skillCode: objective.skillCode,
      contentItemId: item.id,
      title: objective.skillName,
      prompt: item.prompt,
      difficulty: item.difficulty,
    });
  }

  if (activities.length > 0) {
    return {
      childName: summary?.childName || null,
      objectives,
      activities,
      source: usedNextObjectives ? 'kids_pcg_next_objectives' : 'skill_progress_plus_catalog',
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
    })),
    source: 'catalog_fallback',
  };
}

function readOwnerIdHeader(req: NextApiRequest): string {
  const header = req.headers['x-pcg-owner-id'];
  return (Array.isArray(header) ? header[0] : header) || '';
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
