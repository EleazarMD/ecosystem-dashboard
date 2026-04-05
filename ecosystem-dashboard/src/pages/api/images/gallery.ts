/**
 * Image Gallery API
 * 
 * Endpoints for viewing and managing generated images
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

  // GET: Fetch user's images and shared images
  if (req.method === 'GET') {
    const { filter = 'all', limit = 50, offset = 0 } = req.query;

    try {
      let query: string;
      let params: any[];

      if (filter === 'mine') {
        // Only user's own images
        query = `
          SELECT 
            gi.*,
            u.name as creator_name,
            (SELECT COUNT(*) FROM image_reactions ir WHERE ir.image_id = gi.id) as reaction_count,
            (SELECT COUNT(*) FROM image_comments ic WHERE ic.image_id = gi.id) as comment_count
          FROM generated_images gi
          JOIN users u ON gi.user_id = u.id
          WHERE gi.user_id = $1
          ORDER BY gi.created_at DESC
          LIMIT $2 OFFSET $3
        `;
        params = [user.id, limit, offset];
      } else if (filter === 'shared') {
        // Images shared with user
        query = `
          SELECT 
            gi.*,
            u.name as creator_name,
            s.shared_at,
            s.can_download,
            (SELECT COUNT(*) FROM image_reactions ir WHERE ir.image_id = gi.id) as reaction_count,
            (SELECT COUNT(*) FROM image_comments ic WHERE ic.image_id = gi.id) as comment_count
          FROM generated_images gi
          JOIN users u ON gi.user_id = u.id
          JOIN image_shares s ON s.image_id = gi.id
          WHERE s.shared_with_user_id = $1
          ORDER BY s.shared_at DESC
          LIMIT $2 OFFSET $3
        `;
        params = [user.id, limit, offset];
      } else if (filter === 'family') {
        // All family-visible images (same tenant)
        query = `
          SELECT 
            gi.*,
            u.name as creator_name,
            (SELECT COUNT(*) FROM image_reactions ir WHERE ir.image_id = gi.id) as reaction_count,
            (SELECT COUNT(*) FROM image_comments ic WHERE ic.image_id = gi.id) as comment_count
          FROM generated_images gi
          JOIN users u ON gi.user_id = u.id
          WHERE gi.visibility IN ('family', 'public')
            AND gi.tenant_id = (SELECT tenant_id FROM users WHERE id = $1)
          ORDER BY gi.created_at DESC
          LIMIT $2 OFFSET $3
        `;
        params = [user.id, limit, offset];
      } else {
        // All accessible images (own + shared + family)
        query = `
          SELECT DISTINCT ON (gi.id)
            gi.*,
            u.name as creator_name,
            CASE 
              WHEN gi.user_id = $1 THEN 'owned'
              WHEN EXISTS (SELECT 1 FROM image_shares s WHERE s.image_id = gi.id AND s.shared_with_user_id = $1) THEN 'shared'
              ELSE 'family'
            END as access_type,
            (SELECT COUNT(*) FROM image_reactions ir WHERE ir.image_id = gi.id) as reaction_count,
            (SELECT COUNT(*) FROM image_comments ic WHERE ic.image_id = gi.id) as comment_count
          FROM generated_images gi
          JOIN users u ON gi.user_id = u.id
          LEFT JOIN image_shares s ON s.image_id = gi.id AND s.shared_with_user_id = $1
          WHERE gi.user_id = $1
            OR s.shared_with_user_id = $1
            OR (gi.visibility IN ('family', 'public') AND gi.tenant_id = (SELECT tenant_id FROM users WHERE id = $1))
          ORDER BY gi.id, gi.created_at DESC
          LIMIT $2 OFFSET $3
        `;
        params = [user.id, limit, offset];
      }

      const result = await pool.query(query, params);

      // Get total count
      const countResult = await pool.query(`
        SELECT COUNT(DISTINCT gi.id) as total
        FROM generated_images gi
        LEFT JOIN image_shares s ON s.image_id = gi.id AND s.shared_with_user_id = $1
        WHERE gi.user_id = $1
          OR s.shared_with_user_id = $1
          OR (gi.visibility IN ('family', 'public') AND gi.tenant_id = (SELECT tenant_id FROM users WHERE id = $1))
      `, [user.id]);

      return res.status(200).json({
        images: result.rows,
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });
    } catch (error: any) {
      console.error('[Gallery API] Error:', error);
      return res.status(500).json({ error: 'Failed to fetch images' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
