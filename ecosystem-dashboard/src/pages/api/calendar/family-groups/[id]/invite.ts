/**
 * Family Group Invite API
 * POST /api/calendar/family-groups/[id]/invite - Invite member to group
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
    if (req.method === 'POST') {
      const { email, role = 'member' } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'email is required' });
      }

      // Verify user has permission to invite (owner or admin)
      const permCheck = await pool.query(
        `SELECT role FROM calendar.family_group_members 
         WHERE family_group_id = $1 AND user_id = $2 AND role IN ('owner', 'admin')`,
        [id, owner_id]
      );

      if (!permCheck.rows[0]) {
        return res.status(403).json({ error: 'You do not have permission to invite members' });
      }

      // Check if already a member
      const existingCheck = await pool.query(
        `SELECT 1 FROM calendar.family_group_members 
         WHERE family_group_id = $1 AND email = $2`,
        [id, email]
      );

      if (existingCheck.rows[0]) {
        return res.status(409).json({ error: 'This email is already a member of the group' });
      }

      // Add member with pending status
      const result = await pool.query(
        `INSERT INTO calendar.family_group_members 
         (family_group_id, email, role, status, invited_by)
         VALUES ($1, $2, $3, 'pending', $4)
         RETURNING *`,
        [id, email, role, owner_id]
      );

      // TODO: Send invitation email

      return res.status(201).json({ 
        message: 'Invitation sent',
        member: result.rows[0],
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Family group invite API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: (error as Error).message,
    });
  }
}
