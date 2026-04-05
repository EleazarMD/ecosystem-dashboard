/**
 * Check Time Limit
 * GET /api/usage/check
 * 
 * Checks if child has exceeded daily time limit
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { checkTimeLimit, getTodayUsage } from '@/lib/parental-controls/usageTracker';

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

    // Non-child accounts have no limits
    if (user.accountType !== 'child') {
      return res.status(200).json({
        allowed: true,
        usage: {
          todayMinutes: 0,
          limitMinutes: 0,
          remainingMinutes: 999999,
          isOverLimit: false,
        },
      });
    }

    const limitCheck = await checkTimeLimit(user.id);
    const usage = await getTodayUsage(user.id);

    return res.status(200).json({
      ...limitCheck,
      usage,
    });
  } catch (error) {
    console.error('[API] Error checking time limit:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
