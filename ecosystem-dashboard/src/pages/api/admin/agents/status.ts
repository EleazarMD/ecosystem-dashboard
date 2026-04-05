/**
 * AI Agents Status API
 * Returns status and metrics for AI agents in the system
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import prisma from '@/lib/prisma';
import { apiLogger } from '@/lib/api/logger';

const requestId = () => `agents-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const reqId = requestId();
  const startTime = Date.now();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      apiLogger.warn('Unauthorized access attempt', { requestId: reqId, endpoint: '/api/admin/agents/status' });
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'admin') {
      apiLogger.warn('Forbidden access attempt', { requestId: reqId, userId: session.user.id, endpoint: '/api/admin/agents/status' });
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    // Mock agent data - in production, this would query actual agent services
    const agents = [
      {
        id: 'dashboard-coordinator',
        name: 'Dashboard AI Coordinator',
        status: 'active',
        requestsToday: Math.floor(Math.random() * 500) + 100,
        avgResponseTime: Math.floor(Math.random() * 200) + 50,
        successRate: Math.floor(Math.random() * 10) + 90,
      },
      {
        id: 'knowledge-graph',
        name: 'Knowledge Graph Agent',
        status: 'active',
        requestsToday: Math.floor(Math.random() * 300) + 50,
        avgResponseTime: Math.floor(Math.random() * 300) + 100,
        successRate: Math.floor(Math.random() * 8) + 92,
      },
      {
        id: 'email-intelligence',
        name: 'Email Intelligence Agent',
        status: 'active',
        requestsToday: Math.floor(Math.random() * 400) + 80,
        avgResponseTime: Math.floor(Math.random() * 250) + 75,
        successRate: Math.floor(Math.random() * 7) + 93,
      },
      {
        id: 'vision-analyzer',
        name: 'Vision Analysis Agent',
        status: 'idle',
        requestsToday: Math.floor(Math.random() * 50) + 10,
        avgResponseTime: Math.floor(Math.random() * 400) + 200,
        successRate: Math.floor(Math.random() * 12) + 88,
      },
      {
        id: 'research-assistant',
        name: 'Research Assistant Agent',
        status: 'active',
        requestsToday: Math.floor(Math.random() * 200) + 40,
        avgResponseTime: Math.floor(Math.random() * 350) + 150,
        successRate: Math.floor(Math.random() * 9) + 91,
      },
    ];

    const duration = Date.now() - startTime;
    apiLogger.info('Agent status fetched successfully', {
      requestId: reqId,
      userId: session.user.id,
      duration,
      agentCount: agents.length,
      statusCode: 200,
    });

    return res.status(200).json({
      requestId: reqId,
      timestamp: new Date().toISOString(),
      agents,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    apiLogger.error('Error fetching agent status', {
      requestId: reqId,
      error: error instanceof Error ? error.message : String(error),
      duration,
      statusCode: 500,
    });
    return res.status(500).json({ error: 'Internal server error', requestId: reqId });
  }
}
