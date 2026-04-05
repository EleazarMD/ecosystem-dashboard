/**
 * Single Approval Request API
 * 
 * Approve or deny a parental approval request
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
  const { approvalId } = req.query;

  if (!approvalId || typeof approvalId !== 'string') {
    return res.status(400).json({ error: 'Approval ID is required' });
  }

  // GET - Get approval details
  if (req.method === 'GET') {
    try {
      const result = await pool.query(`
        SELECT 
          ar.id,
          ar.child_user_id as "childUserId",
          ar.parent_user_id as "parentUserId",
          ar.request_type as "requestType",
          ar.request_data as "requestData",
          ar.status,
          ar.responded_at as "respondedAt",
          ar.response_note as "responseNote",
          ar.expires_at as "expiresAt",
          ar.created_at as "createdAt",
          c.name as "childName",
          c.email as "childEmail"
        FROM parental_approval_requests ar
        JOIN users c ON ar.child_user_id = c.id
        WHERE ar.id = $1
      `, [approvalId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Approval request not found' });
      }

      const approval = result.rows[0];

      // Verify user is the parent or platform admin
      if (user.platformRole !== 'platform-admin' && approval.parentUserId !== user.id) {
        return res.status(403).json({ error: 'You do not have permission to view this approval' });
      }

      return res.status(200).json({ approval });

    } catch (error) {
      console.error('[Approval API] Error:', error);
      return res.status(500).json({ error: 'Failed to fetch approval request' });
    }
  }

  // PUT - Approve or deny the request
  if (req.method === 'PUT') {
    const { decision, note } = req.body;

    if (!decision || !['approved', 'denied'].includes(decision)) {
      return res.status(400).json({ error: 'Decision must be "approved" or "denied"' });
    }

    try {
      // Get the approval and verify ownership
      const approvalResult = await pool.query(`
        SELECT parent_user_id as "parentUserId", child_user_id as "childUserId", 
               status, request_type as "requestType", request_data as "requestData"
        FROM parental_approval_requests
        WHERE id = $1
      `, [approvalId]);

      if (approvalResult.rows.length === 0) {
        return res.status(404).json({ error: 'Approval request not found' });
      }

      const approval = approvalResult.rows[0];

      // Verify user is the parent or platform admin
      if (user.platformRole !== 'platform-admin' && approval.parentUserId !== user.id) {
        return res.status(403).json({ error: 'You do not have permission to respond to this approval' });
      }

      // Check if already responded
      if (approval.status !== 'pending') {
        return res.status(400).json({ error: `This request has already been ${approval.status}` });
      }

      // Update the approval
      await pool.query(`
        UPDATE parental_approval_requests
        SET status = $1, responded_at = NOW(), response_note = $2
        WHERE id = $3
      `, [decision, note || null, approvalId]);

      // Log the decision
      await pool.query(`
        INSERT INTO child_activity_log (child_user_id, activity_type, metadata)
        VALUES ($1, 'approval_response', $2)
      `, [approval.childUserId, JSON.stringify({
        approvalId,
        requestType: approval.requestType,
        decision,
        respondedBy: user.id,
      })]);

      // If approved, take action based on request type
      if (decision === 'approved') {
        await handleApprovedRequest(approval.childUserId, approval.requestType, approval.requestData);
      }

      return res.status(200).json({
        success: true,
        message: `Request ${decision}`,
        decision,
      });

    } catch (error) {
      console.error('[Approval API] Error:', error);
      return res.status(500).json({ error: 'Failed to process approval' });
    }
  }

  // DELETE - Cancel/withdraw an approval request
  if (req.method === 'DELETE') {
    try {
      const result = await pool.query(`
        DELETE FROM parental_approval_requests
        WHERE id = $1 AND status = 'pending'
        RETURNING id
      `, [approvalId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Pending approval request not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'Approval request cancelled',
      });

    } catch (error) {
      console.error('[Approval API] Error:', error);
      return res.status(500).json({ error: 'Failed to cancel approval request' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleApprovedRequest(
  childUserId: string,
  requestType: string,
  requestData: any
): Promise<void> {
  switch (requestType) {
    case 'service_access':
      // Add service to allowed list
      if (requestData.serviceId) {
        await pool.query(`
          UPDATE parental_controls_config
          SET allowed_services = allowed_services || $1::jsonb,
              updated_at = NOW()
          WHERE child_user_id = $2
        `, [JSON.stringify([requestData.serviceId]), childUserId]);
      }
      break;

    case 'settings_change':
      // Apply the requested settings change
      if (requestData.setting && requestData.value !== undefined) {
        const fieldMap: Record<string, string> = {
          dailyUsageLimitMinutes: 'daily_usage_limit_minutes',
          allowedHoursEnd: 'allowed_hours_end',
          contentFilterLevel: 'content_filter_level',
        };
        const dbField = fieldMap[requestData.setting];
        if (dbField) {
          await pool.query(`
            UPDATE parental_controls_config
            SET ${dbField} = $1, updated_at = NOW()
            WHERE child_user_id = $2
          `, [requestData.value, childUserId]);
        }
      }
      break;

    case 'image_generation':
    case 'data_export':
    case 'conversation':
      // These are one-time approvals, no persistent change needed
      // The approval record itself serves as the permission
      break;

    default:
      console.log(`[Approval] Unknown request type: ${requestType}`);
  }
}
