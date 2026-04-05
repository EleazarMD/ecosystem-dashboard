/**
 * Daily News Stories API Endpoint
 * GET /api/news/stories
 * 
 * Returns published news stories for iOS and other clients.
 * Compatible with GooseMind iOS app format.
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
    const { 
      category,
      limit = '10',
      offset = '0',
      status = 'published',
      include_audio = 'true',
    } = req.query;

    let query = `
      SELECT 
        id,
        title,
        headline,
        summary,
        full_narrative,
        category,
        style_guide,
        word_count,
        reading_time_minutes,
        citations,
        sources,
        audio_url,
        audio_duration_seconds,
        status,
        frameworks_applied,
        verification_status,
        generation_cost,
        published_at,
        created_at
      FROM news.daily_stories
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Filter by status (default to showing all if 'all', otherwise filter)
    if (status && status !== 'all') {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    // Only include stories with audio if requested
    if (include_audio === 'only') {
      query += ` AND audio_url IS NOT NULL`;
    }

    query += ` ORDER BY published_at DESC NULLS LAST, created_at DESC`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string) || 10);
    params.push(parseInt(offset as string) || 0);

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) FROM news.daily_stories WHERE 1=1`;
    const countParams: any[] = [];
    let countParamIndex = 1;
    if (status && status !== 'all') {
      countQuery += ` AND status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }
    if (category) {
      countQuery += ` AND category = $${countParamIndex}`;
      countParams.push(category);
    }
    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    return res.status(200).json({
      success: true,
      stories: result.rows,
      pagination: {
        total: totalCount,
        limit: parseInt(limit as string) || 10,
        offset: parseInt(offset as string) || 0,
        has_more: (parseInt(offset as string) || 0) + result.rows.length < totalCount,
      },
    });

  } catch (error) {
    console.error('Error fetching stories:', error);
    return res.status(500).json({
      error: 'Failed to fetch stories',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
