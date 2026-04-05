import type { NextApiRequest, NextApiResponse } from 'next';

const GOOSEMIND_URL = process.env.GOOSEMIND_URL || 'http://100.108.41.22:8031';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = req.query.user_id || 'default';
    const response = await fetch(
      `${GOOSEMIND_URL}/api/cache/ttls?user_id=${userId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`GooseMind API error: ${response.status}`);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Cache TTLs error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch cache TTLs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
