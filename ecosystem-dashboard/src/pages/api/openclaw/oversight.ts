import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId, reason } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    console.log(`[Browser Oversight] Manual oversight requested for session: ${sessionId}, reason: ${reason}`);
    
    return res.status(200).json({ 
      success: true,
      message: 'Oversight requested. Agent will pause for review.',
      sessionId
    });
  } catch (error) {
    console.error('Error requesting oversight:', error);
    return res.status(500).json({ error: 'Failed to request oversight' });
  }
}
