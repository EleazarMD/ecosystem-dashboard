/**
 * Tesla Relay Proxy - Vehicle Data
 * 
 * Proxies vehicle telemetry requests to Tesla Relay Service (port 18810)
 */
import type { NextApiRequest, NextApiResponse } from 'next';

const TESLA_RELAY_URL = process.env.TESLA_RELAY_URL || 'http://localhost:18810';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { vin } = req.query;

  if (!vin || typeof vin !== 'string') {
    return res.status(400).json({ error: 'VIN required' });
  }

  try {
    const response = await fetch(`${TESLA_RELAY_URL}/vehicles/${vin}/data`);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      return res.status(response.status).json(error);
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error: any) {
    console.error('[Tesla Relay Proxy] Error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch vehicle data from Tesla Relay' });
  }
}
