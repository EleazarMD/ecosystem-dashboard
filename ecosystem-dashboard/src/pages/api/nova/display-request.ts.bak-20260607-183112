/**
 * /api/nova/display-request
 *
 * POST — create a nova_conversation_display approval request (Tesla has no session cookie)
 * GET  — poll status of an existing approval by ?id=<approvalId>
 *
 * Both handlers run server-side and bypass the NextAuth session requirement that
 * blocks the Tesla browser from calling /api/approvals directly.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import ApprovalService from '@/services/ApprovalService';

const CANONICAL_USER_ID =
  process.env.ADMIN_USER_ID || 'dfd9379f-a9cd-4241-99e7-140f5e89e3cd';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ── GET: poll an existing approval ──────────────────────────────────────
  if (req.method === 'GET') {
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Missing ?id param' });
    }
    try {
      const approval = await ApprovalService.getApproval(id);
      if (!approval) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json({ approval });
    } catch (error) {
      console.error('[Nova/display-request] getApproval error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ── POST: create a new approval request ─────────────────────────────────
  if (req.method === 'POST') {
    try {
      const { user_id, vehicle } = req.body ?? {};
      const userId = user_id || CANONICAL_USER_ID;

      const approval = await ApprovalService.createApprovalRequest({
        actionType: 'nova_conversation_display',
        agent: 'nova',
        userId,
        title: 'Vehicle Screen — Display Nova Conversation',
        payload: { user_id: userId, vehicle: vehicle ?? 'Tesla' } as any,
        aiReasoning:
          'A display device in the vehicle is requesting access to view the active Nova conversation. Approve only if you are the driver and no one else should see this session.',
        aiConfidence: 1.0,
        context: {
          source: 'tesla_dashboard',
          requested_at: new Date().toISOString(),
        },
      });

      if (approval.status === 'executed' || approval.status === 'approved') {
        return res.status(201).json({ approval, auto_approved: true });
      }
      return res.status(202).json({ approval, message: 'Awaiting approval on iPhone' });
    } catch (error) {
      console.error('[Nova/display-request] createApprovalRequest error:', error);
      return res.status(500).json({ error: 'Internal server error', message: (error as Error).message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
