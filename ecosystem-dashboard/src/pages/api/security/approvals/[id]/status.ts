/**
 * API endpoint to check approval status
 * 
 * GET /api/security/approvals/[id]/status
 * 
 * Used by agents to poll for approval decisions
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { 
  authenticateRequest, 
  authenticateRequestOptional,
  AuthError 
} from '@/lib/auth/server-auth';

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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Approval ID is required' });
  }

  try {
    // Authenticate - can be called by agents with JWT
    let userId: string | undefined;
    
    try {
      const user = authenticateRequest(req.headers.authorization);
      userId = user.userId;
    } catch (error) {
      if (error instanceof AuthError) {
        return res.status(error.statusCode).json({ 
          error: error.message,
          code: error.code,
        });
      }
      throw error;
    }

    // Get the approval request (using actual database schema)
    const result = await pool.query(
      `SELECT 
        id, user_id, agent_id, action_type, risk_level, 
        status, created_at, expires_at, reviewed_at
       FROM approval_requests 
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Approval request not found' });
    }

    const approval = result.rows[0];

    // Verify user owns this approval
    if (approval.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to view this approval' });
    }

    // Check if expired but not yet marked
    if (approval.status === 'pending' && new Date(approval.expires_at) < new Date()) {
      // Mark as expired
      await pool.query(
        `UPDATE approval_requests SET status = 'expired', reviewed_at = NOW() WHERE id = $1`,
        [id]
      );
      approval.status = 'expired';
      approval.reviewed_at = new Date();
    }

    return res.json({
      id: approval.id,
      status: approval.status,
      toolName: approval.action_type,
      riskLevel: approval.risk_level,
      createdAt: approval.created_at,
      expiresAt: approval.expires_at,
      decidedAt: approval.reviewed_at,
    });

  } catch (error) {
    console.error('[Approvals] Error checking status:', error);
    return res.status(500).json({ error: 'Failed to check approval status' });
  }
}
