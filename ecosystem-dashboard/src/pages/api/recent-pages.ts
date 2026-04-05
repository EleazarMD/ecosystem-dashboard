/**
 * API endpoint for recent pages
 * GET /api/recent-pages - Get user's recently viewed pages
 * POST /api/recent-pages - Track a page view
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    return handleGetRecentPages(req, res);
  } else if (req.method === 'POST') {
    return handleTrackPageView(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGetRecentPages(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { workspaceId, userId, limit = '10' } = req.query;

  if (!workspaceId || typeof workspaceId !== 'string') {
    return res.status(400).json({ error: 'Workspace ID is required' });
  }

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const limitNum = parseInt(limit as string, 10);

  try {
    const result = await query(
      'SELECT * FROM get_recent_pages($1, $2, $3)',
      [userId, workspaceId, limitNum]
    );

    const recentPages = result.rows.map(row => ({
      pageId: row.page_id,
      pageTitle: row.page_title || 'Untitled',
      lastViewed: new Date(row.last_viewed),
      viewCount: parseInt(row.view_count, 10),
    }));

    return res.status(200).json({ recentPages });
  } catch (error) {
    console.error('Error fetching recent pages:', error);
    return res.status(500).json({ error: 'Failed to fetch recent pages' });
  }
}

async function handleTrackPageView(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { userId, pageId, workspaceId } = req.body;

  if (!userId || !pageId || !workspaceId) {
    return res.status(400).json({ error: 'userId, pageId, and workspaceId are required' });
  }

  try {
    await query(
      'SELECT track_page_view($1, $2, $3)',
      [userId, pageId, workspaceId]
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error tracking page view:', error);
    return res.status(500).json({ error: 'Failed to track page view' });
  }
}
