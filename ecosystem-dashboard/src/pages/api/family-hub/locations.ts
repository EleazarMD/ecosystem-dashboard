import type { NextApiRequest, NextApiResponse } from 'next';

const FAMILY_HUB_URL = process.env.FAMILY_HUB_URL || 'http://localhost:18820';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const response = await fetch(`${FAMILY_HUB_URL}/dashboard/locations`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Family Hub error: ${response.status}`);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('[Family Hub API Error]:', error);
    
    // Return mock data if Family Hub is not available
    return res.status(200).json({
      locations: [
        {
          id: 'eleazar',
          name: 'Eleazar',
          emoji: '👨‍💻',
          color: '#3B82F6',
          latitude: 29.7604,
          longitude: -95.3698,
          accuracy: 10,
          battery_level: 85,
          status: 'home',
          status_message: null,
          eta_home: 0,
          last_updated: new Date().toISOString(),
          is_home: true,
        },
        {
          id: 'wife',
          name: 'Wife',
          emoji: '👩‍⚕️',
          color: '#EC4899',
          latitude: 29.755,
          longitude: -95.365,
          accuracy: 15,
          battery_level: 72,
          status: 'work',
          status_message: 'In meetings until 5pm',
          eta_home: 45,
          last_updated: new Date().toISOString(),
          is_home: false,
        },
        {
          id: 'kid1',
          name: 'Kid 1',
          emoji: '🧒',
          color: '#10B981',
          latitude: 29.758,
          longitude: -95.36,
          accuracy: 20,
          battery_level: 45,
          status: 'school',
          status_message: null,
          eta_home: 120,
          last_updated: new Date().toISOString(),
          is_home: false,
        },
        {
          id: 'kid2',
          name: 'Kid 2',
          emoji: '👧',
          color: '#F59E0B',
          latitude: 29.758,
          longitude: -95.36,
          accuracy: 20,
          battery_level: 62,
          status: 'school',
          status_message: null,
          eta_home: 120,
          last_updated: new Date().toISOString(),
          is_home: false,
        },
      ],
      updated_at: new Date().toISOString(),
      source: 'mock',
      error: 'Family Hub not connected',
    });
  }
}
