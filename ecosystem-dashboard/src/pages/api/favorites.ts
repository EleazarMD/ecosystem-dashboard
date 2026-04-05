/**
 * API endpoint for managing favorites
 * GET /api/favorites - Get user's favorites
 * POST /api/favorites - Add a favorite
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    return handleGetFavorites(req, res);
  } else if (req.method === 'POST') {
    return handleAddFavorite(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGetFavorites(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { workspaceId, userId } = req.query;

  if (!workspaceId || typeof workspaceId !== 'string') {
    return res.status(400).json({ error: 'Workspace ID is required' });
  }

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    const result = await query(
      `SELECT 
        pf.id,
        pf.page_id,
        COALESCE(b.properties->>'title', 'Untitled') as page_title,
        pf.created_at
      FROM page_favorites pf
      LEFT JOIN blocks b ON pf.page_id = b.id
      WHERE pf.user_id = $1 AND pf.workspace_id = $2
      ORDER BY pf.created_at DESC`,
      [userId, workspaceId]
    );

    const favorites = result.rows.map(row => ({
      id: row.id,
      pageId: row.page_id,
      pageTitle: extractTitle(row.page_title),
      createdAt: new Date(row.created_at),
    }));

    return res.status(200).json({ favorites });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return res.status(500).json({ error: 'Failed to fetch favorites' });
  }
}

async function handleAddFavorite(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { userId, pageId, workspaceId } = req.body;

  if (!userId || !pageId || !workspaceId) {
    return res.status(400).json({ error: 'userId, pageId, and workspaceId are required' });
  }

  try {
    const result = await query(
      `INSERT INTO page_favorites (user_id, page_id, workspace_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, page_id) DO NOTHING
       RETURNING id`,
      [userId, pageId, workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({ success: true, message: 'Already favorited' });
    }

    return res.status(201).json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Error adding favorite:', error);
    return res.status(500).json({ error: 'Failed to add favorite' });
  }
}

function extractTitle(titleData: any): string {
  if (!titleData) return 'Untitled';
  if (typeof titleData === 'string') return titleData;
  if (Array.isArray(titleData) && titleData.length > 0) {
    const firstItem = titleData[0];
    if (typeof firstItem === 'object' && firstItem.text) {
      return firstItem.text.content || firstItem.text || 'Untitled';
    }
    return String(firstItem);
  }
  return 'Untitled';
}
