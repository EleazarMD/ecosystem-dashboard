/**
 * News Sources API Endpoint
 * GET /api/news/sources - List configured news sources
 * POST /api/news/sources - Add a new source
 * 
 * Manages RSS feeds and API sources for topic generation.
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
  if (req.method === 'GET') {
    return listSources(req, res);
  } else if (req.method === 'POST') {
    return addSource(req, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function listSources(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { category, enabled } = req.query;

    let query = `
      SELECT 
        id,
        name,
        url,
        category,
        feed_type,
        credibility_score,
        style_guide,
        enabled,
        priority,
        last_fetched_at,
        error_count,
        created_at
      FROM news.sources
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (enabled !== undefined) {
      query += ` AND enabled = $${paramIndex}`;
      params.push(enabled === 'true');
      paramIndex++;
    }

    query += ` ORDER BY priority DESC, credibility_score DESC`;

    const result = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      sources: result.rows,
      count: result.rows.length,
    });

  } catch (error) {
    console.error('Error fetching sources:', error);
    return res.status(500).json({
      error: 'Failed to fetch sources',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function addSource(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      name,
      url,
      category,
      feed_type = 'rss',
      credibility_score = 0.7,
      style_guide,
      priority = 50,
    } = req.body;

    if (!name || !url || !category) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['name', 'url', 'category'],
      });
    }

    const result = await pool.query(
      `INSERT INTO news.sources (name, url, category, feed_type, credibility_score, style_guide, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (url) DO UPDATE SET
         name = EXCLUDED.name,
         category = EXCLUDED.category,
         credibility_score = EXCLUDED.credibility_score,
         updated_at = NOW()
       RETURNING id, name, url, category`,
      [name, url, category, feed_type, credibility_score, style_guide, priority]
    );

    return res.status(201).json({
      success: true,
      source: result.rows[0],
    });

  } catch (error) {
    console.error('Error adding source:', error);
    return res.status(500).json({
      error: 'Failed to add source',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
