import type { NextApiRequest, NextApiResponse } from 'next';

const NOVA_API_URL = process.env.NOVA_API_URL || 'http://localhost:18803';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch(`${NOVA_API_URL}/cache/stats`);
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Nova cache stats proxy error:', error);
    return res.status(502).json({ error: 'Failed to connect to Nova API' });
  }
}
