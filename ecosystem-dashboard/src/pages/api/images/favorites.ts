/**
 * Favorites API
 * 
 * Endpoints for managing favorite images
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
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

  // GET: Fetch user's favorite images
  if (req.method === 'GET') {
    try {
      const result = await pool.query(`
        SELECT 
          gi.*,
          u.name as creator_name
        FROM generated_images gi
        JOIN users u ON gi.user_id = u.id
        WHERE gi.user_id = $1 AND gi.is_favorite = true
        ORDER BY gi.updated_at DESC
      `, [user.id]);

      return res.status(200).json({
        images: result.rows,
      });
    } catch (error: any) {
      console.error('[Favorites API] Error:', error);
      return res.status(500).json({ error: 'Failed to fetch favorites' });
    }
  }

  // POST: Toggle favorite status
  if (req.method === 'POST') {
    const { image_id } = req.body;

    if (!image_id) {
      return res.status(400).json({ error: 'Image ID is required' });
    }

    try {
      // Verify ownership
      const ownerCheck = await pool.query(
        'SELECT id, is_favorite FROM generated_images WHERE id = $1 AND user_id = $2',
        [image_id, user.id]
      );

      if (ownerCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Not authorized to modify this image' });
      }

      const currentFavorite = ownerCheck.rows[0].is_favorite;

      await pool.query(
        'UPDATE generated_images SET is_favorite = $1, updated_at = NOW() WHERE id = $2',
        [!currentFavorite, image_id]
      );

      return res.status(200).json({
        success: true,
        is_favorite: !currentFavorite,
      });
    } catch (error: any) {
      console.error('[Favorites API] Error toggling:', error);
      return res.status(500).json({ error: 'Failed to toggle favorite' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
