/**
 * API endpoint for getting linked rows for a specific relation
 * GET /api/database/relations/:relationId/links?sourceRowId=xxx or ?targetRowId=xxx
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { relationId, sourceRowId, targetRowId } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!relationId || typeof relationId !== 'string') {
    return res.status(400).json({ error: 'Relation ID is required' });
  }

  try {
    let result;

    if (sourceRowId && typeof sourceRowId === 'string') {
      // Get rows linked FROM this source row
      result = await query(
        `SELECT rl.id as link_id, rl.target_row_id as id,
                COALESCE(b.properties->>'title', 'Untitled') as title
         FROM relation_links rl
         LEFT JOIN blocks b ON rl.target_row_id = b.id
         WHERE rl.relation_id = $1 AND rl.source_row_id = $2
         ORDER BY rl.created_at`,
        [relationId, sourceRowId]
      );
    } else if (targetRowId && typeof targetRowId === 'string') {
      // Get rows that link TO this target row (reverse links)
      result = await query(
        `SELECT rl.id as link_id, rl.source_row_id as id,
                COALESCE(b.properties->>'title', 'Untitled') as title
         FROM relation_links rl
         LEFT JOIN blocks b ON rl.source_row_id = b.id
         WHERE rl.relation_id = $1 AND rl.target_row_id = $2
         ORDER BY rl.created_at`,
        [relationId, targetRowId]
      );
    } else {
      return res.status(400).json({ error: 'Either sourceRowId or targetRowId is required' });
    }

    return res.status(200).json({ linkedRows: result.rows });
  } catch (error) {
    console.error('Failed to get linked rows:', error);
    return res.status(500).json({ error: 'Failed to get linked rows' });
  }
}
