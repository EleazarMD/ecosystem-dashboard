/**
 * Approvals API
 * GET /api/approvals - List pending approvals
 * POST /api/approvals - Create a new approval request (for agents)
 * 
 * Authentication:
 * - NextAuth session (web dashboard)
 * - X-API-Key header (mobile apps like GooseMind iOS)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import ApprovalService from '@/services/ApprovalService';
import { getMobileOrSessionUserId } from '@/lib/mobile-auth';
import type { ApprovalActionType, ApprovalPayload, AgentSource } from '@/types/approval';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  
  // Support both session auth (web) and API key auth (mobile)
  const userId = getMobileOrSessionUserId(session?.user?.id, req);
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (req.method === 'GET') {
      const { status, page = '1', per_page = '20' } = req.query;
      
      // Now async - uses PostgreSQL
      let approvals = await ApprovalService.getPendingApprovals(userId);
      
      // Filter by status if provided
      if (status && status !== 'pending') {
        // getPendingApprovals only returns pending, would need to extend for other statuses
      }
      
      // Pagination
      const pageNum = parseInt(page as string, 10);
      const perPage = parseInt(per_page as string, 10);
      const startIndex = (pageNum - 1) * perPage;
      const paginatedApprovals = approvals.slice(startIndex, startIndex + perPage);
      
      return res.status(200).json({
        approvals: paginatedApprovals,
        total: approvals.length,
        page: pageNum,
        per_page: perPage,
        has_more: startIndex + perPage < approvals.length,
      });
    }

    if (req.method === 'POST') {
      // Create a new approval request (called by AI agents)
      const {
        action_type,
        payload,
        agent,
        title,
        ai_reasoning,
        ai_confidence,
        context,
      } = req.body;

      if (!action_type || !payload || !agent) {
        return res.status(400).json({
          error: 'action_type, payload, and agent are required',
        });
      }

      const approval = await ApprovalService.createApprovalRequest({
        actionType: action_type as ApprovalActionType,
        payload: payload as ApprovalPayload,
        agent: agent as AgentSource,
        userId,
        title,
        aiReasoning: ai_reasoning,
        aiConfidence: ai_confidence,
        context,
      });

      // Check if auto-approved
      if (approval.status === 'executed') {
        return res.status(201).json({
          approval,
          message: 'Action auto-approved and executed',
        });
      }

      return res.status(202).json({
        approval,
        message: 'Approval request created, awaiting review',
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Approvals API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: (error as Error).message,
    });
  }
}
