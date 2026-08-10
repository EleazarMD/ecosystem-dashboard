import { NextApiRequest, NextApiResponse } from 'next';
import { getRecentInsights, KNOWN_USERS } from '../../../lib/pcg-client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = (req.query.userId as string) || KNOWN_USERS[0].id;

  try {
    const insights = await getRecentInsights(50, userId);
    const pending = insights.filter((i: any) => i.status === 'pending');

    res.status(200).json({
      queue: pending,
      count: pending.length,
    });
  } catch (error: any) {
    console.error('[ide-memory/approval-queue] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
}
