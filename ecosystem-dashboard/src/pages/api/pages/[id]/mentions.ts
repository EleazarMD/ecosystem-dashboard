/**
 * API endpoint for tracking page mentions
 * POST /api/pages/:id/mentions - Track mentions when page is saved
 * DELETE /api/pages/:id/mentions - Clean up mentions when page is deleted
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id: pageId } = req.query;

  if (!pageId || typeof pageId !== 'string') {
    return res.status(400).json({ error: 'Page ID is required' });
  }

  if (req.method === 'POST') {
    return handleTrackMentions(req, res, pageId);
  } else if (req.method === 'DELETE') {
    return handleDeleteMentions(req, res, pageId);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleTrackMentions(
  req: NextApiRequest,
  res: NextApiResponse,
  pageId: string
) {
  const { workspaceId, mentions } = req.body;

  if (!workspaceId) {
    return res.status(400).json({ error: 'Workspace ID is required' });
  }

  if (!Array.isArray(mentions)) {
    return res.status(400).json({ error: 'Mentions must be an array' });
  }

  try {
    // Delete existing mentions from this page
    await query(
      'DELETE FROM page_mentions WHERE source_page_id = $1',
      [pageId]
    );

    // Insert new mentions
    if (mentions.length > 0) {
      const values: any[] = [];
      const placeholders: string[] = [];

      mentions.forEach((mention, index) => {
        const offset = index * 5;
        placeholders.push(
          `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`
        );
        values.push(
          mention.sourcePageId,
          mention.targetPageId,
          mention.blockId,
          mention.mentionText,
          mention.createdAt || new Date()
        );
      });

      await query(
        `INSERT INTO page_mentions (source_page_id, target_page_id, block_id, mention_text, created_at)
         VALUES ${placeholders.join(', ')}
         ON CONFLICT (source_page_id, target_page_id, block_id) DO UPDATE
         SET mention_text = EXCLUDED.mention_text, created_at = EXCLUDED.created_at`,
        values
      );
    }

    return res.status(200).json({ success: true, mentionsTracked: mentions.length });
  } catch (error) {
    console.error('Error tracking mentions:', error);
    return res.status(500).json({ error: 'Failed to track mentions' });
  }
}

async function handleDeleteMentions(
  req: NextApiRequest,
  res: NextApiResponse,
  pageId: string
) {
  try {
    // Delete all mentions where this page is the source or target
    await query(
      'DELETE FROM page_mentions WHERE source_page_id = $1 OR target_page_id = $1',
      [pageId]
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting mentions:', error);
    return res.status(500).json({ error: 'Failed to delete mentions' });
  }
}
