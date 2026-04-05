/**
 * API endpoint for full-text search across workspace
 * GET /api/search?q=query&workspaceId=xxx&userId=xxx
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

interface SearchResult {
  pageId: string;
  title: string;
  excerpt: string;
  type: 'page' | 'database';
  matchScore: number;
  lastEditedAt: Date;
  isFavorite?: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q: searchQuery, workspaceId, userId } = req.query;

  if (!searchQuery || typeof searchQuery !== 'string') {
    return res.status(400).json({ error: 'Search query is required' });
  }

  if (!workspaceId || typeof workspaceId !== 'string') {
    return res.status(400).json({ error: 'Workspace ID is required' });
  }

  try {
    // Perform full-text search using PostgreSQL
    const result = await query(
      `WITH search_results AS (
        SELECT 
          b.id as page_id,
          b.type,
          COALESCE(b.properties->>'title', 'Untitled') as title,
          b.content::text as content,
          b.updated_at as last_edited_at,
          ts_rank(
            to_tsvector('english', COALESCE(b.properties->>'title', '') || ' ' || COALESCE(b.content::text, '')),
            plainto_tsquery('english', $1)
          ) as rank
        FROM blocks b
        WHERE b.workspace_id = $2
          AND (b.type = 'page' OR b.type = 'database_full_page')
          AND (
            to_tsvector('english', COALESCE(b.properties->>'title', '') || ' ' || COALESCE(b.content::text, ''))
            @@ plainto_tsquery('english', $1)
          )
      ),
      favorites AS (
        SELECT page_id, true as is_favorite
        FROM page_favorites
        WHERE user_id = $3 AND workspace_id = $2
      )
      SELECT 
        sr.page_id,
        sr.type,
        sr.title,
        sr.content,
        sr.last_edited_at,
        sr.rank,
        COALESCE(f.is_favorite, false) as is_favorite
      FROM search_results sr
      LEFT JOIN favorites f ON sr.page_id = f.page_id
      ORDER BY sr.rank DESC, sr.last_edited_at DESC
      LIMIT 20`,
      [searchQuery, workspaceId, userId]
    );

    const results: SearchResult[] = result.rows.map(row => ({
      pageId: row.page_id,
      title: extractTitle(row.title),
      excerpt: extractExcerpt(row.content, searchQuery),
      type: row.type === 'database_full_page' ? 'database' : 'page',
      matchScore: parseFloat(row.rank) || 0,
      lastEditedAt: new Date(row.last_edited_at),
      isFavorite: row.is_favorite,
    }));

    return res.status(200).json({ results });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ error: 'Search failed' });
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

function extractExcerpt(content: any, searchQuery: string, maxLength: number = 150): string {
  if (!content) return '';
  
  let text = '';
  if (typeof content === 'string') {
    text = content;
  } else if (Array.isArray(content)) {
    text = content
      .map(item => {
        if (typeof item === 'string') return item;
        if (typeof item === 'object' && item.text) return item.text;
        return '';
      })
      .join(' ');
  }

  // Find the position of the search query in the text
  const lowerText = text.toLowerCase();
  const lowerQuery = searchQuery.toLowerCase();
  const queryPos = lowerText.indexOf(lowerQuery);

  if (queryPos === -1) {
    // Query not found, return start of text
    return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
  }

  // Extract context around the query
  const start = Math.max(0, queryPos - 50);
  const end = Math.min(text.length, queryPos + searchQuery.length + 100);
  
  let excerpt = text.substring(start, end);
  if (start > 0) excerpt = '...' + excerpt;
  if (end < text.length) excerpt = excerpt + '...';

  return excerpt;
}
