/**
 * Approval Settings API
 * GET /api/approvals/settings - Get user approval settings
 * PUT /api/approvals/settings - Update user approval settings
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
  const session = await getServerSession(req, res, authOptions);
  
  // Support both session auth (web) and API key auth (mobile)
  const userId = getMobileOrSessionUserId(session?.user?.id, req);
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (req.method === 'GET') {
      const settings = await ApprovalService.getSettings(userId);
      return res.status(200).json({ settings });
    }

    if (req.method === 'PUT') {
      const updates = req.body;
      delete updates.user_id; // Don't allow changing user_id via update
      
      const settings = await ApprovalService.updateSettings(userId, updates);
      
      return res.status(200).json({
        success: true,
        settings,
        message: 'Settings updated',
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Approval settings API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: (error as Error).message,
    });
  }
}
