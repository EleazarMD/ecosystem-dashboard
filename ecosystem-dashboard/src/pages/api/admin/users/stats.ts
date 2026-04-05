/**
 * User Statistics API
 * Returns user management statistics for administrators
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import prisma from '@/lib/prisma';
import { apiLogger } from '@/lib/api/logger';

const requestId = () => `user-stats-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const reqId = requestId();
  const startTime = Date.now();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      apiLogger.warn('Unauthorized access attempt', { requestId: reqId, endpoint: '/api/admin/users/stats' });
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'admin') {
      apiLogger.warn('Forbidden access attempt', { requestId: reqId, userId: session.user.id, endpoint: '/api/admin/users/stats' });
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get user statistics
    const [
      totalUsers,
      activeToday,
      newThisWeek,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          lastLoginAt: {
            gte: oneDayAgo,
          },
        },
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: oneWeekAgo,
          },
        },
      }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
        },
      }),
    ]);

    // Get pending approvals (mock for now - would come from approval system)
    const pendingApprovals = 0;

    const duration = Date.now() - startTime;
    apiLogger.info('User stats fetched successfully', {
      requestId: reqId,
      userId: session.user.id,
      duration,
      totalUsers,
      statusCode: 200,
    });

    return res.status(200).json({
      requestId: reqId,
      timestamp: new Date().toISOString(),
      stats: {
        totalUsers,
        activeToday,
        newThisWeek,
        pendingApprovals,
        recentUsers: recentUsers.map(u => ({
          id: u.id,
          name: u.name || 'Unknown',
          email: u.email,
          avatarUrl: u.image,
          role: u.role,
        })),
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    apiLogger.error('Error fetching user stats', {
      requestId: reqId,
      error: error instanceof Error ? error.message : String(error),
      duration,
      statusCode: 500,
    });
    return res.status(500).json({ error: 'Internal server error', requestId: reqId });
  }
}
