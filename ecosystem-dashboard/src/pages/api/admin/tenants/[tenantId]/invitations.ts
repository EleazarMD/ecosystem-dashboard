/**
 * Tenant Invitations API
 * 
 * List, create, and revoke tenant invitations
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]';
import { Pool } from 'pg';
import crypto from 'crypto';

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

function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url');
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

  // Check permissions
  const canManage = await canManageTenant(user.id, tenantId, user.platformRole);
  if (!canManage) {
    return res.status(403).json({ error: 'You do not have permission to manage this tenant' });
  }

  // GET - List pending invitations
  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT ti.*, u.name as invited_by_name, u.email as invited_by_email
         FROM tenant_invitations ti
         LEFT JOIN users u ON u.id = ti.invited_by
         WHERE ti.tenant_id = $1 AND ti.status = 'pending' AND ti.expires_at > NOW()
         ORDER BY ti.created_at DESC`,
        [tenantId]
      );

      return res.status(200).json({ invitations: result.rows });
    } catch (error) {
      console.error('[Tenant Invitations API] Error:', error);
      return res.status(500).json({ error: 'Failed to fetch invitations' });
    }
  }

  // POST - Create invitation
  if (req.method === 'POST') {
    const { email, roleId = 'tenant-member', expiresInDays = 7 } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    try {
      // Check if user is already a member
      const existingMember = await pool.query(
        `SELECT tm.id FROM tenant_memberships tm
         JOIN users u ON u.id = tm.user_id
         WHERE tm.tenant_id = $1 AND u.email = $2 AND tm.status = 'active'`,
        [tenantId, normalizedEmail]
      );

      if (existingMember.rows.length > 0) {
        return res.status(409).json({ error: 'User is already a member of this workspace' });
      }

      // Check for existing pending invitation
      const existingInvite = await pool.query(
        `SELECT id FROM tenant_invitations 
         WHERE tenant_id = $1 AND email = $2 AND status = 'pending' AND expires_at > NOW()`,
        [tenantId, normalizedEmail]
      );

      if (existingInvite.rows.length > 0) {
        return res.status(409).json({ error: 'An invitation is already pending for this email' });
      }

      // Create invitation
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const result = await pool.query(
        `INSERT INTO tenant_invitations (tenant_id, email, role_id, token, status, invited_by, expires_at)
         VALUES ($1, $2, $3, $4, 'pending', $5, $6)
         RETURNING *`,
        [tenantId, normalizedEmail, roleId, token, user.id, expiresAt]
      );

      const invitation = result.rows[0];

      // Generate invite URL
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const inviteUrl = `${baseUrl}/invite/${token}`;

      return res.status(201).json({ 
        invitation,
        inviteUrl
      });
    } catch (error) {
      console.error('[Tenant Invitations API] Error:', error);
      return res.status(500).json({ error: 'Failed to create invitation' });
    }
  }

  // DELETE - Revoke invitation
  if (req.method === 'DELETE') {
    const { invitationId } = req.body;

    if (!invitationId) {
      return res.status(400).json({ error: 'Invitation ID is required' });
    }

    try {
      const result = await pool.query(
        `UPDATE tenant_invitations 
         SET status = 'revoked'
         WHERE id = $1 AND tenant_id = $2 AND status = 'pending'
         RETURNING *`,
        [invitationId, tenantId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Invitation not found or already processed' });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('[Tenant Invitations API] Error:', error);
      return res.status(500).json({ error: 'Failed to revoke invitation' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
