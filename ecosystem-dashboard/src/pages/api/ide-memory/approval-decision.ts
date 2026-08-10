import { NextApiRequest, NextApiResponse } from 'next';
import { KNOWN_USERS } from '../../../lib/pcg-client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { insight_id, decision, user_id } = req.body;

  if (!insight_id || !decision) {
    return res.status(400).json({
      error: 'Missing required fields: insight_id, decision',
    });
  }

  const userId = user_id || KNOWN_USERS[0].id;

  // PCG does not yet expose a PATCH /insights/{id}/status endpoint.
  // Log the decision for now so it is not lost.
  console.log('[ide-memory/approval-decision] Recorded decision:', {
    insight_id,
    decision,
    user_id: userId,
    timestamp: new Date().toISOString(),
  });

  res.status(200).json({
    status: 'recorded',
    insight_id,
    decision,
    timestamp: new Date().toISOString(),
  });
}
