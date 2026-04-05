/**
 * API endpoint for managing approval requests
 * 
 * GET /api/security/approvals - List pending approvals for current user
 * POST /api/security/approvals - Create a new approval request (internal use)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  database: process.env.DATABASE_NAME || 'ecosystem_unified',
  user: process.env.DATABASE_USER || 'eleazar',
  password: process.env.DATABASE_PASSWORD || '',
});

interface ApprovalRequest {
  id: string;
  user_id: string;
  agent_id: string;
  session_id?: string;
  tool_name: string;
  arguments: Record<string, unknown>;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  context?: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  created_at: string;
  expires_at: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Get session from NextAuth
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const userId = session.user.id;

  if (req.method === 'GET') {
    return handleGetApprovals(req, res, userId);
  }

  if (req.method === 'POST') {
    return handleCreateApproval(req, res, userId);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleGetApprovals(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    const { status = 'pending', limit = '50', offset = '0' } = req.query;

    const result = await pool.query(
      `SELECT 
        id, user_id, agent_id, session_id, tool_name, 
        arguments, risk_level, context, status,
        created_at, expires_at, decided_at, decision_reason
       FROM approval_requests
       WHERE user_id = $1 
         AND ($2::text IS NULL OR status = $2)
         AND (status != 'pending' OR expires_at > NOW())
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [userId, status === 'all' ? null : status, parseInt(limit as string, 10), parseInt(offset as string, 10)]
    );

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM approval_requests
       WHERE user_id = $1 
         AND ($2::text IS NULL OR status = $2)
         AND (status != 'pending' OR expires_at > NOW())`,
      [userId, status === 'all' ? null : status]
    );

    const approvals = result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      agentId: row.agent_id,
      sessionId: row.session_id,
      toolName: row.tool_name,
      arguments: row.arguments,
      riskLevel: row.risk_level,
      context: row.context,
      status: row.status,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      decidedAt: row.decided_at,
      decisionReason: row.decision_reason,
    }));

    return res.json({
      approvals,
      total: parseInt(countResult.rows[0].count, 10),
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    });
  } catch (error) {
    console.error('[Approvals] Error fetching approvals:', error);
    return res.status(500).json({ error: 'Failed to fetch approvals' });
  }
}

async function handleCreateApproval(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    const {
      agentId,
      sessionId,
      toolName,
      arguments: toolArgs,
      riskLevel = 'medium',
      context,
      expiresInMinutes = 15,
    } = req.body;

    if (!agentId || !toolName) {
      return res.status(400).json({ error: 'agentId and toolName are required' });
    }

    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    const result = await pool.query(
      `INSERT INTO approval_requests 
       (user_id, agent_id, session_id, tool_name, arguments, risk_level, context, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, created_at`,
      [userId, agentId, sessionId, toolName, JSON.stringify(toolArgs || {}), riskLevel, context, expiresAt]
    );

    const approval = result.rows[0];

    // Log the approval request
    await pool.query(
      `INSERT INTO security_audit_log 
       (event_type, severity, user_id, agent_id, session_id, action, outcome, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        'approval_request',
        'info',
        userId,
        agentId,
        sessionId,
        `approval:requested:${toolName}`,
        'success',
        JSON.stringify({ approvalId: approval.id, riskLevel, toolName }),
      ]
    );

    return res.status(201).json({
      id: approval.id,
      createdAt: approval.created_at,
      expiresAt,
      status: 'pending',
    });
  } catch (error) {
    console.error('[Approvals] Error creating approval:', error);
    return res.status(500).json({ error: 'Failed to create approval request' });
  }
}
