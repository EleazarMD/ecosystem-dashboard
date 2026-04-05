/**
 * Child Art Studio Delete API
 * 
 * Allows children to delete their own generated images.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = session.user as any;
  const { imageId } = req.query;

  if (!imageId || typeof imageId !== 'string') {
    return res.status(400).json({ error: 'Image ID is required' });
  }

  try {
    console.log(`[Art Studio Delete] Attempting to delete image ${imageId} for user ${user.id}`);
    
    // First check if the image exists at all
    const imageCheck = await pool.query(
      `SELECT id, user_id, is_child_generated FROM generated_images WHERE id = $1`,
      [imageId]
    );
    
    console.log(`[Art Studio Delete] Image check result:`, imageCheck.rows);
    
    // Verify the image belongs to this user before deleting
    const checkResult = await pool.query(
      `SELECT id FROM generated_images 
       WHERE id = $1 AND user_id = $2 AND is_child_generated = true`,
      [imageId, user.id]
    );

    if (checkResult.rows.length === 0) {
      console.log(`[Art Studio Delete] Image not found or not owned. User: ${user.id}, ImageId: ${imageId}`);
      return res.status(404).json({ error: 'Image not found or not owned by user' });
    }

    // Delete the image
    await pool.query(
      `DELETE FROM generated_images WHERE id = $1`,
      [imageId]
    );

    console.log(`[Art Studio] Deleted image ${imageId} for user ${user.id}`);

    return res.status(200).json({ success: true, deletedId: imageId });
  } catch (error) {
    console.error('[Art Studio Delete] Error:', error);
    return res.status(500).json({ error: 'Failed to delete image' });
  }
}
