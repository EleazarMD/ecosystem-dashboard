/**
 * API endpoint for synced blocks
 * POST /api/synced-blocks - Create a synced block
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

  if (req.method === 'POST') {
    const { workspaceId, sourceBlockId, content, properties, createdBy } = req.body;

    if (!workspaceId || !sourceBlockId || !createdBy) {
      return res.status(400).json({ error: 'workspaceId, sourceBlockId, and createdBy are required' });
    }

    try {
      const result = await query(
        `INSERT INTO synced_blocks (source_block_id, workspace_id, content, properties, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, source_block_id, workspace_id, content, properties, created_by, created_at, updated_at`,
        [sourceBlockId, workspaceId, JSON.stringify(content || []), JSON.stringify(properties || {}), createdBy]
      );

      const row = result.rows[0];
      return res.status(201).json({
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
      console.error('Failed to create synced block:', error);
      return res.status(500).json({ error: 'Failed to create synced block' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
