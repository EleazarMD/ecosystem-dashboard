import { NextApiRequest, NextApiResponse } from 'next';
import { getPreferences, KNOWN_USERS } from '../../../lib/pcg-client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { page = 1, limit = 50, search = '', user_id } = req.body;
  const userId = user_id || KNOWN_USERS[0].id;

  try {
    const result = await getPreferences(userId);
    let memories: any[] = Array.isArray(result) ? result : (result?.preferences ?? []);

    // Client-side search filtering
    if (search && search.trim()) {
      const searchTerm = search.toLowerCase().trim();
      memories = memories.filter((m: any) =>
        JSON.stringify(m).toLowerCase().includes(searchTerm)
      );
    }

    const total = memories.length;
    const offset = (page - 1) * limit;
    const paged = memories.slice(offset, offset + limit);

    res.status(200).json({
      memories: paged,
      total,
      page,
      limit,
    });
  } catch (error: any) {
    console.error('[ide-memory/list] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
}
