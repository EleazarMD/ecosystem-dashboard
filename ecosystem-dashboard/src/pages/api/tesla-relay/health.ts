/**
 * Tesla Relay Proxy - Health Check
 * 
 * Proxies health check to Tesla Relay Service (port 18810)
 */
import type { NextApiRequest, NextApiResponse } from 'next';

const TESLA_RELAY_URL = process.env.TESLA_RELAY_URL || 'http://localhost:18810';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch(`${TESLA_RELAY_URL}/health`);
    const data = await response.json();
    return res.status(200).json(data);

  } catch (error: any) {
    console.error('[Tesla Relay Proxy] Health check error:', error.message);
    return res.status(503).json({ 
      status: 'unavailable',
      error: 'Tesla Relay Service not reachable'
    });
  }
}
