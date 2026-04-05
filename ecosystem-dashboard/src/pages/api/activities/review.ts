/**
 * Mark Activity as Reviewed
 * POST /api/activities/review
 * 
 * Marks a flagged activity as reviewed by parent
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { markAsReviewed } from '@/lib/parental-controls/activityLogger';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = session.user as any;
    const { activityId } = req.body;

    if (!activityId) {
      return res.status(400).json({ error: 'Activity ID required' });
    }

    // Verify parent has access to this activity
    const activityCheck = await query(
      `SELECT ca.child_id, u.parent_user_id
       FROM child_activities ca
       JOIN users u ON ca.child_id = u.id
       WHERE ca.id = $1`,
      [activityId]
    );

    if (activityCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    if (activityCheck.rows[0].parent_user_id !== user.id && user.platformRole !== 'platform-admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await markAsReviewed(activityId);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[API] Error marking activity as reviewed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
