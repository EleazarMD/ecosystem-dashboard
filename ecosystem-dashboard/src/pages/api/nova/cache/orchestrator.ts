import type { NextApiRequest, NextApiResponse } from 'next';

const NOVA_API_URL = process.env.NOVA_API_URL || 'http://localhost:18803';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { endpoint } = req.query;
  const path = Array.isArray(endpoint) ? endpoint.join('/') : endpoint || 'status';

  try {
    const url = `${NOVA_API_URL}/orchestrator/${path}`;
    
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (req.method === 'POST' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(url, fetchOptions);
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Nova orchestrator proxy error:', error);
    return res.status(502).json({ error: 'Failed to connect to Nova API' });
  }
}
