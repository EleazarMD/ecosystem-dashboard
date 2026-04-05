/**
 * Health Integration Summary API
 * Returns health and fitness data from connected integrations
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Mock health data - in production, this would query Apple Health API or similar
    const connected = Math.random() > 0.5; // 50% chance of being connected for testing

    if (!connected) {
      return res.status(200).json({
        requestId: `health-${Date.now()}`,
        timestamp: new Date().toISOString(),
        connected: false,
        data: null,
      });
    }

    const data = {
      steps: Math.floor(Math.random() * 8000) + 2000,
      stepsGoal: 10000,
      activeMinutes: Math.floor(Math.random() * 40) + 10,
      activeGoal: 30,
      calories: Math.floor(Math.random() * 500) + 200,
      heartRate: Math.floor(Math.random() * 30) + 60,
      workouts: Math.floor(Math.random() * 3),
    };

    return res.status(200).json({
      requestId: `health-${Date.now()}`,
      timestamp: new Date().toISOString(),
      connected: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching health data:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
