/**
 * Activity Summary API
 * GET /api/activities/summary
 * 
 * Returns activity summary statistics for a child
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getActivitySummary, getFlaggedCount } from '@/lib/parental-controls/activityLogger';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = session.user as any;
    const { childId, startDate, endDate } = req.query;

    if (!childId) {
      return res.status(400).json({ error: 'Child ID required' });
    }

    // Verify parent has access to this child
    const childCheck = await query(
      `SELECT parent_user_id FROM users WHERE id = $1`,
      [childId]
    );

    if (childCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Child not found' });
    }

    if (childCheck.rows[0].parent_user_id !== user.id && user.platformRole !== 'platform-admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Default to today if no dates provided
    const start = startDate ? new Date(startDate as string) : new Date(new Date().setHours(0, 0, 0, 0));
    const end = endDate ? new Date(endDate as string) : new Date(new Date().setHours(23, 59, 59, 999));

    const summary = await getActivitySummary(childId as string, start, end);
    const flaggedCount = await getFlaggedCount(childId as string);

    return res.status(200).json({
      success: true,
      summary: {
        ...summary,
        unreviewedFlagged: flaggedCount,
      },
    });
  } catch (error) {
    console.error('[API] Error fetching activity summary:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
