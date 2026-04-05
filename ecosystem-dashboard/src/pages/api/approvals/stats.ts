/**
 * Approval Stats API
 * GET /api/approvals/stats - Get approval statistics
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import ApprovalService from '@/services/ApprovalService';
import { getMobileOrSessionUserId } from '@/lib/mobile-auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  // Support both session auth (web) and API key auth (mobile)
  const userId = getMobileOrSessionUserId(session?.user?.id, req);
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    
    const stats = await ApprovalService.getApprovalStats(userId);
    
    return res.status(200).json({ stats });

  } catch (error) {
    console.error('Approval stats API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: (error as Error).message,
    });
  }
}
