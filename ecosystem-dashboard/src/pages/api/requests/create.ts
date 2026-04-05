/**
 * Create Service Request
 * POST /api/requests/create
 * 
 * Child requests access to a blocked service
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { query } from '@/lib/db';
import { logActivity } from '@/lib/parental-controls/activityLogger';

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

    // Only children can request access
    if (user.accountType !== 'child') {
      return res.status(403).json({ error: 'Only child accounts can request service access' });
    }

    const { serviceName, servicePath, reason } = req.body;

    if (!serviceName) {
      return res.status(400).json({ error: 'Service name required' });
    }

    // Get parent ID
    const parentResult = await query(
      `SELECT parent_user_id FROM users WHERE id = $1`,
      [user.id]
    );

    if (parentResult.rows.length === 0 || !parentResult.rows[0].parent_user_id) {
      return res.status(400).json({ error: 'Parent not found' });
    }

    const parentId = parentResult.rows[0].parent_user_id;

    // Check if there's already a pending request
    const existingRequest = await query(
      `SELECT id FROM service_requests
       WHERE child_id = $1 
       AND service_name = $2 
       AND status = 'pending'
       LIMIT 1`,
      [user.id, serviceName]
    );

    if (existingRequest.rows.length > 0) {
      return res.status(400).json({ error: 'You already have a pending request for this service' });
    }

    // Create request
    const result = await query(
      `INSERT INTO service_requests (
        child_id,
        parent_id,
        service_name,
        service_path,
        reason,
        status
      ) VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING id`,
      [user.id, parentId, serviceName, servicePath, reason]
    );

    // Log the request as an activity
    await logActivity(
      user.id,
      'service_request',
      {
        serviceName,
        servicePath,
        reason,
        requestId: result.rows[0].id,
      }
    );

    return res.status(200).json({
      success: true,
      requestId: result.rows[0].id,
    });
  } catch (error) {
    console.error('[API] Error creating service request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
