/**
 * Image Reactions API
 * 
 * POST: Add reaction to image
 * DELETE: Remove reaction
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

// Valid reactions
const VALID_REACTIONS = ['❤️', '🎨', '😍', '🔥', '👏', '✨', '🌟', '💯', 'love', 'wow', 'funny', 'amazing'];

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

  // POST: Add reaction
  if (req.method === 'POST') {
    const { reaction } = req.body;

    if (!reaction || !VALID_REACTIONS.includes(reaction)) {
      return res.status(400).json({ 
        error: 'Invalid reaction',
        valid_reactions: VALID_REACTIONS 
      });
    }

    try {
      // Check access to image
      const accessCheck = await pool.query(`
        SELECT gi.id
        FROM generated_images gi
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

      // Add reaction (upsert)
      const result = await pool.query(`
        INSERT INTO image_reactions (image_id, user_id, reaction)
        VALUES ($1, $2, $3)
        ON CONFLICT (image_id, user_id, reaction) DO NOTHING
        RETURNING *
      `, [id, user.id, reaction]);

      // Get updated reaction counts
      const counts = await pool.query(`
        SELECT reaction, COUNT(*) as count
        FROM image_reactions
        WHERE image_id = $1
        GROUP BY reaction
      `, [id]);

      return res.status(200).json({
        success: true,
        reaction: result.rows[0] || { image_id: id, user_id: user.id, reaction },
        counts: counts.rows,
      });
    } catch (error: any) {
      console.error('[Reactions API] Error:', error);
      return res.status(500).json({ error: 'Failed to add reaction' });
    }
  }

  // DELETE: Remove reaction
  if (req.method === 'DELETE') {
    const { reaction } = req.body;

    if (!reaction) {
      return res.status(400).json({ error: 'Reaction required' });
    }

    try {
      await pool.query(
        'DELETE FROM image_reactions WHERE image_id = $1 AND user_id = $2 AND reaction = $3',
        [id, user.id, reaction]
      );

      // Get updated reaction counts
      const counts = await pool.query(`
        SELECT reaction, COUNT(*) as count
        FROM image_reactions
        WHERE image_id = $1
        GROUP BY reaction
      `, [id]);

      return res.status(200).json({
        success: true,
        counts: counts.rows,
      });
    } catch (error: any) {
      console.error('[Reactions API] Error:', error);
      return res.status(500).json({ error: 'Failed to remove reaction' });
    }
  }

  // GET: Get reactions for image
  if (req.method === 'GET') {
    try {
      const reactions = await pool.query(`
        SELECT ir.*, u.name as user_name
        FROM image_reactions ir
        JOIN users u ON ir.user_id = u.id
        WHERE ir.image_id = $1
        ORDER BY ir.created_at DESC
      `, [id]);

      const counts = await pool.query(`
        SELECT reaction, COUNT(*) as count
        FROM image_reactions
        WHERE image_id = $1
        GROUP BY reaction
      `, [id]);

      // Check if current user has reacted
      const userReactions = await pool.query(
        'SELECT reaction FROM image_reactions WHERE image_id = $1 AND user_id = $2',
        [id, user.id]
      );

      return res.status(200).json({
        reactions: reactions.rows,
        counts: counts.rows,
        userReactions: userReactions.rows.map(r => r.reaction),
      });
    } catch (error: any) {
      console.error('[Reactions API] Error:', error);
      return res.status(500).json({ error: 'Failed to fetch reactions' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
