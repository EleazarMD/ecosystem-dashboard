/**
 * Check Service Access
 * POST /api/services/check-access
 * 
 * Checks if a child can access a specific service
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { checkServiceAccess, logBlockedAttempt, checkPendingApproval } from '@/lib/parental-controls/serviceAccess';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = session.user as any;
    const { servicePath } = req.body;

    if (!servicePath) {
      return res.status(400).json({ error: 'Service path required' });
    }

    // Non-child accounts have full access
    if (user.accountType !== 'child') {
      return res.status(200).json({ allowed: true });
    }

    // Check service access
    const accessResult = await checkServiceAccess(user.id, servicePath);

    // If blocked, log the attempt
    if (!accessResult.allowed) {
      const serviceName = servicePath.split('?')[0].replace(/^\//, '').split('/')[0];
      await logBlockedAttempt(user.id, serviceName, servicePath);

      // Check if there's a pending approval
      if (accessResult.requiresApproval) {
        const hasApproval = await checkPendingApproval(user.id, serviceName);
        if (hasApproval) {
          return res.status(200).json({ allowed: true, approvalGranted: true });
        }
      }
    }

    return res.status(200).json(accessResult);
  } catch (error) {
    console.error('[API] Error checking service access:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
