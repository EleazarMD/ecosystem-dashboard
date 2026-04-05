/**
 * Email GraphRAG Approval Status API
 * GET /api/email-graphrag/approval-status - Check status of submitted approvals
 * POST /api/email-graphrag/approval-status - Check status of multiple approvals
 * 
 * Allows the Email GraphRAG service to poll for approval decisions
 * so it can proceed with sending emails or persisting knowledge graph data.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import ApprovalService from '@/services/ApprovalService';

interface ApprovalStatusResult {
  approval_id: string;
  status: string;
  reviewed_at?: string;
  reviewed_by?: string;
  rejection_reason?: string;
  execution_result?: {
    success: boolean;
    message?: string;
    data?: any;
    error?: string;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const userId = (session.user as any).id;

  try {
    // GET: Single approval status
    if (req.method === 'GET') {
      const { approval_id, approval_ids } = req.query;

      // Handle comma-separated IDs in query string
      if (approval_ids && typeof approval_ids === 'string') {
        const ids = approval_ids.split(',').map(id => id.trim()).filter(Boolean);
        const results = getMultipleStatuses(ids);
        
        return res.status(200).json({
          success: true,
          count: results.length,
          results,
        });
      }

      if (!approval_id || typeof approval_id !== 'string') {
        return res.status(400).json({
          error: 'Missing approval_id query parameter',
        });
      }

      const approval = ApprovalService.getApproval(approval_id);
      
      if (!approval) {
        return res.status(404).json({
          error: 'Approval not found',
          approval_id,
        });
      }

      return res.status(200).json({
        success: true,
        approval_id: approval.id,
        status: approval.status,
        action_type: approval.action_type,
        title: approval.title,
        created_at: approval.created_at,
        expires_at: approval.expires_at,
        reviewed_at: approval.reviewed_at,
        reviewed_by: approval.reviewed_by,
        rejection_reason: approval.rejection_reason,
        execution_result: approval.execution_result,
        // Include payload summary for reference
        payload_summary: {
          type: approval.action_type.split('_')[0], // email, calendar, knowledge
        },
      });
    }

    // POST: Batch status check
    if (req.method === 'POST') {
      const { approval_ids } = req.body;

      if (!approval_ids || !Array.isArray(approval_ids)) {
        return res.status(400).json({
          error: 'Missing or invalid approval_ids array',
        });
      }

      const results = getMultipleStatuses(approval_ids);

      // Categorize results
      const pending = results.filter(r => r.status === 'pending');
      const approved = results.filter(r => r.status === 'approved' || r.status === 'executed');
      const rejected = results.filter(r => r.status === 'rejected');
      const expired = results.filter(r => r.status === 'expired');
      const notFound = approval_ids.filter(id => !results.find(r => r.approval_id === id));

      return res.status(200).json({
        success: true,
        summary: {
          total: approval_ids.length,
          pending: pending.length,
          approved: approved.length,
          rejected: rejected.length,
          expired: expired.length,
          not_found: notFound.length,
        },
        results,
        not_found_ids: notFound,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('[Email GraphRAG Approval Status] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: (error as Error).message,
    });
  }
}

function getMultipleStatuses(approvalIds: string[]): ApprovalStatusResult[] {
  const results: ApprovalStatusResult[] = [];

  for (const id of approvalIds) {
    const approval = ApprovalService.getApproval(id);
    
    if (approval) {
      results.push({
        approval_id: approval.id,
        status: approval.status,
        reviewed_at: approval.reviewed_at,
        reviewed_by: approval.reviewed_by,
        rejection_reason: approval.rejection_reason,
        execution_result: approval.execution_result,
      });
    }
  }

  return results;
}
