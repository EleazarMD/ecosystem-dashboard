/**
 * Parent Content Flags API
 * 
 * Get flagged content for parent review in family hub
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only allow parent/administrator accounts
  const accountType = (session.user as any).accountType;
  if (accountType === 'child') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    // Get all flagged content for children under this parent
    const result = await pool.query(`
      SELECT 
        bcf.*,
        cb.title as book_title,
        cb.cover_url as book_cover,
        u.name as child_name,
        u.age as child_age
      FROM book_content_flags bcf
      JOIN children_books cb ON bcf.book_id = cb.id
      JOIN users u ON bcf.assigned_child_id = u.id
      WHERE bcf.parent_id = $1 OR bcf.parent_id IS NULL
      ORDER BY bcf.created_at DESC
      LIMIT 100
    `, [session.user.id]);

    return res.status(200).json({
      success: true,
      flags: result.rows
    });

  } catch (error) {
    console.error('[Content Flags] Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch content flags',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
