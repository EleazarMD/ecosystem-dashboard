/**
 * API Route: Provision OpenClaw Agent for User
 * 
 * Creates a per-user OpenClaw agent with isolated workspace and sessions.
 * Called when a user first accesses OpenClaw features.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import {
  provisionUserAgent,
  checkAgentExists,
  getAgentId,
  listUserAgents,
  type UserAgentConfig,
} from '@/lib/openclaw/multi-tenant';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get authenticated user
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = session.user as any;

  if (req.method === 'GET') {
    // Check if agent exists for current user
    const config: UserAgentConfig = {
      userId: user.id,
      userName: user.name || 'User',
      userEmail: user.email || '',
      tenantId: req.headers['x-tenant-id'] as string || user.defaultTenantId,
    };

    const agentId = getAgentId(config);
    const status = await checkAgentExists(agentId);

    return res.status(200).json({
      agentId,
      ...status,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  }

  if (req.method === 'POST') {
    // Provision new agent for user
    const config: UserAgentConfig = {
      userId: user.id,
      userName: user.name || 'User',
      userEmail: user.email || '',
      tenantId: req.headers['x-tenant-id'] as string || user.defaultTenantId,
    };

    try {
      const status = await provisionUserAgent(config);
      const agentId = getAgentId(config);

      return res.status(201).json({
        message: 'Agent provisioned successfully',
        agentId,
        ...status,
      });
    } catch (error: any) {
      console.error('[OpenClaw] Failed to provision agent:', error);
      return res.status(500).json({
        error: 'Failed to provision agent',
        details: error.message,
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
