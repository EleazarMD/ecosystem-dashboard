/**
 * Family Skill Progress API
 *
 * GET /api/family/skill-progress?action=summary&childId=...
 * GET /api/family/skill-progress?action=teks&childId=...&grade=...
 *
 * Returns child skill progress and optional TEKS curriculum alignment.
 * Parent-facing: requires parent-child relationship verification.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';

import { authOptions } from '../auth/[...nextauth]';
import dbPool from '@/lib/db/client';
import { SkillProgressService } from '@/domains/learning/entities/skill-graph';

const skillProgressService = new SkillProgressService(dbPool);

function readUserId(session: { user?: unknown } | null): string {
  const user = session?.user as { id?: unknown } | undefined;
  return typeof user?.id === 'string' ? user.id : '';
}

function asSingleQuery(value: string | string[] | undefined): string {
  if (!value) return '';
  return Array.isArray(value) ? value[0] : value;
}

async function verifyParentChild(parentUserId: string, childId: string): Promise<boolean> {
  try {
    const result = await dbPool.query(
      'SELECT 1 FROM users WHERE id = $1 AND parent_user_id = $2',
      [childId, parentUserId]
    );
    return result.rows.length > 0;
  } catch {
    return false;
  }
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

  const parentUserId = readUserId(session);
  const childId = asSingleQuery(req.query.childId).trim();
  if (!childId) {
    return res.status(400).json({ error: 'childId is required' });
  }

  const verified = await verifyParentChild(parentUserId, childId);
  if (!verified) {
    return res.status(403).json({ error: 'Not authorized for this child' });
  }

  const action = asSingleQuery(req.query.action) || 'summary';

  try {
    if (action === 'summary') {
      const summary = await skillProgressService.getChildSkillSummary(childId);
      if (!summary) {
        return res.status(404).json({ error: 'No skill data found' });
      }
      return res.status(200).json({ data: summary });
    }

    if (action === 'teks') {
      const grade = asSingleQuery(req.query.grade) || undefined;
      const progress = await skillProgressService.getChildTEKSProgress(childId, grade);
      return res.status(200).json({ data: progress });
    }

    return res.status(400).json({ error: 'Unknown action. Use ?action=summary or ?action=teks' });
  } catch (error) {
    console.error('[api/family/skill-progress] error:', error);
    return res.status(500).json({ error: 'Failed to fetch skill progress' });
  }
}
