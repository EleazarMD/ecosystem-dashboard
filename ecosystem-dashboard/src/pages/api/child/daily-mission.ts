/**
 * GET /api/child/daily-mission
 *
 * Composes and returns today's daily mission for a child.
 * The mission is a 3-phase session shell:
 *   1. Review Burst (spaced-review picks)
 *   2. Focus Step (today's plan ZPD objective)
 *   3. Reflection (metacognition prompt)
 *
 * Contract: docs/LEARNING_PATH_STUDIO_REVIEW_2026-06.md §3.C
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { SkillProgressService } from '@/domains/learning/entities/skill-graph';
import { getLearningPhase1Service } from '@/domains/learning/features/attempt-grading';
import { getLearningPathService } from '@/domains/learning/features/path-generation';
import { composePlan } from '@/domains/learning/features/plan-generation';
import { getParentGoalService } from '@/domains/learning/parent/parent-goal-service';
import { getSkillsNeedingReview, markMisconceptionAddressed } from '@/domains/learning/features/misconception-tracker';
import { buildReviewSchedule } from '@/domains/learning/processes/spaced-review';
import { composeDailyMission } from '@/domains/learning/processes/daily-mission';
import dbPool from '@/lib/db/client';
import { readUserId } from '../learn/attempt';
import type { LearnAgeBand } from '@/domains/learning/shared/phase1-content';
import type { ChildSkillSummary } from '@/domains/learning/entities/skill-graph';
import type { LearnPlanActivity } from '@/lib/kids-pic/learning-plan-types';

const skillProgressService = new SkillProgressService(dbPool);

const KIDS_PCG_URL = process.env.KIDS_PCG_URL || 'http://127.0.0.1:8771';
const KIDS_PCG_READ_KEY = process.env.KIDS_PCG_READ_KEY || '';
const KIDS_PCG_NEXT_OBJECTIVES_PATH = process.env.KIDS_PCG_NEXT_OBJECTIVES_PATH || '';

function asSingleQuery(value: string | string[] | undefined): string {
  if (!value) return '';
  return Array.isArray(value) ? value[0] : value;
}

function isAgeBand(v: string): v is LearnAgeBand {
  return v === 'early' || v === 'middle' || v === 'tween';
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

  const childId = asSingleQuery(req.query.childId).trim();
  if (!childId) {
    return res.status(400).json({ error: 'childId is required' });
  }

  const childUserId = readUserId(session);
  const ageBandRaw = asSingleQuery(req.query.ageBand);
  const ageBand: LearnAgeBand | undefined = isAgeBand(ageBandRaw) ? ageBandRaw : undefined;

  try {
    // 1. Fetch skill summary for spaced-review
    let summary: ChildSkillSummary | null = null;
    try {
      summary = await skillProgressService.getChildSkillSummary(childId);
    } catch (e) {
      console.warn('[daily-mission] getChildSkillSummary fallback:', e);
    }

    // 2. Fetch today's plan activities (reuse the plan composition logic)
    const activities = await fetchPlanActivities(childId, childUserId, ageBand);

    // 3. Compose the daily mission
    const mission = composeDailyMission({
      childId,
      summary,
      activities,
    });

    return res.status(200).json(mission);
  } catch (error) {
    console.error('[daily-mission] failed:', error);
    return res.status(500).json({ error: 'Failed to compose daily mission' });
  }
}

/**
 * Fetch plan activities by calling the same composition logic as /api/learn/plan.
 * This is a lightweight inline version to avoid an HTTP round-trip.
 */
