import { NextApiRequest, NextApiResponse } from 'next';
import { getPreferences, KNOWN_USERS } from '../../../lib/pcg-client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = (req.query.userId as string) || KNOWN_USERS[0].id;

  try {
    const result = await getPreferences(userId);
    const memories = Array.isArray(result) ? result : (result?.preferences ?? []);

    res.status(200).json({ memories });
  } catch (error: any) {
    console.error('[ide-memory/memories] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
}
