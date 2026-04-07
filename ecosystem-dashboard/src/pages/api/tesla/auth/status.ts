/**
 * Tesla Connection Status Endpoint
 * 
 * GET /api/tesla/auth/status
 * Returns whether user has valid Tesla tokens via Tesla Relay service (port 18810)
 */
import type { NextApiRequest, NextApiResponse } from 'next';

const TESLA_RELAY_URL = process.env.TESLA_RELAY_URL || 'http://localhost:18810';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = req.query.user_id as string || 'default';

  try {
    const response = await fetch(`${TESLA_RELAY_URL}/auth/status?user_id=${userId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('[Tesla Relay] Status error:', response.status);
      return res.status(200).json({
        connected: false,
        message: 'Tesla Relay unavailable',
        relay_status: 'offline',
      });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error: any) {
    console.error('[Tesla Status] Error:', error.message);
    // Return disconnected status if relay is unavailable
    return res.status(200).json({
      connected: false,
      message: 'Tesla Relay unavailable',
      relay_status: 'offline',
    });
  }
}