async function fetchPlanActivities(
  childId: string,
  childUserId: string,
  ageBand: LearnAgeBand | undefined,
): Promise<LearnPlanActivity[]> {
  try {
    // Fetch active learning path activities
    const pathService = getLearningPathService(dbPool);
    const activePaths = await pathService.getActivePaths(childId);
    const pathActivities: LearnPlanActivity[] = [];

    for (const path of activePaths) {
      const currentStep = path.steps.find((s) => !s.isCompleted);
      if (!currentStep) continue;

      if (currentStep.contentItemId) {
        const item = await getLearningPhase1Service().getContentById(currentStep.contentItemId);
        if (item) {
          pathActivities.push({
            type: 'practice',
            kind: 'practice',
            skillCode: currentStep.skillCode || item.skillCode,
            contentItemId: item.id,
            title: currentStep.title || item.skillCode,
            prompt: item.prompt,
            difficulty: currentStep.targetDifficulty || item.difficulty,
            hintSet: currentStep.hints.length > 0 ? currentStep.hints : item.hintSet,
            contentType: item.type,
            rubricCriteria: item.rubricCriteria,
            pathId: path.id,
            pathStepNumber: currentStep.stepNumber,
            pathEmoji: path.pathEmoji,
          });
          continue;
        }
      }

      if (currentStep.skillCode) {
        const items = await getLearningPhase1Service().listContent({
          skillCode: currentStep.skillCode,
          ageBand,
          limit: 1,
        });
        if (items.length > 0) {
          const item = items[0];
          pathActivities.push({
            type: 'practice',
            kind: 'practice',
            skillCode: currentStep.skillCode,
            contentItemId: item.id,
            title: currentStep.title || currentStep.skillCode,
            prompt: currentStep.customPrompt || item.prompt,
            difficulty: currentStep.targetDifficulty || item.difficulty,
            hintSet: currentStep.hints.length > 0 ? currentStep.hints : item.hintSet,
            contentType: (currentStep.customContentType as LearnPlanActivity['contentType']) || item.type,
            rubricCriteria: item.rubricCriteria,
            pathId: path.id,
            pathStepNumber: currentStep.stepNumber,
            pathEmoji: path.pathEmoji,
          });
          continue;
        }
      }

      if (currentStep.customPrompt) {
        pathActivities.push({
          type: 'practice',
          kind: 'practice',
          skillCode: currentStep.skillCode || 'path.custom',
          contentItemId: `path-step:${currentStep.id}`,
          title: currentStep.title,
          prompt: currentStep.customPrompt,
          difficulty: currentStep.targetDifficulty || 1,
          hintSet: currentStep.hints,
          contentType: (currentStep.customContentType as LearnPlanActivity['contentType']) || 'problem',
          pathId: path.id,
          pathStepNumber: currentStep.stepNumber,
          pathEmoji: path.pathEmoji,
        });
      }
    }

    if (pathActivities.length > 0) {
      return pathActivities.slice(0, 5);
    }

    // No path activities — compose from skill summary + catalog
    let summary: ChildSkillSummary | null = null;
    try {
      summary = await skillProgressService.getChildSkillSummary(childId);
    } catch {}

    const [nextObjectiveCodes, assignmentCodes] = await Promise.all([
      fetchKidsPcgNextObjectives(childId, ageBand, 5),
      fetchAssignmentSkillCodes(childId, 5),
    ]);

    const misconceptionSkills = getSkillsNeedingReview(childId);
    const misconceptionCodes = misconceptionSkills.slice(0, 2).map((m) => m.skillCode);
    for (const skillCode of misconceptionCodes) {
      markMisconceptionAddressed(childId, skillCode);
    }

    const parentGoalCodes = getParentGoalService().getActiveGoalSkillCodes(childId);

    const objectives = composePlan({
      summary,
      assignmentSkillCodes: [...assignmentCodes, ...parentGoalCodes],
      nextObjectiveSkillCodes: [...misconceptionCodes, ...nextObjectiveCodes],
      limit: 5,
    });

    const activities: LearnPlanActivity[] = [];
    for (const objective of objectives) {
      const item = (
        await getLearningPhase1Service().listContent({
          skillCode: objective.skillCode,
          ageBand,
          limit: 1,
        })
      )[0];
      if (!item) continue;

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
      return activities;
    }

    // Final fallback: catalog items
    const fallbackItems = await getLearningPhase1Service().listContent({
      ageBand,
      limit: 3,
    });
    return fallbackItems.map((item) => ({
      type: 'practice',
      kind: 'practice' as const,
      skillCode: item.skillCode,
      contentItemId: item.id,
      title: item.skillCode,
      prompt: item.prompt,
      difficulty: item.difficulty,
      analyticalTags: item.analyticalTags,
      hintSet: item.hintSet,
      contentType: item.type,
      rubricCriteria: item.rubricCriteria,
    }));
  } catch (error) {
    console.warn('[daily-mission] fetchPlanActivities failed:', error);
    return [];
  }
}

async function fetchKidsPcgNextObjectives(
  childId: string,
  ageBand: LearnAgeBand | undefined,
  limit: number,
): Promise<string[]> {
  if (!KIDS_PCG_NEXT_OBJECTIVES_PATH) return [];
  try {
    const url = new URL(`${KIDS_PCG_URL}${KIDS_PCG_NEXT_OBJECTIVES_PATH}`);
    url.searchParams.set('childId', childId);
    if (ageBand) url.searchParams.set('ageBand', ageBand);
    url.searchParams.set('limit', String(limit));
    const res = await fetch(url.toString(), {
      headers: KIDS_PCG_READ_KEY ? { Authorization: `Bearer ${KIDS_PCG_READ_KEY}` } : {},
    });
    if (!res.ok) return [];
    const data = await res.json();
    const codes = Array.isArray(data.objectives) ? data.objectives : Array.isArray(data.skills) ? data.skills : [];
    return codes.map((c: any) => `${c?.skillCode ?? c ?? ''}`.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

async function fetchAssignmentSkillCodes(childId: string, limit: number): Promise<string[]> {
  try {
    const res = await dbPool.query(
      `SELECT skill_code FROM child_assignments
       WHERE child_user_id = $1 AND status = 'active'
       ORDER BY created_at DESC LIMIT $2`,
      [childId, limit],
    );
    return res.rows.map((r) => r.skill_code).filter(Boolean);
  } catch {
    return [];
  }
}
