/**
 * Tesla Vehicle Data Endpoint
 * 
 * GET /api/tesla/vehicles/[vin]/data
 * Returns full telemetry for a specific vehicle via Tesla Relay service (port 18810)
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
    const response = await fetch(`${TESLA_RELAY_URL}/vehicles/${vin}/data`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Tesla Relay] Vehicle data error:', response.status, errorText);
      return res.status(response.status).json({ error: 'Tesla Relay error' });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error: any) {
    console.error('[Tesla Vehicle Data] Error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch vehicle data from Tesla Relay' });
  }
}
