/**
 * Child Learning Path API
 *
 * Individualized learning path management for children.
 *
 * GET  /api/child/learning-path?action=list           — list child's paths
 * GET  /api/child/learning-path?action=get&pathId=... — get path with steps
 * GET  /api/child/learning-path?action=current        — get current active path
 * GET  /api/child/learning-path?action=templates&age=... — list preset templates for age
 * POST /api/child/learning-path?action=generate        — generate adaptive path
 * POST /api/child/learning-path?action=create-from-template — create path from preset template
 * POST /api/child/learning-path?action=complete-step   — complete a path step
 * POST /api/child/learning-path?action=pause&pathId=... — pause a path
 * POST /api/child/learning-path?action=resume&pathId=... — resume a path
 */

import { randomUUID } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import dbPool from '@/lib/db/client';
import { getLearningPathService } from '@/domains/learning/features/path-generation';
import {
  getPresetTemplatesForAge,
  getPresetTemplateById,
  generatePresetPath,
  PRESET_PATH_TEMPLATES,
} from '@/domains/learning/shared/path-templates';
import { SkillProgressService } from '@/domains/learning/entities/skill-graph';
import { getLearnerProfileService } from '@/domains/learning/learner/learner-profile';
import { getMasteryCalculator } from '@/domains/learning/learner/mastery-calculator';
import { getEventBus } from '@/domains/learning/shared/event-bus';
import { logChildActivity } from '@/lib/platform/content-filter-service';

const skillProgressService = new SkillProgressService(dbPool);

function readUserId(session: { user?: unknown } | null): string {
  const user = session?.user as { id?: unknown } | undefined;
  return typeof user?.id === 'string' ? user.id : '';
}

