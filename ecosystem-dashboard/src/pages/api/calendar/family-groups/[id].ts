/**
 * Family Group by ID API
 * GET /api/calendar/family-groups/[id] - Get single group
 * PUT /api/calendar/family-groups/[id] - Update group
 * DELETE /api/calendar/family-groups/[id] - Delete group
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '@/lib/calendar/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const owner_id = req.headers['x-user-id'] as string || 'default-user';

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Group ID is required' });
  }

  try {
    if (req.method === 'GET') {
      const result = await pool.query(
        `SELECT fg.*, 
          COALESCE(
            json_agg(
              json_build_object(
                'id', fgm.id,
                'user_id', fgm.user_id,
                'email', fgm.email,
                'name', fgm.display_name,
                'role', fgm.role,
                'status', fgm.status
              )
            ) FILTER (WHERE fgm.id IS NOT NULL),
            '[]'
          ) as members
        FROM calendar.family_groups fg
        LEFT JOIN calendar.family_group_members fgm ON fgm.family_group_id = fg.id
        WHERE fg.id = $1
        GROUP BY fg.id`,
        [id]
      );

      if (!result.rows[0]) {
        return res.status(404).json({ error: 'Family group not found' });
      }

      return res.status(200).json({ group: result.rows[0] });
    }

    if (req.method === 'PUT') {
      const { name } = req.body;

      const result = await pool.query(
        `UPDATE calendar.family_groups 
         SET name = COALESCE($1, name), updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [name, id]
      );

      if (!result.rows[0]) {
        return res.status(404).json({ error: 'Family group not found' });
      }

      return res.status(200).json({ group: result.rows[0] });
    }

    if (req.method === 'DELETE') {
      // Verify user is owner
      const ownerCheck = await pool.query(
        `SELECT 1 FROM calendar.family_group_members 
         WHERE family_group_id = $1 AND user_id = $2 AND role = 'owner'`,
        [id, owner_id]
      );

      if (!ownerCheck.rows[0]) {
        return res.status(403).json({ error: 'Only the owner can delete this group' });
      }

      await pool.query('DELETE FROM calendar.family_groups WHERE id = $1', [id]);

      return res.status(200).json({ message: 'Family group deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Family group API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: (error as Error).message,
    });
  }
}
