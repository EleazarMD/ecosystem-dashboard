/**
 * Image Comments API
 * 
 * GET: Get comments for image
 * POST: Add comment to image
 * DELETE: Delete comment
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

  // GET: Get comments
  if (req.method === 'GET') {
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

      const comments = await pool.query(`
        SELECT 
          ic.*,
          u.name as user_name,
          u.account_type as user_account_type
        FROM image_comments ic
        JOIN users u ON ic.user_id = u.id
        WHERE ic.image_id = $1
        ORDER BY ic.created_at ASC
      `, [id]);

      return res.status(200).json({
        comments: comments.rows,
        total: comments.rows.length,
      });
    } catch (error: any) {
      console.error('[Comments API] Error:', error);
      return res.status(500).json({ error: 'Failed to fetch comments' });
    }
  }

  // POST: Add comment
  if (req.method === 'POST') {
    const { content, parent_comment_id } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content required' });
    }

    if (content.length > 1000) {
      return res.status(400).json({ error: 'Comment too long (max 1000 characters)' });
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

      // If replying to a comment, verify parent exists
      if (parent_comment_id) {
        const parentCheck = await pool.query(
          'SELECT id FROM image_comments WHERE id = $1 AND image_id = $2',
          [parent_comment_id, id]
        );
        if (parentCheck.rows.length === 0) {
          return res.status(400).json({ error: 'Parent comment not found' });
        }
      }

      const result = await pool.query(`
        INSERT INTO image_comments (image_id, user_id, parent_comment_id, content)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [id, user.id, parent_comment_id || null, content.trim()]);

      // Get user info for response
      const userInfo = await pool.query(
        'SELECT name, account_type FROM users WHERE id = $1',
        [user.id]
      );

      return res.status(201).json({
        success: true,
        comment: {
          ...result.rows[0],
          user_name: userInfo.rows[0].name,
          user_account_type: userInfo.rows[0].account_type,
        },
      });
    } catch (error: any) {
      console.error('[Comments API] Error:', error);
      return res.status(500).json({ error: 'Failed to add comment' });
    }
  }

  // DELETE: Delete comment
  if (req.method === 'DELETE') {
    const { comment_id } = req.body;

    if (!comment_id) {
      return res.status(400).json({ error: 'comment_id required' });
    }

    try {
      // Check ownership of comment or image
      const ownerCheck = await pool.query(`
        SELECT ic.user_id as comment_owner, gi.user_id as image_owner
        FROM image_comments ic
        JOIN generated_images gi ON gi.id = ic.image_id
        WHERE ic.id = $1 AND ic.image_id = $2
      `, [comment_id, id]);

      if (ownerCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      const { comment_owner, image_owner } = ownerCheck.rows[0];
      
      // Allow deletion by comment owner or image owner
      if (comment_owner !== user.id && image_owner !== user.id) {
        return res.status(403).json({ error: 'Not authorized to delete this comment' });
      }

      await pool.query('DELETE FROM image_comments WHERE id = $1', [comment_id]);

      return res.status(200).json({ success: true, message: 'Comment deleted' });
    } catch (error: any) {
      console.error('[Comments API] Error:', error);
      return res.status(500).json({ error: 'Failed to delete comment' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
