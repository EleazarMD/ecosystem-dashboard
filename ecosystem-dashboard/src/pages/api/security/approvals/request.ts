/**
 * API endpoint for agents to request approval
 * 
 * POST /api/security/approvals/request
 * 
 * This endpoint is called by agents (OpenClaw, Hermes) when they need
 * user approval for a tool execution.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { 
  authenticateRequest, 
  AuthError,
  logSecurityEvent,
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate the request (agent must have valid JWT)
    let user;
    try {
      user = authenticateRequest(req.headers.authorization);
    } catch (error) {
      if (error instanceof AuthError) {
        return res.status(error.statusCode).json({ 
          error: error.message,
          code: error.code,
        });
      }
      throw error;
    }

    const {
      agentId,
      sessionId,
      toolName,
      arguments: toolArgs,
      riskLevel = 'medium',
      context,
      title,
      summary,
      expiresInMinutes = 15,
    } = req.body;

    if (!agentId || !toolName) {
      return res.status(400).json({ error: 'agentId and toolName are required' });
    }

    // Validate risk level
    if (!['low', 'medium', 'high', 'critical'].includes(riskLevel)) {
      return res.status(400).json({ error: 'Invalid riskLevel' });
    }

    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    // Create approval request (using actual database schema)
    const result = await pool.query(
      `INSERT INTO approval_requests 
       (user_id, agent_id, agent_session_id, action_type, payload, risk_level, context, title, summary, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, created_at`,
      [
        user.userId, 
        agentId, 
        sessionId, 
        toolName, 
        JSON.stringify(toolArgs || {}), 
        riskLevel, 
        context,
        title || `${toolName} approval`,
        summary || context,
        expiresAt
      ]
    );

    const approval = result.rows[0];

    // Log the approval request
    await logSecurityEvent({
      eventType: 'approval_request',
      severity: 'info',
      userId: user.userId,
      agentId,
      sessionId,
      action: `approval:requested:${toolName}`,
      resource: approval.id,
      outcome: 'success',
      metadata: { riskLevel, toolName, expiresInMinutes },
      clientIp: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    // Send push notification to user's devices
    try {
      await sendApprovalPushNotification(user.userId, approval.id, toolName, riskLevel, agentId);
    } catch (pushError) {
      console.error('[Approvals] Failed to send push notification:', pushError);
      // Don't fail the request if push fails
    }

    return res.status(201).json({
      id: approval.id,
      createdAt: approval.created_at,
      expiresAt,
      status: 'pending',
      pollUrl: `/api/security/approvals/${approval.id}/status`,
    });

  } catch (error) {
    console.error('[Approvals] Error creating approval request:', error);
    return res.status(500).json({ error: 'Failed to create approval request' });
  }
}

/**
 * Send push notification for approval request
 */
async function sendApprovalPushNotification(
  userId: string,
  approvalId: string,
  toolName: string,
  riskLevel: string,
  agentId: string
): Promise<void> {
  // Get user's registered devices
  const devicesResult = await pool.query(
    `SELECT device_token, platform FROM user_devices WHERE user_id = $1`,
    [userId]
  );

  if (devicesResult.rows.length === 0) {
    console.log('[Approvals] No devices registered for user:', userId);
    return;
  }

  // In production, this would send actual push notifications
  // For now, just log that we would send them
  console.log(`[Approvals] Would send push to ${devicesResult.rows.length} devices:`, {
    userId,
    approvalId,
    toolName,
    riskLevel,
    agentId,
  });

  // TODO: Integrate with actual push notification service
  // await pushService.sendApprovalNotification(userId, approvalId, toolName, riskLevel, agentId);
}
