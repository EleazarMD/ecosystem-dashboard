import type { NextApiRequest, NextApiResponse } from 'next';
import { deleteResearchSession } from '@/lib/db/research-storage';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const sessionId = Array.isArray(id) ? id[0] : id;

  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  try {
    const deleted = await deleteResearchSession(sessionId);

    if (!deleted) {
      return res.status(404).json({ error: 'Session not found' });
    }

    return res.status(200).json({ success: true, sessionId });
  } catch (error) {
    console.error('[Delete Session] Error:', error);
    return res.status(500).json({ error: 'Failed to delete session' });
  }
}
