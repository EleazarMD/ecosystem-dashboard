/**
 * Sharing Rules API
 * GET /api/calendar/sharing-rules - List sharing rules for user's calendars
 * POST /api/calendar/sharing-rules - Create sharing rule
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
      const result = await pool.query(
        `SELECT 
          sr.id,
          sr.calendar_id,
          c.name as calendar_name,
          sr.shared_with_type,
          sr.shared_with_id,
          CASE 
            WHEN sr.shared_with_type = 'family_group' THEN fg.name
            WHEN sr.shared_with_type = 'work_org' THEN wo.name
            ELSE sr.shared_with_id
          END as shared_with_name,
          sr.permission,
          sr.created_at
        FROM calendar.sharing_rules sr
        JOIN calendar.calendars c ON c.id = sr.calendar_id
        LEFT JOIN calendar.family_groups fg ON sr.shared_with_type = 'family_group' AND fg.id::text = sr.shared_with_id
        LEFT JOIN calendar.work_orgs wo ON sr.shared_with_type = 'work_org' AND wo.id::text = sr.shared_with_id
        WHERE c.owner_id = $1
        ORDER BY sr.created_at DESC`,
        [owner_id]
      );

      return res.status(200).json({ rules: result.rows });
    }

    if (req.method === 'POST') {
      const {
        calendar_id,
        shared_with_type,
        shared_with_id,
        permission = 'view',
      } = req.body;

      if (!calendar_id || !shared_with_type || !shared_with_id) {
        return res.status(400).json({ 
          error: 'calendar_id, shared_with_type, and shared_with_id are required' 
        });
      }

      // Verify user owns the calendar
      const calCheck = await pool.query(
        `SELECT 1 FROM calendar.calendars WHERE id = $1 AND owner_id = $2`,
        [calendar_id, owner_id]
      );

      if (!calCheck.rows[0]) {
        return res.status(403).json({ error: 'You do not own this calendar' });
      }

      // Check for existing rule
      const existingCheck = await pool.query(
        `SELECT 1 FROM calendar.sharing_rules 
         WHERE calendar_id = $1 AND shared_with_type = $2 AND shared_with_id = $3`,
        [calendar_id, shared_with_type, shared_with_id]
      );

      if (existingCheck.rows[0]) {
        // Update existing rule
        const result = await pool.query(
          `UPDATE calendar.sharing_rules 
           SET permission = $1, updated_at = NOW()
           WHERE calendar_id = $2 AND shared_with_type = $3 AND shared_with_id = $4
           RETURNING *`,
          [permission, calendar_id, shared_with_type, shared_with_id]
        );
        return res.status(200).json({ rule: result.rows[0], updated: true });
      }

      // Create new rule
      const result = await pool.query(
        `INSERT INTO calendar.sharing_rules 
         (calendar_id, shared_with_type, shared_with_id, permission, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [calendar_id, shared_with_type, shared_with_id, permission, owner_id]
      );

      return res.status(201).json({ rule: result.rows[0] });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Sharing rules API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: (error as Error).message,
    });
  }
}