function asSingleQuery(value: string | string[] | undefined): string {
  if (!value) return '';
  return Array.isArray(value) ? value[0] : value;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = readUserId(session);
  const pathService = getLearningPathService(dbPool);
  const action = asSingleQuery(req.query.action);

  try {
    switch (req.method) {
      case 'GET':
        return handleGet(req, res, userId, action, pathService);
      case 'POST':
        return handlePost(req, res, userId, action, pathService);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('[Child Learning Path API] Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  action: string,
  pathService: ReturnType<typeof getLearningPathService>
) {
  switch (action) {
    case 'list': {
      const paths = await pathService.getAllPaths(userId);
      return res.status(200).json({ paths });
    }

    case 'active': {
      const paths = await pathService.getActivePaths(userId);
      return res.status(200).json({ paths });
    }

    case 'get': {
      const pathId = asSingleQuery(req.query.pathId);
      if (!pathId) return res.status(400).json({ error: 'pathId required' });

      const path = await pathService.getPath(pathId);
      if (!path) return res.status(404).json({ error: 'Path not found' });
      if (path.childUserId !== userId) return res.status(403).json({ error: 'Not authorized' });

      return res.status(200).json({ path });
    }

    case 'current': {
      const paths = await pathService.getActivePaths(userId);
      if (paths.length === 0) return res.status(200).json({ path: null });
      return res.status(200).json({ path: paths[0] });
    }

    case 'templates': {
      const ageStr = asSingleQuery(req.query.age);
      const age = ageStr ? parseInt(ageStr, 10) : undefined;
      const templates = age
        ? getPresetTemplatesForAge(age)
        : PRESET_PATH_TEMPLATES;
      return res.status(200).json({ templates });
    }

    default:
      return res.status(400).json({ error: 'Unknown action' });
  }
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  action: string,
  pathService: ReturnType<typeof getLearningPathService>
) {
  switch (action) {
    case 'generate': {
      const { focusDomain, teamId } = req.body;
      const path = await pathService.generateAdaptivePath(userId, { focusDomain, teamId });
      return res.status(201).json({ path });
    }

    case 'create-from-template': {
      const { templateId, childName } = req.body;
      if (!templateId) {
        return res.status(400).json({ error: 'templateId required' });
      }
      const rec = generatePresetPath(templateId, childName);
      if (!rec) {
        return res.status(404).json({ error: 'Template not found' });
      }
      const path = await pathService.createPath(userId, {
        title: rec.title,
        description: rec.description,
        pathEmoji: rec.pathEmoji,
        source: rec.source as any,
        focusDomains: rec.focusDomains,
        steps: rec.steps,
      });
      return res.status(201).json({ path });
    }

    case 'complete-step': {
      const { pathId, stepNumber, score, timeSpentSeconds } = req.body;
      if (!pathId || stepNumber === undefined) {
        return res.status(400).json({ error: 'pathId and stepNumber required' });
      }

      const path = await pathService.getPath(pathId);
      if (!path) return res.status(404).json({ error: 'Path not found' });
      if (path.childUserId !== userId) return res.status(403).json({ error: 'Not authorized' });

      const result = await pathService.completeStep(pathId, stepNumber, { score, timeSpentSeconds });

      // ─── Mastery write-back: write evidence to all four layers so path
      // step completion advances the learner model (ZPD frontier) the same
      // way /api/learn/attempt does. Best-effort — never blocks the response.
      if (result.completedSkillCode) {
        const finalScore = score ?? 1;
        const isCorrect = score === undefined || score >= 0.7;
        const ownerIdHeader = asSingleQuery(req.headers['x-pcg-owner-id'] as string | string[] | undefined);
        const syntheticAttemptId = `path-${randomUUID()}`;

        // 1. Postgres skill progress snapshot (analytics layer)
        try {
          await skillProgressService.recordSkillAssessment({
            childId: userId,
            skillCode: result.completedSkillCode,
            sourceType: 'learning_path_step',
            sourceId: syntheticAttemptId,
            score: finalScore,
            evidenceType: 'accuracy',
            evidenceData: {
              pathId,
              stepNumber,
              correct: isCorrect,
              source: 'child_learning_path',
            },
          });
        } catch (err) {
          console.warn('[api/child/learning-path] postgres mastery snapshot skipped:', err);
        }

        // 2. kids-pcg authoritative mastery store
        try {
          await emitMasteryEvidence({
            childUserId: userId,
            skillCode: result.completedSkillCode,
            score: finalScore,
            correct: isCorrect,
            ownerIdHeader,
          });
        } catch (err) {
          console.warn('[api/child/learning-path] kids-pcg mastery write-back failed:', err);
        }

        // 3. In-process LearnerProfileService (EMA-based MasteryCalculator)
        try {
          const oldMastery = getMasteryCalculator().get(userId, result.completedSkillCode);
          getLearnerProfileService().recordAttempt(
            userId,
            result.completedSkillCode,
            isCorrect,
            1, // attemptNumber — path steps are single-attempt completions
          );
          const newMastery = getMasteryCalculator().get(userId, result.completedSkillCode);

          // 4. Emit Event Bus events
          const bus = getEventBus();
          bus.emit('attempt.graded', {
            childId: userId,
            contentItemId: `path-step:${pathId}:${stepNumber}`,
            skillCode: result.completedSkillCode,
            correct: isCorrect,
            attemptNumber: 1,
            timestamp: Date.now(),
          });
          bus.emit('mastery.changed', {
            childId: userId,
            skillCode: result.completedSkillCode,
            oldMastery,
            newMastery,
            timestamp: Date.now(),
          });
        } catch (err) {
          console.warn('[api/child/learning-path] learner profile / event bus update skipped:', err);
        }

        // 5. Log child activity for audit trail
        try {
          await logChildActivity(userId, 'learning_path_step_completed', {
            metadata: {
              pathId,
              stepNumber,
              skillCode: result.completedSkillCode,
              score: finalScore,
              correct: isCorrect,
              pathCompleted: result.pathCompleted,
            },
          });
        } catch {
          // best-effort logging
        }
      }

      return res.status(200).json(result);
    }

    case 'pause': {
      const pathId = asSingleQuery(req.query.pathId);
      if (!pathId) return res.status(400).json({ error: 'pathId required' });

      const path = await pathService.getPath(pathId);
      if (!path) return res.status(404).json({ error: 'Path not found' });
      if (path.childUserId !== userId) return res.status(403).json({ error: 'Not authorized' });

      await pathService.updatePathStatus(pathId, 'paused');
      return res.status(200).json({ success: true });
    }

    case 'resume': {
      const pathId = asSingleQuery(req.query.pathId);
      if (!pathId) return res.status(400).json({ error: 'pathId required' });

      const path = await pathService.getPath(pathId);
      if (!path) return res.status(404).json({ error: 'Path not found' });
      if (path.childUserId !== userId) return res.status(403).json({ error: 'Not authorized' });

      await pathService.updatePathStatus(pathId, 'active');
      return res.status(200).json({ success: true });
    }

    default:
      return res.status(400).json({ error: 'Unknown action' });
  }
}

// ─── Mastery write-back helper ──────────────────────────────────────────────
// Posts evidence to kids-pcg so path step completion advances the learner model.
// Mirrors the pattern in api/learn/attempt.ts writeKidsPcgMasteryEvidence.

const KIDS_PCG_URL = process.env.KIDS_PCG_URL || 'http://127.0.0.1:8771';
const KIDS_PCG_ADMIN_KEY = process.env.KIDS_PCG_ADMIN_KEY || '';
const KIDS_PCG_DEFAULT_OWNER_ID = process.env.KIDS_PCG_DEFAULT_OWNER_ID || '';
const KIDS_PCG_EVIDENCE_PATH = process.env.KIDS_PCG_EVIDENCE_PATH || '/api/learner/mastery/evidence';

async function emitMasteryEvidence(input: {
  childUserId: string;
  skillCode: string;
  score: number;
  correct: boolean;
  ownerIdHeader?: string;
}): Promise<void> {
  const ownerId = (input.ownerIdHeader || KIDS_PCG_DEFAULT_OWNER_ID || input.childUserId).trim();
  if (!ownerId || !KIDS_PCG_ADMIN_KEY) return;

  const targetUrl = `${KIDS_PCG_URL}${KIDS_PCG_EVIDENCE_PATH}`;
  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-PCG-Key': KIDS_PCG_ADMIN_KEY,
      'X-PCG-Owner-Id': ownerId,
    },
    body: JSON.stringify({
      skill_id: input.skillCode,
      correct: input.correct,
      source: 'learning_path_step',
      detail: JSON.stringify({
        score: input.score,
        source: 'child_learning_path',
      }),
    }),
  });

  if (!response.ok) {
    console.warn(
      `[api/child/learning-path] kids-pcg evidence write returned ${response.status}: ${await response.text()}`,
    );
  }
}
