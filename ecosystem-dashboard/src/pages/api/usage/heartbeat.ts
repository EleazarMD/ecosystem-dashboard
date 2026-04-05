/**
 * Update Session Heartbeat
 * POST /api/usage/heartbeat
 * 
 * Updates session heartbeat to keep it alive
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { updateHeartbeat } from '@/lib/parental-controls/usageTracker';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    await updateHeartbeat(sessionId);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[API] Error updating heartbeat:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
