/**
 * Hermes Calendar API - Upcoming Events
 * 
 * GET /api/hermes/calendar/upcoming?limit=5
 * Returns upcoming calendar events from Hermes Core
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { generateHermesToken, HERMES_URL } from '../../../../lib/hermes-client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { limit = '5' } = req.query;

  try {
    const token = generateHermesToken();
    const response = await fetch(
      `${HERMES_URL}/v1/calendar/events?limit=${limit}`,
      {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      }
    );

    if (!response.ok) {
      console.error('[Hermes Calendar] Error:', response.status, response.statusText);
      return res.status(response.status).json({ error: 'Failed to fetch calendar events' });
    }

    const data = await response.json();
    
    // Prevent caching - always fetch fresh calendar data
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('[Hermes Calendar] Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
