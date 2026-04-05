import type { NextApiRequest, NextApiResponse } from 'next';

const FAMILY_HUB_URL = process.env.FAMILY_HUB_URL || 'http://localhost:18820';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { member_id, latitude, longitude, battery_level, device_type } = req.body;

  if (!member_id || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const response = await fetch(`${FAMILY_HUB_URL}/locations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        member_id,
        device_id: `ios-${member_id}`,
        device_type: device_type || 'iphone',
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        battery_level: battery_level ? parseInt(battery_level) : null,
        accuracy: 10,
        timestamp: new Date().toISOString(),
        source: 'dashboard_api',
      }),
    });

    if (!response.ok) {
      throw new Error(`Family Hub error: ${response.status}`);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('[Family Hub Update Error]:', error);
    return res.status(500).json({ error: 'Failed to update location' });
  }
}
