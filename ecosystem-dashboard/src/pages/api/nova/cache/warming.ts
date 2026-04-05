import type { NextApiRequest, NextApiResponse } from 'next';

const NOVA_API_URL = process.env.NOVA_API_URL || 'http://localhost:18803';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { endpoint } = req.query;
  const path = Array.isArray(endpoint) ? endpoint.join('/') : endpoint || 'status';

  try {
    const url = new URL(`${NOVA_API_URL}/warming/${path}`);
    // Forward query params
    Object.entries(req.query).forEach(([key, value]) => {
      if (key !== 'endpoint' && typeof value === 'string') {
        url.searchParams.set(key, value);
      }
    });

    const response = await fetch(url.toString());
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Nova warming proxy error:', error);
    return res.status(502).json({ error: 'Failed to connect to Nova API' });
  }
}
