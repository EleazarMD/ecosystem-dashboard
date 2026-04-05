/**
 * API endpoint for searching pages within a workspace
 * GET /api/workspace/:workspaceId/pages/search?q=query&limit=10
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { workspaceId } = req.query;
  const { q: searchQuery, limit = '10' } = req.query;

  if (!workspaceId || typeof workspaceId !== 'string') {
    return res.status(400).json({ error: 'Workspace ID is required' });
  }

  if (!searchQuery || typeof searchQuery !== 'string') {
    return res.status(400).json({ error: 'Search query is required' });
  }

  const limitNum = parseInt(limit as string, 10);

  try {
    // Search pages by title (case-insensitive)
    const result = await query(
      `SELECT 
        id,
        type,
        properties->>'title' as title,
        properties->>'icon' as icon
      FROM blocks
      WHERE workspace_id = $1
        AND (type = 'page' OR type = 'database_full_page')
        AND (
          properties->>'title' ILIKE $2
          OR properties->'title'->0->'text'->>'content' ILIKE $2
        )
      ORDER BY 
        CASE 
          WHEN properties->>'title' ILIKE $3 THEN 1
          WHEN properties->'title'->0->'text'->>'content' ILIKE $3 THEN 2
          ELSE 3
        END,
        updated_at DESC
      LIMIT $4`,
      [workspaceId, `%${searchQuery}%`, `${searchQuery}%`, limitNum]
    );

    const pages = result.rows.map(row => ({
      id: row.id,
      title: extractTitle(row.title),
      type: row.type === 'database_full_page' ? 'database' : 'page',
      icon: row.icon,
    }));

    return res.status(200).json({ pages });
  } catch (error) {
    console.error('Error searching pages:', error);
    return res.status(500).json({ error: 'Failed to search pages' });
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
