/**
 * Batch Approvals API
 * POST /api/approvals/batch - Batch approve or reject actions
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import ApprovalService from '@/services/ApprovalService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const userId = (session.user as any).id;

  try {
    const device = req.headers['user-agent'] || 'unknown';
    const { ids, action, reason } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'action must be "approve" or "reject"' });
    }

    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const id of ids) {
      try {
        if (action === 'approve') {
          const approval = await ApprovalService.approveApproval(id, userId, device as string);
          results.push({ id, success: !!approval });
        } else {
          const approval = await ApprovalService.rejectApproval(id, userId, reason, device as string);
          results.push({ id, success: !!approval });
        }
      } catch (err) {
        results.push({ id, success: false, error: (err as Error).message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return res.status(200).json({
      success: failCount === 0,
      results,
      summary: {
        total: ids.length,
        succeeded: successCount,
        failed: failCount,
      },
      message: `${action === 'approve' ? 'Approved' : 'Rejected'} ${successCount} of ${ids.length} actions`,
    });

  } catch (error) {
    console.error('Batch approvals API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: (error as Error).message,
    });
  }
}
