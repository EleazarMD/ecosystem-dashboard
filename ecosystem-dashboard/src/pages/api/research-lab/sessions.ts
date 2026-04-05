import type { NextApiRequest, NextApiResponse } from 'next';
import { getAllResearchSessions } from '@/lib/db/research-storage';

/**
 * GET /api/research-lab/sessions
 * Fetch all research sessions for display in left panel
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const sessions = await getAllResearchSessions(limit);
    
    return res.status(200).json({
      success: true,
      sessions,
      count: sessions.length,
    });
  } catch (error) {
    console.error('[Research Sessions API] Error fetching sessions:', error);
    return res.status(500).json({
      error: 'Failed to fetch research sessions',
      message: error instanceof Error ? error.message : 'Unknown error',
      sessions: [], // Return empty array on error so UI doesn't break
    });
  }
}
