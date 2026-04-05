/**
 * API endpoint for fetching page backlinks
 * GET /api/pages/:id/backlinks
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

interface Backlink {
  sourcePageId: string;
  sourcePageTitle: string;
  blockId: string;
  blockContent: string;
  mentionText: string;
  createdAt: Date;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id: pageId } = req.query;
  const { workspaceId } = req.query;

  if (!pageId || typeof pageId !== 'string') {
    return res.status(400).json({ error: 'Page ID is required' });
  }

  if (!workspaceId || typeof workspaceId !== 'string') {
    return res.status(400).json({ error: 'Workspace ID is required' });
  }

  try {
    // Query page_mentions table with JOIN to get source page details
    const result = await query(
      `SELECT 
        pm.source_page_id,
        pm.block_id,
        pm.mention_text,
        pm.created_at,
        sp.properties->>'title' as source_page_title,
        sb.properties as block_content
      FROM page_mentions pm
      LEFT JOIN blocks sp ON pm.source_page_id = sp.id
      LEFT JOIN blocks sb ON pm.block_id = sb.id
      WHERE pm.target_page_id = $1
        AND sp.workspace_id = $2
      ORDER BY pm.created_at DESC`,
      [pageId, workspaceId]
    );

    const backlinks: Backlink[] = result.rows.map(row => ({
      sourcePageId: row.source_page_id,
      sourcePageTitle: extractTitle(row.source_page_title),
      blockId: row.block_id,
      blockContent: extractBlockContent(row.block_content),
      mentionText: row.mention_text,
      createdAt: new Date(row.created_at),
    }));

    return res.status(200).json({ backlinks });
  } catch (error) {
    console.error('Error fetching backlinks:', error);
    return res.status(500).json({ error: 'Failed to fetch backlinks' });
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

function extractBlockContent(contentData: any): string {
  if (!contentData) return '';
  if (typeof contentData === 'string') return contentData;

  // contentData is now the full properties JSONB from blocks table
  if (typeof contentData === 'object' && !Array.isArray(contentData)) {
    // Try title first (for page blocks)
    const title = contentData.title;
    if (Array.isArray(title) && title.length > 0) {
      return title.map((t: any) => t?.text?.content || t?.text || '').join('');
    }
    // Try extracting any text content from properties
    return JSON.stringify(contentData).substring(0, 200);
  }

  if (Array.isArray(contentData)) {
    return contentData
      .map(item => {
        if (typeof item === 'string') return item;
        if (typeof item === 'object' && item.text) return item.text?.content || item.text;
        return '';
      })
      .join('');
  }
  return '';
}
