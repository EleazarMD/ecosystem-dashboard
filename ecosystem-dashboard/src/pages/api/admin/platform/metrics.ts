/**
 * Platform Metrics API
 * Returns high-level platform statistics for administrators
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import prisma from '@/lib/prisma';
import { apiLogger } from '@/lib/api/logger';
import { z } from 'zod';

const requestId = () => `metrics-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const reqId = requestId();
  const startTime = Date.now();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      apiLogger.warn('Unauthorized access attempt', { requestId: reqId, endpoint: '/api/admin/platform/metrics' });
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'admin') {
      apiLogger.warn('Forbidden access attempt', { 
        requestId: reqId, 
        userId: session.user.id,
        endpoint: '/api/admin/platform/metrics' 
      });
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    // Get platform metrics
    const [
      totalUsers,
      activeUsers,
      totalTenants,
      activeTenants,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          lastLoginAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
      prisma.tenant.count(),
      prisma.tenant.count({
        where: {
          isActive: true,
        },
      }),
    ]);

    // Get request metrics (mock for now - would come from analytics service)
    const totalRequests = Math.floor(Math.random() * 100000) + 50000;
    const requestsChange = Math.floor(Math.random() * 20) - 5; // -5% to +15%

    // Get system metrics (mock for now - would come from monitoring service)
    const cpuUsage = Math.floor(Math.random() * 40) + 20; // 20-60%
    const memoryUsage = Math.floor(Math.random() * 30) + 40; // 40-70%
    const storageUsed = 450; // GB
    const storageTotal = 1000; // GB

    // Determine system health
    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (cpuUsage > 80 || memoryUsage > 85) {
      systemHealth = 'critical';
    } else if (cpuUsage > 60 || memoryUsage > 70) {
      systemHealth = 'warning';
    }

    const duration = Date.now() - startTime;
    
    apiLogger.info('Platform metrics fetched successfully', {
      requestId: reqId,
      userId: session.user.id,
      duration,
      statusCode: 200,
    });

    return res.status(200).json({
      requestId: reqId,
      timestamp: new Date().toISOString(),
      metrics: {
        totalUsers,
        activeUsers,
        totalTenants,
        activeTenants,
        totalRequests,
        requestsChange,
        cpuUsage,
        memoryUsage,
        storageUsed,
        storageTotal,
        systemHealth,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    apiLogger.error('Error fetching platform metrics', {
      requestId: reqId,
      error: error instanceof Error ? error.message : String(error),
      duration,
      statusCode: 500,
    });
    
    return res.status(500).json({ 
      error: 'Internal server error',
      requestId: reqId,
    });
  }
}
