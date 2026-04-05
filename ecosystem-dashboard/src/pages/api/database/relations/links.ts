/**
 * API endpoint for relation links between rows
 * POST /api/database/relations/links - Create a link
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { relationId, sourceRowId, targetRowId } = req.body;

    if (!relationId || !sourceRowId || !targetRowId) {
      return res.status(400).json({ error: 'relationId, sourceRowId, and targetRowId are required' });
    }

    try {
      const result = await query(
        `INSERT INTO relation_links (relation_id, source_row_id, target_row_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (relation_id, source_row_id, target_row_id) DO NOTHING
         RETURNING id, relation_id, source_row_id, target_row_id`,
        [relationId, sourceRowId, targetRowId]
      );

      return res.status(201).json(result.rows[0] || { message: 'Link already exists' });
    } catch (error) {
      console.error('Failed to create relation link:', error);
      return res.status(500).json({ error: 'Failed to create link' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
