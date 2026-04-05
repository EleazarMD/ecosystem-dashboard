/**
 * Child Art Studio Gallery API
 * 
 * Returns completed images for the authenticated child user.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = session.user as any;

  try {
    // Fetch completed images for this child from generated_images table
    const result = await pool.query(`
      SELECT 
        gi.id,
        gi.prompt,
        gi.file_path as image_url,
        gi.created_at,
        gi.model,
        gi.is_favorite as favorite
      FROM generated_images gi
      WHERE gi.user_id = $1 
        AND gi.is_child_generated = true
        AND gi.file_path IS NOT NULL
      ORDER BY gi.created_at DESC
      LIMIT 50
    `, [user.id]);

    return res.status(200).json({
      images: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('[Gallery API] Error fetching images:', error);
    return res.status(500).json({ error: 'Failed to fetch images' });
  }
}
