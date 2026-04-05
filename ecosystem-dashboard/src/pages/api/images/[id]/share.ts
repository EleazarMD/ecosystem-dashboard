/**
 * Image Sharing API
 * 
 * POST: Share image with family member
 * DELETE: Remove share
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = session.user as any;
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Image ID required' });
  }

  // POST: Share image with family member
  if (req.method === 'POST') {
    const { shared_with_user_id, can_download = true, can_reshare = false } = req.body;

    if (!shared_with_user_id) {
      return res.status(400).json({ error: 'shared_with_user_id required' });
    }

    try {
      // Check ownership or reshare permission
      const accessCheck = await pool.query(`
        SELECT gi.user_id, s.can_reshare
        FROM generated_images gi
        LEFT JOIN image_shares s ON s.image_id = gi.id AND s.shared_with_user_id = $2
        WHERE gi.id = $1
      `, [id, user.id]);

      if (accessCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Image not found' });
      }

      const image = accessCheck.rows[0];
      const isOwner = image.user_id === user.id;
      const canReshare = image.can_reshare;

      if (!isOwner && !canReshare) {
        return res.status(403).json({ error: 'You do not have permission to share this image' });
      }

      // Verify target user is in same tenant (family)
      const targetCheck = await pool.query(`
        SELECT id FROM users 
        WHERE id = $1 
          AND tenant_id = (SELECT tenant_id FROM users WHERE id = $2)
      `, [shared_with_user_id, user.id]);

      if (targetCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Can only share with family members' });
      }

      // Create share
      const result = await pool.query(`
        INSERT INTO image_shares (image_id, shared_by_user_id, shared_with_user_id, can_download, can_reshare)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (image_id, shared_with_user_id) 
        DO UPDATE SET can_download = $4, can_reshare = $5, shared_at = NOW()
        RETURNING *
      `, [id, user.id, shared_with_user_id, can_download, can_reshare]);

      return res.status(200).json({
        success: true,
        share: result.rows[0],
        message: 'Image shared successfully! 🎉',
      });
    } catch (error: any) {
      console.error('[Share API] Error:', error);
      return res.status(500).json({ error: 'Failed to share image' });
    }
  }

  // DELETE: Remove share
  if (req.method === 'DELETE') {
    const { shared_with_user_id } = req.body;

    if (!shared_with_user_id) {
      return res.status(400).json({ error: 'shared_with_user_id required' });
    }

    try {
      // Check ownership
      const ownerCheck = await pool.query(
        'SELECT user_id FROM generated_images WHERE id = $1',
        [id]
      );

      if (ownerCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Image not found' });
      }

      if (ownerCheck.rows[0].user_id !== user.id) {
        return res.status(403).json({ error: 'Only the owner can remove shares' });
      }

      await pool.query(
        'DELETE FROM image_shares WHERE image_id = $1 AND shared_with_user_id = $2',
        [id, shared_with_user_id]
      );

      return res.status(200).json({ success: true, message: 'Share removed' });
    } catch (error: any) {
      console.error('[Share API] Error:', error);
      return res.status(500).json({ error: 'Failed to remove share' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
