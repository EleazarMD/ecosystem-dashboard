/**
 * Child Approval Requests API
 * 
 * Integrates child approval requests with the main approval system.
 * Allows parents to view and manage child approval requests alongside
 * other AI agent approvals in the unified approvals dashboard.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Pool } from 'pg';
import { sendApprovalNotification } from '@/lib/platform/child-account-notifications';
import type { ApprovalSummary, ApprovalStatus, ApprovalPriority } from '@/types/approval';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

// Map child request types to approval action types
const REQUEST_TYPE_MAP: Record<string, string> = {
  'conversation': 'child_conversation_access',
  'service_access': 'child_service_access',
  'extended_time': 'child_extended_time',
  'content_unlock': 'child_content_unlock',
  'feature_request': 'child_feature_request',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = session.user as any;

  // GET: Fetch child approval requests for the parent
  if (req.method === 'GET') {
    try {
      const { status, childId, includeExpired } = req.query;
      
      // Build query based on filters
      let query = `
        SELECT 
          par.id,
          par.child_user_id,
          par.parent_user_id,
          par.request_type,
          par.request_data,
          par.status,
          par.created_at,
          par.expires_at,
          par.responded_at,
          par.response_notes,
          c.name as child_name,
          c.email as child_email
        FROM parental_approval_requests par
        JOIN users c ON c.id = par.child_user_id
        WHERE par.parent_user_id = $1
      `;
      
      const params: any[] = [user.id];
      let paramIndex = 2;
      
      if (status && status !== 'all') {
        query += ` AND par.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
      
      if (childId) {
        query += ` AND par.child_user_id = $${paramIndex}`;
        params.push(childId);
        paramIndex++;
      }
      
      if (!includeExpired || includeExpired !== 'true') {
        query += ` AND (par.expires_at > NOW() OR par.status != 'pending')`;
      }
      
      query += ` ORDER BY par.created_at DESC LIMIT 100`;
      
      const result = await pool.query(query, params);
      
      // Transform to ApprovalSummary format for unified display
      const approvals = result.rows.map(row => {
        const requestData = row.request_data || {};
        return {
          id: `child-${row.id}`,
          action_type: REQUEST_TYPE_MAP[row.request_type] || 'child_feature_request',
          status: row.status as ApprovalStatus,
          priority: 'normal' as ApprovalPriority,
          title: requestData.title || `Request from ${row.child_name}`,
          summary: requestData.description || `${row.child_name} is requesting ${row.request_type}`,
          agent_name: row.child_name,
          created_at: row.created_at,
          expires_at: row.expires_at,
          risk_level: 'low' as const,
          // Child-specific metadata
          isChildRequest: true,
          childId: row.child_user_id,
          childName: row.child_name,
          childEmail: row.child_email,
          requestType: row.request_type,
          serviceId: requestData.serviceId,
          details: requestData.details,
          respondedAt: row.responded_at,
          responseNotes: row.response_notes,
        };
      });
      
      // Get counts
      const countsResult = await pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'pending' AND expires_at > NOW()) as pending,
          COUNT(*) FILTER (WHERE status = 'approved') as approved,
          COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
          COUNT(*) FILTER (WHERE status = 'pending' AND expires_at <= NOW()) as expired
        FROM parental_approval_requests
        WHERE parent_user_id = $1
      `, [user.id]);
      
      const counts = countsResult.rows[0];
      
      return res.status(200).json({
        approvals,
        counts: {
          pending: parseInt(counts.pending) || 0,
          approved: parseInt(counts.approved) || 0,
          rejected: parseInt(counts.rejected) || 0,
          expired: parseInt(counts.expired) || 0,
          total: approvals.length,
        },
      });
      
    } catch (error) {
      console.error('[Child Approvals API] Error fetching:', error);
      return res.status(500).json({ error: 'Failed to fetch child approvals' });
    }
  }

  // POST: Respond to a child approval request
  if (req.method === 'POST') {
    try {
      const { approvalId, action, notes, expiresInHours } = req.body;
      
      if (!approvalId || !action) {
        return res.status(400).json({ error: 'Approval ID and action are required' });
      }
      
      // Extract the actual ID (remove 'child-' prefix if present)
      const actualId = approvalId.startsWith('child-') ? approvalId.slice(6) : approvalId;
      
      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'Action must be approve or reject' });
      }
      
      // Verify the request belongs to this parent
      const verifyResult = await pool.query(`
        SELECT id, child_user_id, request_type, status
        FROM parental_approval_requests
        WHERE id = $1 AND parent_user_id = $2
      `, [actualId, user.id]);
      
      if (verifyResult.rows.length === 0) {
        return res.status(404).json({ error: 'Approval request not found' });
      }
      
      const request = verifyResult.rows[0];
      
      if (request.status !== 'pending') {
        return res.status(400).json({ error: 'Request has already been processed' });
      }
      
      // Calculate new expiry for approved requests
      let newExpiresAt: Date | null = null;
      if (action === 'approve') {
        newExpiresAt = new Date();
        newExpiresAt.setHours(newExpiresAt.getHours() + (expiresInHours || 24));
      }
      
      // Update the request
      await pool.query(`
        UPDATE parental_approval_requests
        SET 
          status = $1,
          responded_at = NOW(),
          response_notes = $2,
          expires_at = COALESCE($3, expires_at)
        WHERE id = $4
      `, [
        action === 'approve' ? 'approved' : 'rejected',
        notes || null,
        newExpiresAt,
        actualId,
      ]);
      
      // Get child info for notification
      const childResult = await pool.query(`
        SELECT name FROM users WHERE id = $1
      `, [request.child_user_id]);
      
      const childName = childResult.rows[0]?.name || 'Your child';
      
      // Log the action
      console.log(`[Child Approvals] ${action}d request ${actualId} for ${childName}`);
      
      return res.status(200).json({
        success: true,
        message: `Request ${action}d successfully`,
        approvalId: actualId,
        newStatus: action === 'approve' ? 'approved' : 'rejected',
        expiresAt: newExpiresAt ? newExpiresAt.toISOString() : null,
      });
      
    } catch (error) {
      console.error('[Child Approvals API] Error responding:', error);
      return res.status(500).json({ error: 'Failed to process approval' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
