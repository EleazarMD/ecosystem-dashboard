/**
 * User Dashboard Widgets Configuration API
 * Returns widget configuration for the current user
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

    // Default widget configuration - all enabled
    const widgets = [
      { id: 'personal-activity', enabled: true, position: 1 },
      { id: 'children-activity', enabled: true, position: 2 },
      { id: 'quick-access', enabled: true, position: 3 },
      { id: 'health-data', enabled: true, position: 4 },
      { id: 'email-metrics', enabled: true, position: 5 },
    ];

    return res.status(200).json({
      requestId: `widgets-${Date.now()}`,
      timestamp: new Date().toISOString(),
      widgets,
    });
  } catch (error) {
    console.error('Error fetching widget config:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
