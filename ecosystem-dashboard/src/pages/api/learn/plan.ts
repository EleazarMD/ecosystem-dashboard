import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';

import { authOptions } from '../auth/[...nextauth]';
import { getLearningPhase1Service } from '@/lib/kids-pic/LearningPhase1Service';
import { SkillProgressService } from '@/lib/kids-pic/SkillProgressService';
import { getLearningAccessState } from '@/lib/kids-pic/learning-access';
import { composePlannedObjectives, type PlannerObjective } from '@/lib/kids-pic/learning-planner';
import dbPool from '@/lib/db/client';
import { readUserId } from './attempt';
import type { LearnAgeBand } from '@/lib/kids-pic/phase1-starter-content';
import type { ChildSkillSummary } from '@/lib/kids-pic/SkillProgressService';

const skillProgressService = new SkillProgressService(dbPool);

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

    const cappedObjectivesLimit = Math.min(objectivesLimit || 3, 5);
    const result = await buildPlan({
      childId,
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
  ageBand?: LearnAgeBand;
  objectivesLimit: number;
}): Promise<{
  childName: string | null;
  objectives: PlannerObjective[];
  activities: PlanActivity[];
  source: 'skill_progress_plus_catalog' | 'catalog_fallback';
}> {
  let summary: ChildSkillSummary | null = null;

  try {
    summary = await skillProgressService.getChildSkillSummary(input.childId);
  } catch (error) {
    console.warn('[api/learn/plan] getChildSkillSummary fallback:', error);
  }

  // Compose a spaced-review warm-up (when the child has history) ahead of the
  // lowest-score focus objectives (roadmap 9.1/9.2).
  const objectives = summary
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
      source: 'skill_progress_plus_catalog',
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

export function asSingleQuery(value: string | string[] | undefined): string {
  if (!value) {
    return '';
  }

  return Array.isArray(value) ? value[0] || '' : value;
}

export function isAgeBand(value: string): value is LearnAgeBand {
  return value === 'early' || value === 'middle' || value === 'tween';
}
