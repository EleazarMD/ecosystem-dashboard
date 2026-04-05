/**
 * Active Alerts API
 * Returns active system alerts for administrators
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import prisma from '@/lib/prisma';
import { apiLogger } from '@/lib/api/logger';

const requestId = () => `alerts-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const reqId = requestId();
  const startTime = Date.now();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      apiLogger.warn('Unauthorized access attempt', { requestId: reqId, endpoint: '/api/admin/alerts/active' });
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'admin') {
      apiLogger.warn('Forbidden access attempt', { requestId: reqId, userId: session.user.id, endpoint: '/api/admin/alerts/active' });
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    // Mock alerts - in production, this would query actual monitoring system
    const alerts = [];

    // Randomly generate some alerts for testing
    const shouldHaveWarning = Math.random() > 0.7;
    const shouldHaveCritical = Math.random() > 0.9;

    if (shouldHaveWarning) {
      alerts.push({
        id: 'alert-1',
        severity: 'warning',
        message: 'High memory usage detected on primary database server',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
      });
    }

    if (shouldHaveCritical) {
      alerts.push({
        id: 'alert-2',
        severity: 'critical',
        message: 'API response time exceeding threshold',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min ago
      });
    }

    const duration = Date.now() - startTime;
    apiLogger.info('Active alerts fetched successfully', {
      requestId: reqId,
      userId: session.user.id,
      duration,
      alertCount: alerts.length,
      statusCode: 200,
    });

    return res.status(200).json({
      requestId: reqId,
      timestamp: new Date().toISOString(),
      alerts,
      total: alerts.length,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    apiLogger.error('Error fetching active alerts', {
      requestId: reqId,
      error: error instanceof Error ? error.message : String(error),
      duration,
      statusCode: 500,
    });
    return res.status(500).json({ error: 'Internal server error', requestId: reqId });
  }
}
