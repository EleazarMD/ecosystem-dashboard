import { NextApiRequest, NextApiResponse } from 'next';
import { getContextSummary, KNOWN_USERS } from '../../../lib/pcg-client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const userId = (req.query.userId as string) || KNOWN_USERS[0].id;

  try {
    const ctx = await getContextSummary(userId);

    res.status(200).json({
      preferences: ctx?.preferences ?? [],
      goals: ctx?.goals ?? [],
      observations: ctx?.observations ?? [],
      graphEntities: ctx?.graph_entities ?? ctx?.graphEntities ?? 0,
    });
  } catch (error: any) {
    console.error('[ide-memory/stats] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
}
