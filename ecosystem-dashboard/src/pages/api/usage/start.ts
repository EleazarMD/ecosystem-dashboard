/**
 * Start Usage Session
 * POST /api/usage/start
 * 
 * Starts tracking a child's usage session
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { startSession } from '@/lib/parental-controls/usageTracker';

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

    // Only track sessions for child accounts
    if (user.accountType !== 'child') {
      return res.status(200).json({ 
        success: true, 
        message: 'Session tracking not required for non-child accounts' 
      });
    }

    const { service = 'dashboard' } = req.body;

    const sessionId = await startSession(user.id, service);

    return res.status(200).json({
      success: true,
      sessionId,
    });
  } catch (error) {
    console.error('[API] Error starting session:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
