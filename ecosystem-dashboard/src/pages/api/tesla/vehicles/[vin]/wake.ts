/**
 * Tesla Vehicle Wake Endpoint
 * 
 * POST /api/tesla/vehicles/[vin]/wake
 * Wakes up a vehicle via Tesla Relay service (port 18810)
 */
import type { NextApiRequest, NextApiResponse } from 'next';

const TESLA_RELAY_URL = process.env.TESLA_RELAY_URL || 'http://localhost:18810';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { vin } = req.query;
  if (!vin || typeof vin !== 'string') {
    return res.status(400).json({ error: 'VIN required' });
  }

  try {
    const response = await fetch(`${TESLA_RELAY_URL}/vehicles/${vin}/wake_up`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Tesla Relay] Wake error:', response.status, errorText);
      
      if (response.status === 401) {
        return res.status(401).json({ 
          error: 'Tesla account not connected',
          needs_auth: true,
        });
      }
      
      return res.status(response.status).json({ error: 'Tesla Relay error', details: errorText });
    }

    const data = await response.json();
    console.log(`[Tesla] Wake command sent to ${vin}`);
    
    return res.status(200).json(data);

  } catch (error: any) {
    console.error('[Tesla Wake] Error:', error.message);
    return res.status(500).json({ error: 'Failed to wake vehicle via Tesla Relay' });
  }
}
