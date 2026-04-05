import type { NextApiRequest, NextApiResponse } from 'next';
import { getProjectSessions, initializeResearchDatabase } from '@/lib/db/research-storage';

/**
 * GET /api/research-lab/projects/[id]/sessions
 * Fetch all research sessions for a specific project
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id: projectId } = req.query;

  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  try {
    await initializeResearchDatabase();
    const sessions = await getProjectSessions(projectId);
    
    return res.status(200).json({
      success: true,
      sessions,
      count: sessions.length,
    });
  } catch (error) {
    console.error('[Project Sessions API] Error fetching sessions:', error);
    return res.status(500).json({
      error: 'Failed to fetch project sessions',
      message: error instanceof Error ? error.message : 'Unknown error',
      sessions: [],
    });
  }
}
