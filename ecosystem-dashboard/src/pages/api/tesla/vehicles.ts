/**
 * Tesla Vehicles Endpoint
 * 
 * GET /api/tesla/vehicles
 * Returns list of vehicles via Tesla Relay service (port 18810)
 */
import type { NextApiRequest, NextApiResponse } from 'next';

const TESLA_RELAY_URL = process.env.TESLA_RELAY_URL || 'http://localhost:18810';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch(`${TESLA_RELAY_URL}/vehicles`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Tesla Relay] Vehicles error:', response.status, errorText);
      return res.status(response.status).json({ error: 'Tesla Relay error' });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error: any) {
    console.error('[Tesla Vehicles] Error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch vehicles from Tesla Relay' });
  }
}
