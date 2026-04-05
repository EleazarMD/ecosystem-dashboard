/**
 * Log Activity API
 * POST /api/activities/log
 * 
 * Logs a child activity (called automatically by client)
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { logActivity, ActivityType } from '@/lib/parental-controls/activityLogger';

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

    // Only log activities for child accounts
    if (user.accountType !== 'child') {
      return res.status(200).json({ 
        success: true, 
        message: 'Activity logging not required for non-child accounts' 
      });
    }

    const { activityType, activityData } = req.body;

    if (!activityType || !activityData) {
      return res.status(400).json({ error: 'Activity type and data required' });
    }

    // Get IP and user agent for logging
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                      req.socket.remoteAddress || 
                      undefined;
    const userAgent = req.headers['user-agent'] || undefined;

    await logActivity(
      user.id,
      activityType as ActivityType,
      activityData,
      {
        ipAddress,
        userAgent,
      }
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[API] Error logging activity:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
