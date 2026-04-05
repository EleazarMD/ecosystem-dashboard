/**
 * API endpoint for managing individual permissions
 * PATCH /api/pages/:id/permissions/:permissionId - Update role
 * DELETE /api/pages/:id/permissions/:permissionId - Revoke permission
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]';
import { getMobileOrSessionUserId } from '@/lib/mobile-auth';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  const authUserId = getMobileOrSessionUserId(session?.user?.id, req);
  if (!authUserId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id: pageId, permissionId } = req.query;

  if (!pageId || typeof pageId !== 'string' || !permissionId || typeof permissionId !== 'string') {
    return res.status(400).json({ error: 'Page ID and permission ID are required' });
  }

  if (req.method === 'PATCH') {
    const { role } = req.body;
    const validRoles = ['owner', 'editor', 'commenter', 'viewer'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    try {
      await query(
        `UPDATE page_permissions SET role = $1 WHERE id = $2 AND page_id = $3`,
        [role, permissionId, pageId]
      );
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Failed to update permission:', error);
      return res.status(500).json({ error: 'Failed to update permission' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await query(
        `DELETE FROM page_permissions WHERE id = $1 AND page_id = $2`,
        [permissionId, pageId]
      );
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Failed to revoke permission:', error);
      return res.status(500).json({ error: 'Failed to revoke permission' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
