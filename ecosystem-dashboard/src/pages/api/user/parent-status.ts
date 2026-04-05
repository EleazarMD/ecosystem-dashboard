/**
 * Parent Status API
 * 
 * Returns whether the current user is a parent (has child accounts)
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

  try {
    // Check if user has any child accounts
    const childCountResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM users
      WHERE parent_user_id = $1 AND account_type = 'child'
    `, [user.id]);

    const childCount = parseInt(childCountResult.rows[0].count);
    const isPlatformAdmin = user.platformRole === 'platform-admin';

    return res.status(200).json({
      isParent: childCount > 0,
      isPlatformAdmin,
      childCount,
    });
  } catch (error) {
    console.error('[Parent Status API] Error:', error);
    return res.status(500).json({ error: 'Failed to check parent status' });
  }
}
