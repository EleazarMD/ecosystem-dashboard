/**
 * Family Gallery API
 * 
 * Get all images shared within the family (same tenant)
 * Includes images from children with family visibility
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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { limit = 50, offset = 0, creator_id } = req.query;

  try {
    // Get user's tenant
    const tenantResult = await pool.query(
      'SELECT tenant_id FROM users WHERE id = $1',
      [user.id]
    );

    if (tenantResult.rows.length === 0 || !tenantResult.rows[0].tenant_id) {
      return res.status(200).json({
        images: [],
        total: 0,
        message: 'No family group configured',
      });
    }

    const tenantId = tenantResult.rows[0].tenant_id;

    // Build query
    let whereClause = `
      gi.tenant_id = $1
      AND gi.visibility IN ('family', 'public')
    `;
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (creator_id) {
      whereClause += ` AND gi.user_id = $${paramIndex++}`;
      params.push(creator_id);
    }

    params.push(limit, offset);

    const result = await pool.query(`
      SELECT 
        gi.*,
        u.name as creator_name,
        u.account_type as creator_account_type,
        (SELECT COUNT(*) FROM image_reactions ir WHERE ir.image_id = gi.id) as reaction_count,
        (SELECT COUNT(*) FROM image_comments ic WHERE ic.image_id = gi.id) as comment_count,
        (SELECT json_agg(json_build_object('reaction', reaction, 'count', cnt))
         FROM (
           SELECT reaction, COUNT(*) as cnt
           FROM image_reactions
           WHERE image_id = gi.id
           GROUP BY reaction
         ) r
        ) as reaction_summary
      FROM generated_images gi
      JOIN users u ON gi.user_id = u.id
      WHERE ${whereClause}
      ORDER BY gi.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `, params);

    // Get total count
    const countParams = creator_id ? [tenantId, creator_id] : [tenantId];
    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM generated_images gi
      WHERE gi.tenant_id = $1
        AND gi.visibility IN ('family', 'public')
        ${creator_id ? 'AND gi.user_id = $2' : ''}
    `, countParams);

    // Get family members for context
    const familyMembers = await pool.query(`
      SELECT id, name, account_type,
        (SELECT COUNT(*) FROM generated_images WHERE user_id = users.id AND visibility IN ('family', 'public')) as image_count
      FROM users
      WHERE tenant_id = $1
      ORDER BY name
    `, [tenantId]);

    return res.status(200).json({
      images: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      familyMembers: familyMembers.rows,
    });
  } catch (error: any) {
    console.error('[Family Gallery API] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch family gallery' });
  }
}
