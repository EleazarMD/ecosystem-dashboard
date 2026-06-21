import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { Pool } from 'pg';

import { authOptions } from '../auth/[...nextauth]';
import { getPCGSafetyService } from '@/domains/learning/features/pcg-safety';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = session.user as any;

  try {
    const accountResult = await pool.query(
      `SELECT account_type FROM users WHERE id = $1`,
      [user.id]
    );

    if (accountResult.rows[0]?.account_type === 'child') {
      return res.status(403).json({ error: 'This endpoint is for parent accounts only' });
    }

    if (req.method === 'GET') {
      return handleGet(req, res, user.id);
    }

    if (req.method === 'POST') {
      return handlePost(req, res, user.id);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('[Family PCG Insights API] Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, parentId: string) {
  const action = (req.query.action as string) || 'summary';
  const childId = req.query.childId as string;

  if (!childId) {
    return res.status(400).json({ error: 'childId is required' });
  }

  if (action !== 'summary') {
    return res.status(400).json({ error: 'Unknown action' });
  }

  const pcgSafetyService = getPCGSafetyService(pool);

  try {
    const data = await pcgSafetyService.getParentInsightsSummary(parentId, childId, 'dashboard');
    return res.status(200).json({ data });
  } catch (error: any) {
    const message = error?.message || 'Failed to fetch insights';
    const status = message.toLowerCase().includes('access denied') ? 403 : 500;
    return res.status(status).json({ error: message });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, parentId: string) {
  const {
    action,
    childId,
    title,
    description,
    category,
    targetValue,
    targetUnit,
    targetDate,
  } = req.body || {};

  if (action !== 'suggest-goal') {
    return res.status(400).json({ error: 'Unknown action' });
  }

  if (!childId || !title || !category) {
    return res.status(400).json({ error: 'childId, title, and category are required' });
  }

  const pcgSafetyService = getPCGSafetyService(pool);

  try {
    const data = await pcgSafetyService.suggestGoal(parentId, childId, {
      title,
      description,
      category,
      targetValue: typeof targetValue === 'number' ? targetValue : undefined,
      targetUnit,
      targetDate: targetDate ? new Date(targetDate) : undefined,
    });

    return res.status(200).json({ data });
  } catch (error: any) {
    const message = error?.message || 'Failed to suggest goal';
    const status = message.toLowerCase().includes('access denied') ? 403 : 500;
    return res.status(status).json({ error: message });
  }
}
