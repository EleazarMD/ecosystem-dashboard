/**
 * Single Image API
 * 
 * GET: Fetch image details
 * PATCH: Update image (visibility, favorite)
 * DELETE: Delete image
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

  // GET: Fetch image details with reactions and comments
  if (req.method === 'GET') {
    try {
      // Check access
      const accessCheck = await pool.query(`
        SELECT gi.*, u.name as creator_name
        FROM generated_images gi
        JOIN users u ON gi.user_id = u.id
        WHERE gi.id = $1
          AND (
            gi.user_id = $2
            OR EXISTS (SELECT 1 FROM image_shares s WHERE s.image_id = gi.id AND s.shared_with_user_id = $2)
            OR (gi.visibility IN ('family', 'public') AND gi.tenant_id = (SELECT tenant_id FROM users WHERE id = $2))
          )
      `, [id, user.id]);

      if (accessCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Image not found or access denied' });
      }

      const image = accessCheck.rows[0];

      // Get reactions
      const reactions = await pool.query(`
        SELECT ir.*, u.name as user_name
        FROM image_reactions ir
        JOIN users u ON ir.user_id = u.id
        WHERE ir.image_id = $1
        ORDER BY ir.created_at DESC
      `, [id]);

      // Get comments
      const comments = await pool.query(`
        SELECT ic.*, u.name as user_name
        FROM image_comments ic
        JOIN users u ON ic.user_id = u.id
        WHERE ic.image_id = $1
        ORDER BY ic.created_at ASC
      `, [id]);

      // Get shares
      const shares = await pool.query(`
        SELECT s.*, u.name as shared_with_name
        FROM image_shares s
        JOIN users u ON s.shared_with_user_id = u.id
        WHERE s.image_id = $1
      `, [id]);

      return res.status(200).json({
        ...image,
        reactions: reactions.rows,
        comments: comments.rows,
        shares: shares.rows,
        isOwner: image.user_id === user.id,
      });
    } catch (error: any) {
      console.error('[Image API] Error:', error);
      return res.status(500).json({ error: 'Failed to fetch image' });
    }
  }

  // PATCH: Update image
  if (req.method === 'PATCH') {
    const { visibility, is_favorite } = req.body;

    try {
      // Check ownership
      const ownerCheck = await pool.query(
        'SELECT id FROM generated_images WHERE id = $1 AND user_id = $2',
        [id, user.id]
      );

      if (ownerCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Only the owner can update this image' });
      }

      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (visibility !== undefined) {
        updates.push(`visibility = $${paramIndex++}`);
        values.push(visibility);
      }

      if (is_favorite !== undefined) {
        updates.push(`is_favorite = $${paramIndex++}`);
        values.push(is_favorite);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No updates provided' });
      }

      values.push(id);
      const result = await pool.query(`
        UPDATE generated_images
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex}
        RETURNING *
      `, values);

      return res.status(200).json(result.rows[0]);
    } catch (error: any) {
      console.error('[Image API] Error:', error);
      return res.status(500).json({ error: 'Failed to update image' });
    }
  }

  // DELETE: Delete image
  if (req.method === 'DELETE') {
    try {
      // Check ownership
      const ownerCheck = await pool.query(
        'SELECT id FROM generated_images WHERE id = $1 AND user_id = $2',
        [id, user.id]
      );

      if (ownerCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Only the owner can delete this image' });
      }

      await pool.query('DELETE FROM generated_images WHERE id = $1', [id]);

      return res.status(200).json({ success: true, message: 'Image deleted' });
    } catch (error: any) {
      console.error('[Image API] Error:', error);
      return res.status(500).json({ error: 'Failed to delete image' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
