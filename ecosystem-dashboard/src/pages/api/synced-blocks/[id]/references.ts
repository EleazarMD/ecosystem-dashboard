/**
 * API endpoint for synced block references
 * GET /api/synced-blocks/:id/references - List references
 * POST /api/synced-blocks/:id/references - Add a reference
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { getMobileOrSessionUserId } from '@/lib/mobile-auth';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  const authUserId = getMobileOrSessionUserId(session?.user?.id, req);
  if (!authUserId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id: syncedBlockId } = req.query;

  if (!syncedBlockId || typeof syncedBlockId !== 'string') {
    return res.status(400).json({ error: 'Synced block ID is required' });
  }

  if (req.method === 'GET') {
    try {
      const result = await query(
        `SELECT id, synced_block_id, page_id, block_id, created_at
         FROM synced_block_references
         WHERE synced_block_id = $1
         ORDER BY created_at`,
        [syncedBlockId]
      );

      return res.status(200).json({ references: result.rows });
    } catch (error) {
      console.error('Failed to get references:', error);
      return res.status(500).json({ error: 'Failed to get references' });
    }
  }

  if (req.method === 'POST') {
    const { pageId, blockId } = req.body;

    if (!pageId || !blockId) {
      return res.status(400).json({ error: 'pageId and blockId are required' });
    }

    try {
      const result = await query(
        `INSERT INTO synced_block_references (synced_block_id, page_id, block_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (synced_block_id, page_id, block_id) DO NOTHING
         RETURNING id`,
        [syncedBlockId, pageId, blockId]
      );

      return res.status(201).json(result.rows[0] || { message: 'Reference already exists' });
    } catch (error) {
      console.error('Failed to add reference:', error);
      return res.status(500).json({ error: 'Failed to add reference' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
