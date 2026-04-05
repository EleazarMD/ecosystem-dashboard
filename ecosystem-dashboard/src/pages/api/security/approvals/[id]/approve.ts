/**
 * API endpoint to approve a pending approval request
 * 
 * POST /api/security/approvals/[id]/approve
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  database: process.env.DATABASE_NAME || 'ecosystem_unified',
  user: process.env.DATABASE_USER || 'eleazar',
  password: process.env.DATABASE_PASSWORD || '',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const userId = session.user.id;
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Approval ID is required' });
  }

  try {
    // Get the approval request
    const approvalResult = await pool.query(
      `SELECT * FROM approval_requests WHERE id = $1`,
      [id]
    );

    if (approvalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Approval request not found' });
    }

    const approval = approvalResult.rows[0];

    // Verify user owns this approval
    if (approval.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to approve this request' });
    }

    // Check if already processed
    if (approval.status !== 'pending') {
      return res.status(400).json({ 
        error: `Approval already ${approval.status}`,
        status: approval.status,
      });
    }

    // Check if expired
    if (new Date(approval.expires_at) < new Date()) {
      // Mark as expired
      await pool.query(
        `UPDATE approval_requests SET status = 'expired', decided_at = NOW() WHERE id = $1`,
        [id]
      );
      return res.status(400).json({ error: 'Approval request has expired' });
    }

    // Check MFA for critical actions (if configured)
    if (approval.risk_level === 'critical') {
      const { mfaToken } = req.body;
      // TODO: Implement MFA verification
      // For now, we'll skip MFA but log a warning
      console.warn(`[Approvals] Critical approval ${id} approved without MFA`);
    }

    // Approve the request
    await pool.query(
      `UPDATE approval_requests 
       SET status = 'approved', decided_at = NOW(), decided_by = $2
       WHERE id = $1`,
      [id, userId]
    );

    // Log the approval decision
    await pool.query(
      `INSERT INTO security_audit_log 
       (event_type, severity, user_id, agent_id, session_id, action, resource, outcome, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        'approval_decision',
        'info',
        userId,
        approval.agent_id,
        approval.session_id,
        'approval:approved',
        id,
        'success',
        JSON.stringify({ 
          toolName: approval.tool_name, 
          riskLevel: approval.risk_level,
        }),
      ]
    );

    return res.json({
      success: true,
      id,
      status: 'approved',
      decidedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Approvals] Error approving request:', error);
    return res.status(500).json({ error: 'Failed to approve request' });
  }
}
