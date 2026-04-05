/**
 * Child Approval Check API
 * 
 * Checks if a child has a valid (non-expired) approval for a specific request type.
 * This enables time-based approval persistence across sessions.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { requestType } = req.query;

    if (!requestType || typeof requestType !== 'string') {
      return res.status(400).json({ error: 'Request type is required' });
    }

    // Verify this is a child account
    const userResult = await pool.query(`
      SELECT account_type FROM users WHERE id = $1
    `, [user.id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userResult.rows[0].account_type !== 'child') {
      // Non-child accounts don't need approval
      return res.status(200).json({
        hasApproval: true,
        isChildAccount: false,
        message: 'Approval not required for this account type',
      });
    }

    // Check for existing APPROVED request of this type that hasn't expired
    const approvedResult = await pool.query(`
      SELECT 
        id,
        expires_at,
        responded_at,
        response_note
      FROM parental_approval_requests
      WHERE child_user_id = $1 
        AND request_type = $2 
        AND status = 'approved'
        AND expires_at > NOW()
      ORDER BY responded_at DESC
      LIMIT 1
    `, [user.id, requestType]);

    if (approvedResult.rows.length > 0) {
      const approval = approvedResult.rows[0];
      return res.status(200).json({
        hasApproval: true,
        isChildAccount: true,
        approvalId: approval.id,
        expiresAt: approval.expires_at,
        respondedAt: approval.responded_at,
        responseNote: approval.response_note,
        message: 'You have approval for this activity!',
      });
    }

    // Check for pending request
    const pendingResult = await pool.query(`
      SELECT id, created_at, expires_at
      FROM parental_approval_requests
      WHERE child_user_id = $1 
        AND request_type = $2 
        AND status = 'pending'
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `, [user.id, requestType]);

    if (pendingResult.rows.length > 0) {
      const pending = pendingResult.rows[0];
      return res.status(200).json({
        hasApproval: false,
        hasPendingRequest: true,
        isChildAccount: true,
        pendingRequestId: pending.id,
        requestedAt: pending.created_at,
        expiresAt: pending.expires_at,
        message: 'Waiting for parent approval...',
      });
    }

    // No approval and no pending request
    return res.status(200).json({
      hasApproval: false,
      hasPendingRequest: false,
      isChildAccount: true,
      message: 'Approval required for this activity',
    });

  } catch (error) {
    console.error('[Child Approval Check API] Error:', error);
    return res.status(500).json({ error: 'Failed to check approval status' });
  }
}
