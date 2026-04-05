/**
 * Invitation Token API
 * 
 * GET - Get invitation details by token
 * POST - Accept invitation
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Token is required' });
  }

  // GET - Get invitation details (public, but limited info)
  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT ti.email, ti.role_id, ti.expires_at, ti.status,
                t.name as tenant_name, t.slug as tenant_slug
         FROM tenant_invitations ti
         JOIN tenants t ON t.id = ti.tenant_id
         WHERE ti.token = $1`,
        [token]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Invitation not found' });
      }

      const invitation = result.rows[0];

      if (invitation.status !== 'pending') {
        return res.status(400).json({ error: `Invitation has been ${invitation.status}` });
      }

      if (new Date(invitation.expires_at) < new Date()) {
        return res.status(400).json({ error: 'Invitation has expired' });
      }

      return res.status(200).json({
        invitation: {
          email: invitation.email,
          role: invitation.role_id,
          tenantName: invitation.tenant_name,
          tenantSlug: invitation.tenant_slug,
          expiresAt: invitation.expires_at
        }
      });
    } catch (error) {
      console.error('[Invite API] Error:', error);
      return res.status(500).json({ error: 'Failed to fetch invitation' });
    }
  }

  // POST - Accept invitation
  if (req.method === 'POST') {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user) {
      return res.status(401).json({ error: 'You must be signed in to accept an invitation' });
    }

    const user = session.user as any;

    try {
      // Get invitation
      const inviteResult = await pool.query(
        `SELECT ti.*, t.id as tenant_uuid
         FROM tenant_invitations ti
         JOIN tenants t ON t.id = ti.tenant_id
         WHERE ti.token = $1`,
        [token]
      );

      if (inviteResult.rows.length === 0) {
        return res.status(404).json({ error: 'Invitation not found' });
      }

      const invitation = inviteResult.rows[0];

      if (invitation.status !== 'pending') {
        return res.status(400).json({ error: `Invitation has been ${invitation.status}` });
      }

      if (new Date(invitation.expires_at) < new Date()) {
        return res.status(400).json({ error: 'Invitation has expired' });
      }

      // Verify email matches (optional - can be relaxed)
      if (invitation.email.toLowerCase() !== user.email?.toLowerCase()) {
        return res.status(403).json({ 
          error: 'This invitation was sent to a different email address',
          invitedEmail: invitation.email
        });
      }

      // Check if already a member
      const existingMember = await pool.query(
        `SELECT id FROM tenant_memberships 
         WHERE tenant_id = $1 AND user_id = $2`,
        [invitation.tenant_id, user.id]
      );

      if (existingMember.rows.length > 0) {
        // Update invitation status anyway
        await pool.query(
          `UPDATE tenant_invitations SET status = 'accepted', accepted_at = NOW() WHERE id = $1`,
          [invitation.id]
        );
        return res.status(200).json({ 
          message: 'You are already a member of this workspace',
          alreadyMember: true
        });
      }

      // Add user to tenant
      await pool.query(
        `INSERT INTO tenant_memberships (tenant_id, user_id, role_id, status, invited_by, accepted_at)
         VALUES ($1, $2, $3, 'active', $4, NOW())`,
        [invitation.tenant_id, user.id, invitation.role_id, invitation.invited_by]
      );

      // Update invitation status
      await pool.query(
        `UPDATE tenant_invitations 
         SET status = 'accepted', accepted_at = NOW(), accepted_by = $2
         WHERE id = $1`,
        [invitation.id, user.id]
      );

      return res.status(200).json({ 
        success: true,
        tenantSlug: invitation.tenant_slug
      });
    } catch (error) {
      console.error('[Invite API] Error:', error);
      return res.status(500).json({ error: 'Failed to accept invitation' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
