/**
 * User Activity Summary API
 * Returns personal activity metrics for the current user
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Mock activity data - in production, this would query actual activity logs
    const data = {
      chatMessages: Math.floor(Math.random() * 50) + 10,
      emailsProcessed: Math.floor(Math.random() * 30) + 5,
      workspacePages: Math.floor(Math.random() * 20) + 3,
      totalMinutesActive: Math.floor(Math.random() * 180) + 30,
    };

    return res.status(200).json({
      requestId: `activity-${Date.now()}`,
      timestamp: new Date().toISOString(),
      data,
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
