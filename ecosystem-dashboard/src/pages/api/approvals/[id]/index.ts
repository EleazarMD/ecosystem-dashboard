/**
 * Single Approval API
 * GET /api/approvals/[id] - Get approval details
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import ApprovalService from '@/services/ApprovalService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid approval ID' });
  }

  try {
    if (req.method === 'GET') {
      const approval = await ApprovalService.getApproval(id);
      
      if (!approval) {
        return res.status(404).json({ error: 'Approval not found' });
      }
      
      return res.status(200).json({
        approval: {
          ...approval,
          agent_name: approval.agent?.name || '',
          agentName: approval.agent?.name || '',
        },
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Approval detail API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: (error as Error).message,
    });
  }
}
