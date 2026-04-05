/**
 * Review Service Request
 * POST /api/requests/review
 * 
 * Parent approves or denies a service request
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { query } from '@/lib/db';

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
    const { requestId, action, notes, duration } = req.body;

    if (!requestId || !action) {
      return res.status(400).json({ error: 'Request ID and action required' });
    }

    if (!['approve', 'deny'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approve or deny' });
    }

    // Verify parent owns this request
    const requestCheck = await query(
      `SELECT parent_id, child_id, service_name, status
       FROM service_requests
       WHERE id = $1`,
      [requestId]
    );

    if (requestCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = requestCheck.rows[0];

    if (request.parent_id !== user.id && user.platformRole !== 'platform-admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request has already been reviewed' });
    }

    // Calculate expiration if approved with duration
    let expiresAt: Date | null = null;
    if (action === 'approve' && duration) {
      const now = new Date();
      if (duration === 'hour') {
        expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
      } else if (duration === 'day') {
        expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      } else if (duration === 'week') {
        expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      }
      // No expiration = permanent
    }

    // Update request
    await query(
      `UPDATE service_requests
       SET status = $1,
           reviewed_at = NOW(),
           reviewed_by = $2,
           expires_at = $3,
           notes = $4
       WHERE id = $5`,
      [action === 'approve' ? 'approved' : 'denied', user.id, expiresAt, notes, requestId]
    );

    // If approved, temporarily add service to allowed list
    if (action === 'approve') {
      await query(
        `UPDATE parental_controls
         SET allowed_services = COALESCE(allowed_services, '[]'::jsonb) || $1::jsonb
         WHERE child_id = $2
         AND NOT (allowed_services @> $1::jsonb)`,
        [JSON.stringify([request.service_name]), request.child_id]
      );
    }

    return res.status(200).json({
      success: true,
      action,
      expiresAt,
    });
  } catch (error) {
    console.error('[API] Error reviewing service request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
