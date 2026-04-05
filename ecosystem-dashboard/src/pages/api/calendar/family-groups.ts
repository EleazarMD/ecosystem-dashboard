/**
 * Family Groups API
 * GET /api/calendar/family-groups - List family groups
 * POST /api/calendar/family-groups - Create family group
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { pool } from '@/lib/calendar/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const owner_id = (session.user as any).id;

  try {
    if (req.method === 'GET') {
      // Get family groups where user is a member
      const result = await pool.query(
        `SELECT 
          fg.id,
          fg.name,
          fg.created_by,
          fg.created_at,
          COALESCE(
            json_agg(
              json_build_object(
                'id', fgm.id,
                'user_id', fgm.user_id,
                'email', fgm.email,
                'name', fgm.display_name,
                'role', fgm.role,
                'status', fgm.status,
                'joined_at', fgm.joined_at
              )
            ) FILTER (WHERE fgm.id IS NOT NULL),
            '[]'
          ) as members,
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'calendar_id', sr.calendar_id,
                  'calendar_name', c.name,
                  'permission', sr.permission
                )
              )
              FROM calendar.sharing_rules sr
              JOIN calendar.calendars c ON c.id = sr.calendar_id
              WHERE sr.shared_with_type = 'family_group' 
                AND sr.shared_with_id = fg.id::text
            ),
            '[]'
          ) as shared_calendars
        FROM calendar.family_groups fg
        LEFT JOIN calendar.family_group_members fgm ON fgm.family_group_id = fg.id
        WHERE fg.id IN (
          SELECT family_group_id FROM calendar.family_group_members 
          WHERE user_id = $1 OR email = $1
        )
        GROUP BY fg.id
        ORDER BY fg.created_at DESC`,
        [owner_id]
      );

      return res.status(200).json({ groups: result.rows });
    }

    if (req.method === 'POST') {
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'name is required' });
      }

      // Create family group
      const groupResult = await pool.query(
        `INSERT INTO calendar.family_groups (name, created_by)
         VALUES ($1, $2)
         RETURNING *`,
        [name, owner_id]
      );

      const group = groupResult.rows[0];

      // Add creator as owner
      await pool.query(
        `INSERT INTO calendar.family_group_members 
         (family_group_id, user_id, email, display_name, role, status, joined_at)
         VALUES ($1, $2, $2, 'Owner', 'owner', 'active', NOW())`,
        [group.id, owner_id]
      );

      return res.status(201).json({ group });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Family groups API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: (error as Error).message,
    });
  }
}
