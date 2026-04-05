/**
 * Reject Action API
 * POST /api/approvals/[id]/reject - Reject an action
 * 
 * Authentication:
 * - NextAuth session (web dashboard)
 * - X-API-Key header (mobile apps like GooseMind iOS)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import ApprovalService from '@/services/ApprovalService';
import { getMobileOrSessionUserId } from '@/lib/mobile-auth';

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
    const { reason } = req.body;
    const device = req.headers['user-agent'] || 'unknown';
    
    const approval = await ApprovalService.rejectApproval(id, userId, reason, device as string);
    
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
      message: 'Action rejected',
    });

  } catch (error) {
    console.error('Reject API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: (error as Error).message,
    });
  }
}
