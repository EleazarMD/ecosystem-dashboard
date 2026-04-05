import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionLineage, getChildSessions, getSessionDescendants } from '@/lib/db/research-storage';

/**
 * GET /api/research-lab/session/[id]/lineage
 * Returns the full ancestry (parents up to root) and direct children of a session.
 * Query params:
 *   ?descendants=true  — also include the full descendant tree
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sessionId = req.query.id as string;
  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  const includeDescendants = req.query.descendants === 'true';

  try {
    const [lineage, children] = await Promise.all([
      getSessionLineage(sessionId),
      getChildSessions(sessionId),
    ]);

    const result: any = {
      sessionId,
      lineage,       // Array from root → ... → current session (ordered by depth DESC)
      children,      // Direct children only
      depth: lineage.length - 1, // 0 = root session
      isRoot: lineage.length <= 1,
      rootSessionId: lineage.length > 0 ? lineage[0].session_id : sessionId,
    };

    if (includeDescendants) {
      result.descendants = await getSessionDescendants(sessionId);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('[Session Lineage API] Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch session lineage',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
