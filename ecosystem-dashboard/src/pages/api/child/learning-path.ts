/**
 * Child Learning Path API
 *
 * Individualized learning path management for children.
 *
 * GET  /api/child/learning-path?action=list           — list child's paths
 * GET  /api/child/learning-path?action=get&pathId=... — get path with steps
 * GET  /api/child/learning-path?action=current        — get current active path
 * POST /api/child/learning-path?action=generate        — generate adaptive path
 * POST /api/child/learning-path?action=complete-step   — complete a path step
 * POST /api/child/learning-path?action=pause&pathId=... — pause a path
 * POST /api/child/learning-path?action=resume&pathId=... — resume a path
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import dbPool from '@/lib/db/client';
import { getLearningPathService } from '@/lib/learning/LearningPathService';

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

    case 'complete-step': {
      const { pathId, stepNumber, score, timeSpentSeconds } = req.body;
      if (!pathId || stepNumber === undefined) {
        return res.status(400).json({ error: 'pathId and stepNumber required' });
      }

      const path = await pathService.getPath(pathId);
      if (!path) return res.status(404).json({ error: 'Path not found' });
      if (path.childUserId !== userId) return res.status(403).json({ error: 'Not authorized' });

      const result = await pathService.completeStep(pathId, stepNumber, { score, timeSpentSeconds });
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
