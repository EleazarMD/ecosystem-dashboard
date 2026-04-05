import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
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

  const userId = (session.user as any).id;
  const limit = parseInt(req.query.limit as string) || 20;

  try {
    // Get distinct prompts from generated images, ordered by most recent use
    const result = await pool.query(
      `SELECT prompt, MAX(created_at) as last_used
      FROM generated_images 
      WHERE user_id = $1 
      GROUP BY prompt 
      ORDER BY last_used DESC 
      LIMIT $2`,
      [userId, limit]
    );

    return res.status(200).json({
      prompts: result.rows.map(row => row.prompt),
      total: result.rows.length,
    });
  } catch (error: any) {
    console.error('[recent-prompts] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch recent prompts' });
  }
}
