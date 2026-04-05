/**
 * List Service Requests
 * GET /api/requests/list
 * 
 * Get service requests (parent or child view)
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = session.user as any;
    const { status, childId } = req.query;

    let requests;

    if (user.accountType === 'child') {
      // Child view - their own requests
      let whereClause = 'WHERE child_id = $1';
      const params: any[] = [user.id];

      if (status) {
        whereClause += ' AND status = $2';
        params.push(status);
      }

      requests = await query(
        `SELECT 
          sr.id,
          sr.service_name,
          sr.service_path,
          sr.reason,
          sr.status,
          sr.requested_at,
          sr.reviewed_at,
          sr.expires_at,
          sr.notes,
          u.name as parent_name
         FROM service_requests sr
         JOIN users u ON sr.parent_id = u.id
         ${whereClause}
         ORDER BY sr.requested_at DESC`,
        params
      );
    } else {
      // Parent view - requests from their children
      let whereClause = 'WHERE sr.parent_id = $1';
      const params: any[] = [user.id];
      let paramIndex = 2;

      if (childId) {
        whereClause += ` AND sr.child_id = $${paramIndex}`;
        params.push(childId);
        paramIndex++;
      }

      if (status) {
        whereClause += ` AND sr.status = $${paramIndex}`;
        params.push(status);
      }

      requests = await query(
        `SELECT 
          sr.id,
          sr.child_id,
          sr.service_name,
          sr.service_path,
          sr.reason,
          sr.status,
          sr.requested_at,
          sr.reviewed_at,
          sr.expires_at,
          sr.notes,
          u.name as child_name,
          u.email as child_email
         FROM service_requests sr
         JOIN users u ON sr.child_id = u.id
         ${whereClause}
         ORDER BY sr.requested_at DESC`,
        params
      );
    }

    return res.status(200).json({
      success: true,
      requests: requests.rows.map(row => ({
        ...row,
        requestedAt: row.requested_at,
        reviewedAt: row.reviewed_at,
        expiresAt: row.expires_at,
      })),
    });
  } catch (error) {
    console.error('[API] Error listing service requests:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
