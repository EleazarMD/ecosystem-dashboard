/**
 * Approve Action API
 * POST /api/approvals/[id]/approve - Approve an action
 * 
 * Authentication:
 * - NextAuth session (web dashboard)
 * - X-API-Key header (mobile apps like GooseMind iOS)
 * 
 * JIT Security:
 * - Verifies user owns the approval
 * - Checks risk-level permissions
 * - Validates trusted client for critical actions
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import ApprovalService from '@/services/ApprovalService';
import { getMobileOrSessionUserId } from '@/lib/mobile-auth';
import { verifyApprovalPermission } from '@/lib/jit-permissions';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid approval ID' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  // Support both session auth (web) and API key auth (mobile)
  const userId = getMobileOrSessionUserId(session?.user?.id, req);
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // JIT Permission Verification
    const verification = await verifyApprovalPermission(userId, id, 'approve', req);
    if (!verification.allowed) {
      return res.status(403).json({ 
        error: 'Permission denied', 
        reason: verification.reason,
        riskLevel: verification.riskLevel,
      });
    }
    
    const device = req.headers['user-agent'] || 'unknown';
    
    const approval = await ApprovalService.approveApproval(id, userId, device as string);
    
    if (!approval) {
      return res.status(404).json({ error: 'Approval not found or already processed' });
    }
    
    return res.status(200).json({
      success: true,
      approval: {
        ...approval,
        agent_name: approval.agent?.name || '',
        agentName: approval.agent?.name || '',
        riskLevel: approval.risk?.level || 'low', // Add flat riskLevel for iOS compatibility
      },
      message: 'Action approved and executed',
    });

  } catch (error) {
    console.error('Approve API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: (error as Error).message,
    });
  }
}
