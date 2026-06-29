/**
 * Learning Config API — Phase 7 parent control plane.
 *
 * GET  /api/child/learning-config?childId=...  → fetch config
 * POST /api/child/learning-config               → save config
 *
 * Stores learning-specific settings (difficulty bias, domain focus,
 * session target, companion tone) that the planner and AI tutor read
 * to adapt the learning experience.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

interface LearningConfig {
  dailySessionTarget: number;
  difficultyBias: 'gentle' | 'balanced' | 'stretch';
  domainFocus: string[];
  companionTone: 'encouraging' | 'challenge' | 'curious';
  enableSpacedReview: boolean;
  enableAdaptivePath: boolean;
}

const DEFAULT_CONFIG: LearningConfig = {
  dailySessionTarget: 2,
  difficultyBias: 'balanced',
  domainFocus: ['math', 'reading'],
  companionTone: 'encouraging',
  enableSpacedReview: true,
  enableAdaptivePath: true,
};

// In-process store (matching the modular architecture pattern).
// Will be migrated to Postgres when the child profile schema is extended.
const configStore = new Map<string, LearningConfig>();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const parentId = session.user.id;

  if (req.method === 'GET') {
    const childId = (req.query.childId as string || '').trim();
    if (!childId) {
      return res.status(400).json({ error: 'childId is required' });
    }

    const config = configStore.get(`${parentId}:${childId}`) || DEFAULT_CONFIG;
    return res.status(200).json({ config });
  }

  if (req.method === 'POST') {
    const { childId, config: incoming } = req.body;

    if (!childId || !incoming) {
      return res.status(400).json({ error: 'childId and config are required' });
    }

    // Merge with defaults to ensure all fields present
    const config: LearningConfig = {
      ...DEFAULT_CONFIG,
      ...incoming,
      dailySessionTarget: Math.min(5, Math.max(1, Number(incoming.dailySessionTarget) || 2)),
      difficultyBias: ['gentle', 'balanced', 'stretch'].includes(incoming.difficultyBias)
        ? incoming.difficultyBias : 'balanced',
      companionTone: ['encouraging', 'challenge', 'curious'].includes(incoming.companionTone)
        ? incoming.companionTone : 'encouraging',
      domainFocus: Array.isArray(incoming.domainFocus) ? incoming.domainFocus : ['math', 'reading'],
      enableSpacedReview: Boolean(incoming.enableSpacedReview),
      enableAdaptivePath: Boolean(incoming.enableAdaptivePath),
    };

    configStore.set(`${parentId}:${childId}`, config);

    return res.status(200).json({ config });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}
