/**
 * Tenant Members API
 * 
 * List, add, update, and remove tenant members
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

async function canManageTenant(userId: string, tenantId: string, platformRole: string): Promise<boolean> {
  if (platformRole === 'platform-admin') return true;
  
  const result = await pool.query(
    `SELECT role_id FROM tenant_memberships 
     WHERE user_id = $1 AND tenant_id = $2 AND status = 'active'`,
    [userId, tenantId]
  );
  
  return result.rows.length > 0 && result.rows[0].role_id === 'tenant-admin';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = session.user as any;
  const { tenantId } = req.query;

  if (!tenantId || typeof tenantId !== 'string') {
    return res.status(400).json({ error: 'Tenant ID is required' });
  }

  // GET - List members
  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT tm.*, u.email, u.name, u.avatar_url
         FROM tenant_memberships tm
         JOIN users u ON u.id = tm.user_id
         WHERE tm.tenant_id = $1
         ORDER BY tm.role_id, u.name`,
        [tenantId]
      );

      return res.status(200).json({ members: result.rows });
    } catch (error) {
      console.error('[Tenant Members API] Error:', error);
      return res.status(500).json({ error: 'Failed to fetch members' });
    }
  }

  // Check admin permissions for write operations
  const canManage = await canManageTenant(user.id, tenantId, user.platformRole);
  if (!canManage) {
    return res.status(403).json({ error: 'You do not have permission to manage this tenant' });
  }

  // POST - Add member
  if (req.method === 'POST') {
    const { userId, email, roleId = 'tenant-member' } = req.body;

    try {
      let targetUserId = userId;

      // If email provided, find or validate user
      if (email && !userId) {
        const userResult = await pool.query(
          `SELECT id FROM users WHERE email = $1`,
          [email.toLowerCase()]
        );

        if (userResult.rows.length === 0) {
          return res.status(404).json({ error: 'User not found. They must sign up first.' });
        }
        targetUserId = userResult.rows[0].id;
      }

      if (!targetUserId) {
        return res.status(400).json({ error: 'User ID or email is required' });
      }

      // Check if already a member
      const existing = await pool.query(
        `SELECT id FROM tenant_memberships WHERE tenant_id = $1 AND user_id = $2`,
        [tenantId, targetUserId]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'User is already a member of this tenant' });
      }

      const result = await pool.query(
        `INSERT INTO tenant_memberships (tenant_id, user_id, role_id, invited_by, status, accepted_at)
         VALUES ($1, $2, $3, $4, 'active', NOW())
         RETURNING *`,
        [tenantId, targetUserId, roleId, user.id]
      );

      return res.status(201).json({ member: result.rows[0] });
    } catch (error) {
      console.error('[Tenant Members API] Error:', error);
      return res.status(500).json({ error: 'Failed to add member' });
    }
  }

  // PUT - Update member role
  if (req.method === 'PUT') {
    const { userId, roleId } = req.body;

    if (!userId || !roleId) {
      return res.status(400).json({ error: 'User ID and role ID are required' });
    }

    try {
      const result = await pool.query(
        `UPDATE tenant_memberships 
         SET role_id = $1
         WHERE tenant_id = $2 AND user_id = $3
         RETURNING *`,
        [roleId, tenantId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Member not found' });
      }

      return res.status(200).json({ member: result.rows[0] });
    } catch (error) {
      console.error('[Tenant Members API] Error:', error);
      return res.status(500).json({ error: 'Failed to update member' });
    }
  }

  // DELETE - Remove member
  if (req.method === 'DELETE') {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    try {
      await pool.query(
        `DELETE FROM tenant_memberships WHERE tenant_id = $1 AND user_id = $2`,
        [tenantId, userId]
      );

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('[Tenant Members API] Error:', error);
      return res.status(500).json({ error: 'Failed to remove member' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
