/**
 * API Route: List OpenClaw User Agents
 * 
 * Admin endpoint to list all provisioned user agents.
 * Requires platform-admin role.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { listUserAgents, deleteUserAgent } from '@/lib/openclaw/multi-tenant';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get authenticated user
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = session.user as any;
  
  // Only platform admins can list all agents
  if (user.platformRole !== 'platform-admin') {
    return res.status(403).json({ error: 'Platform admin access required' });
  }

  if (req.method === 'GET') {
    try {
      const agents = await listUserAgents();
      return res.status(200).json({ agents });
    } catch (error: any) {
      console.error('[OpenClaw] Failed to list agents:', error);
      return res.status(500).json({
        error: 'Failed to list agents',
        details: error.message,
      });
    }
  }

  if (req.method === 'DELETE') {
    const { agentId } = req.query;
    
    if (!agentId || typeof agentId !== 'string') {
      return res.status(400).json({ error: 'agentId required' });
    }

    try {
      const success = await deleteUserAgent(agentId);
      if (success) {
        return res.status(200).json({ message: 'Agent deleted', agentId });
      } else {
        return res.status(404).json({ error: 'Agent not found' });
      }
    } catch (error: any) {
      console.error('[OpenClaw] Failed to delete agent:', error);
      return res.status(500).json({
        error: 'Failed to delete agent',
        details: error.message,
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
