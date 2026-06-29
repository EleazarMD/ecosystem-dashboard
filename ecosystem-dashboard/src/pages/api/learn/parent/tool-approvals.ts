/**
 * Tool Approval API — parent-facing endpoint for approving/denying
 * sensitive agent tool requests (e.g. draw_image).
 *
 * GET   /api/learn/parent/tool-approvals          → list pending approvals for a child
 * POST  /api/learn/parent/tool-approvals/decide   → approve or deny a request
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';

import { authOptions } from '../../auth/[...nextauth]';
import { getToolApprovalService } from '@/domains/learning/parent/tool-approval-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const parentId = (session.user as { id?: string }).id || session.user.email || 'unknown';

  if (req.method === 'GET') {
    const childId = (req.query.childId as string || '').trim();
    if (!childId) {
      return res.status(400).json({ error: 'childId is required' });
    }

    const pending = getToolApprovalService().getPendingForChild(childId);
    return res.status(200).json({ pending });
  }

  if (req.method === 'POST') {
    const { requestId, status } = req.body;

    if (!requestId || !['approved', 'denied'].includes(status)) {
      return res.status(400).json({
        error: 'requestId and status (approved|denied) are required',
      });
    }

    const result = getToolApprovalService().decide({
      requestId,
      status,
      decidedBy: parentId,
    });

    if (!result) {
      return res.status(404).json({ error: 'Approval request not found' });
    }

    return res.status(200).json(result);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}
