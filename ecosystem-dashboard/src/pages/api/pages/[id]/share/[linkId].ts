/**
 * API endpoint for managing individual share links
 * DELETE /api/pages/:id/share/:linkId - Deactivate share link
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

  const { id: pageId, linkId } = req.query;

  if (!pageId || typeof pageId !== 'string' || !linkId || typeof linkId !== 'string') {
    return res.status(400).json({ error: 'Page ID and link ID are required' });
  }

  if (req.method === 'DELETE') {
    try {
      await query(
        `UPDATE share_links SET is_active = FALSE WHERE id = $1 AND page_id = $2`,
        [linkId, pageId]
      );
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Failed to deactivate share link:', error);
      return res.status(500).json({ error: 'Failed to deactivate link' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
