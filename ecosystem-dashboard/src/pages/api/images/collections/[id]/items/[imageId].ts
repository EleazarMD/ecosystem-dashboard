/**
 * Collection Item API
 * 
 * Endpoints for managing individual items in a collection
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
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
  const { id: collectionId, imageId } = req.query;

  // DELETE: Remove image from collection
  if (req.method === 'DELETE') {
    try {
      // Verify collection ownership
      const ownerCheck = await pool.query(
        'SELECT id FROM image_collections WHERE id = $1 AND user_id = $2',
        [collectionId, user.id]
      );

      if (ownerCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Not authorized to modify this collection' });
      }

      // Remove the image from the collection
      await pool.query(
        'DELETE FROM image_collection_items WHERE collection_id = $1 AND image_id = $2',
        [collectionId, imageId]
      );

      // If this was the cover image, clear it
      await pool.query(`
        UPDATE image_collections 
        SET cover_image_id = NULL, updated_at = NOW()
        WHERE id = $1 AND cover_image_id = $2
      `, [collectionId, imageId]);

      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('[Collection Item API] Error removing image:', error);
      return res.status(500).json({ error: 'Failed to remove image from collection' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
