/**
 * API endpoint for individual synced blocks
 * GET /api/synced-blocks/:id - Get synced block
 * PUT /api/synced-blocks/:id - Update synced block content
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getMobileOrSessionUserId } from '@/lib/mobile-auth';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  const authUserId = getMobileOrSessionUserId(session?.user?.id, req);
  if (!authUserId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Synced block ID is required' });
  }

  if (req.method === 'GET') {
    try {
      const result = await query(
        `SELECT id, source_block_id, workspace_id, content, properties, created_by, created_at, updated_at
         FROM synced_blocks WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Synced block not found' });
      }

      const row = result.rows[0];
      return res.status(200).json({
        id: row.id,
        sourceBlockId: row.source_block_id,
        workspaceId: row.workspace_id,
        content: row.content,
        properties: row.properties,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    } catch (error) {
      console.error('Failed to get synced block:', error);
      return res.status(500).json({ error: 'Failed to get synced block' });
    }
  }

  if (req.method === 'PUT') {
    const { content, properties } = req.body;

    try {
      await query(
        `UPDATE synced_blocks SET content = $1, properties = $2, updated_at = NOW() WHERE id = $3`,
        [JSON.stringify(content || []), JSON.stringify(properties || {}), id]
      );
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Failed to update synced block:', error);
      return res.status(500).json({ error: 'Failed to update synced block' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
