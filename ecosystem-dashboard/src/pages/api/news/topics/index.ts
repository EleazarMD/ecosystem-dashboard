/**
 * Topics List API Endpoint
 * GET /api/news/topics
 * 
 * Returns trending topics for story generation.
 * Based on Chapter 20: Story Generation Architecture & Migration Plan
 */

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
    const { category, limit = '10', exclude_used_hours = '24' } = req.query;

    let query = `
      SELECT 
        id,
        category,
        topic,
        relevance_score,
        trending_score,
        sources_count,
        first_seen,
        last_used,
        keywords,
        suggested_sources,
        usage_count,
        created_at
      FROM news.topics
      WHERE is_active = true
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    // Exclude recently used topics
    const excludeHours = parseInt(exclude_used_hours as string) || 24;
    query += ` AND (last_used IS NULL OR last_used < NOW() - INTERVAL '${excludeHours} hours')`;

    query += ` ORDER BY trending_score DESC, relevance_score DESC`;
    query += ` LIMIT $${paramIndex}`;
    params.push(parseInt(limit as string) || 10);

    const result = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      topics: result.rows,
      count: result.rows.length,
    });

  } catch (error) {
    console.error('Error fetching topics:', error);
    return res.status(500).json({
      error: 'Failed to fetch topics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
