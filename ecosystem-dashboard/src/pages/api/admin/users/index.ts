/**
 * Users API
 * 
 * List all users (platform admin only)
 * Search users by email
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = session.user as any;
  const isPlatformAdmin = user.platformRole === 'platform-admin';

  if (!isPlatformAdmin) {
    return res.status(403).json({ error: 'Platform admin access required' });
  }

  if (req.method === 'GET') {
    const { search, limit = '50', offset = '0' } = req.query;

    try {
      let query: string;
      let params: any[];

      if (search) {
        query = `
          SELECT id, email, name, avatar_url, platform_role, status, created_at,
            (SELECT COUNT(*) FROM tenant_memberships tm WHERE tm.user_id = users.id AND tm.status = 'active') as tenant_count
          FROM users
          WHERE email ILIKE $1 OR name ILIKE $1
          ORDER BY created_at DESC
          LIMIT $2 OFFSET $3
        `;
        params = [`%${search}%`, parseInt(limit as string), parseInt(offset as string)];
      } else {
        query = `
          SELECT id, email, name, avatar_url, platform_role, status, created_at,
            (SELECT COUNT(*) FROM tenant_memberships tm WHERE tm.user_id = users.id AND tm.status = 'active') as tenant_count
          FROM users
          ORDER BY created_at DESC
          LIMIT $1 OFFSET $2
        `;
        params = [parseInt(limit as string), parseInt(offset as string)];
      }

      const result = await pool.query(query, params);

      // Get total count
      const countResult = await pool.query(
        search 
          ? `SELECT COUNT(*) FROM users WHERE email ILIKE $1 OR name ILIKE $1`
          : `SELECT COUNT(*) FROM users`,
        search ? [`%${search}%`] : []
      );

      return res.status(200).json({
        users: result.rows,
        total: parseInt(countResult.rows[0].count),
      });
    } catch (error) {
      console.error('[Users API] Error:', error);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  // PUT - Update user (platform role, status)
  if (req.method === 'PUT') {
    const { userId, platformRole, status } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (platformRole) {
        updates.push(`platform_role = $${paramIndex++}`);
        values.push(platformRole);
      }
      if (status) {
        updates.push(`status = $${paramIndex++}`);
        values.push(status);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No updates provided' });
      }

      values.push(userId);
      const result = await pool.query(
        `UPDATE users SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id = $${paramIndex}
         RETURNING id, email, name, platform_role, status`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json({ user: result.rows[0] });
    } catch (error) {
      console.error('[Users API] Error:', error);
      return res.status(500).json({ error: 'Failed to update user' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
