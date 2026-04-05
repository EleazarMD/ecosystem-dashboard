import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME || 'ecosystem_unified',
  user: process.env.DATABASE_USER || 'eleazar',
  password: process.env.DATABASE_PASSWORD || '',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await pool.query(
      'SELECT id, name, description, style, topics, enabled FROM podcast.story_categories WHERE enabled = TRUE ORDER BY name'
    );

    return res.status(200).json({
      categories: result.rows
    });
  } catch (error) {
    console.error('Error fetching story categories:', error);
    return res.status(500).json({ error: 'Failed to fetch categories' });
  }
}
