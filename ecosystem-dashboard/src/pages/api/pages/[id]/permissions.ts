/**
 * API endpoint for page permissions
 * GET /api/pages/:id/permissions - List permissions (optionally filter by userId)
 * POST /api/pages/:id/permissions - Grant permission
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { getMobileOrSessionUserId } from '@/lib/mobile-auth';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  const authUserId = getMobileOrSessionUserId(session?.user?.id, req);
  if (!authUserId) {
    return res.status(401).json({ error: 'Unauthorized — provide session or X-API-Key' });
  }

  const { id: pageId, userId } = req.query;

  if (!pageId || typeof pageId !== 'string') {
    return res.status(400).json({ error: 'Page ID is required' });
  }

  if (req.method === 'GET') {
    try {
      if (userId && typeof userId === 'string') {
        // Get specific user's role
        const result = await query(
          `SELECT role FROM page_permissions
           WHERE page_id = $1 AND user_id = $2
             AND (expires_at IS NULL OR expires_at > NOW())`,
          [pageId, userId]
        );
        const role = result.rows[0]?.role || null;
        return res.status(200).json({ role });
      }

      // Get all permissions for the page
      const result = await query(
        `SELECT id, page_id, user_id, role, granted_by, granted_at, expires_at
         FROM page_permissions
         WHERE page_id = $1
         ORDER BY granted_at DESC`,
        [pageId]
      );

      return res.status(200).json({ permissions: result.rows });
    } catch (error) {
      console.error('Failed to get permissions:', error);
      return res.status(500).json({ error: 'Failed to get permissions' });
    }
  }

  if (req.method === 'POST') {
    const { userId: targetUserId, role, grantedBy } = req.body;

    if (!targetUserId || !role || !grantedBy) {
      return res.status(400).json({ error: 'userId, role, and grantedBy are required' });
    }

    const validRoles = ['owner', 'editor', 'commenter', 'viewer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    try {
      const result = await query(
        `INSERT INTO page_permissions (page_id, user_id, role, granted_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (page_id, user_id)
         DO UPDATE SET role = $3, granted_by = $4, granted_at = NOW()
         RETURNING id, page_id, user_id, role, granted_by, granted_at`,
        [pageId, targetUserId, role, grantedBy]
      );

      return res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Failed to grant permission:', error);
      return res.status(500).json({ error: 'Failed to grant permission' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
