/**
 * Activity Feed API
 * GET /api/activities/feed
 * 
 * Returns activity feed for a child (parent access only)
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getActivityFeed } from '@/lib/parental-controls/activityLogger';
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
    const { childId, limit, offset, activityType, flaggedOnly, startDate, endDate } = req.query;

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

    // Get activity feed
    const activities = await getActivityFeed(childId as string, {
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
      activityType: activityType as any,
      flaggedOnly: flaggedOnly === 'true',
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });

    return res.status(200).json({
      success: true,
      activities,
      count: activities.length,
    });
  } catch (error) {
    console.error('[API] Error fetching activity feed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
