/**
 * Recent Activity API
 * Returns recent platform-wide activities for administrators
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import prisma from '@/lib/prisma';
import { apiLogger } from '@/lib/api/logger';
import { validateQueryParam } from '@/lib/api/validation';
import { z } from 'zod';

const requestId = () => `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const reqId = requestId();
  const startTime = Date.now();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      apiLogger.warn('Unauthorized access attempt', { requestId: reqId, endpoint: '/api/admin/activity/recent' });
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'admin') {
      apiLogger.warn('Forbidden access attempt', { requestId: reqId, userId: session.user.id, endpoint: '/api/admin/activity/recent' });
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const limit = validateQueryParam(req.query.limit, z.coerce.number().int().min(1).max(100), 10);

    // Get recent users
    const recentUsers = await prisma.user.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    // Get recent tenants
    const recentTenants = await prisma.tenant.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    });

    // Build activity feed
    const activities = [];

    // Add user creation events
    for (const user of recentUsers) {
      activities.push({
        id: `user-${user.id}`,
        type: 'user_created',
        title: 'New User Registered',
        description: `${user.name} (${user.email}) joined as ${user.role}`,
        timestamp: user.createdAt.toISOString(),
        userId: user.id,
        userName: user.name,
        severity: 'info',
      });
    }

    // Add tenant creation events
    for (const tenant of recentTenants) {
      activities.push({
        id: `tenant-${tenant.id}`,
        type: 'tenant_created',
        title: 'New Tenant Created',
        description: `Tenant "${tenant.name}" was created`,
        timestamp: tenant.createdAt.toISOString(),
        severity: 'info',
      });
    }

    // Sort by timestamp and limit
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const limitedActivities = activities.slice(0, limit);

    const duration = Date.now() - startTime;
    apiLogger.info('Recent activity fetched successfully', {
      requestId: reqId,
      userId: session.user.id,
      duration,
      count: limitedActivities.length,
      statusCode: 200,
    });

    return res.status(200).json({
      requestId: reqId,
      timestamp: new Date().toISOString(),
      activities: limitedActivities,
      total: activities.length,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    apiLogger.error('Error fetching recent activity', {
      requestId: reqId,
      error: error instanceof Error ? error.message : String(error),
      duration,
      statusCode: 500,
    });
    return res.status(500).json({ error: 'Internal server error', requestId: reqId });
  }
}
