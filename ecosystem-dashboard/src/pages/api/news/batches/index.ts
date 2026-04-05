/**
 * Story Batches API Endpoint
 * GET /api/news/batches - List batches
 * POST /api/news/batches - Create a new batch
 * 
 * Groups stories into daily editions (morning, afternoon, evening).
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
    return listBatches(req, res);
  } else if (req.method === 'POST') {
    return createBatch(req, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function listBatches(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { date, edition, status, limit = '10' } = req.query;

    let query = `
      SELECT 
        b.id,
        b.batch_date,
        b.edition,
        b.title,
        b.batch_summary,
        b.executive_brief,
        b.story_count,
        b.podcast_script,
        b.audio_url,
        b.status,
        b.published_at,
        b.created_at
      FROM news.story_batches b
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (date) {
      query += ` AND b.batch_date = $${paramIndex}`;
      params.push(date);
      paramIndex++;
    }

    if (edition) {
      query += ` AND b.edition = $${paramIndex}`;
      params.push(edition);
      paramIndex++;
    }

    if (status) {
      query += ` AND b.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY b.batch_date DESC, b.created_at DESC`;
    query += ` LIMIT $${paramIndex}`;
    params.push(parseInt(limit as string) || 10);

    const result = await pool.query(query, params);

    // Get stories for each batch
    for (const batch of result.rows) {
      const storiesResult = await pool.query(
        `SELECT s.id, s.title, s.headline, s.category, s.audio_url
         FROM news.batch_stories bs
         JOIN news.daily_stories s ON bs.story_id = s.id
         WHERE bs.batch_id = $1
         ORDER BY bs.order_index`,
        [batch.id]
      );
      batch.stories = storiesResult.rows;
    }

    return res.status(200).json({
      success: true,
      batches: result.rows,
    });

  } catch (error) {
    console.error('Error fetching batches:', error);
    return res.status(500).json({
      error: 'Failed to fetch batches',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function createBatch(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      batch_date = new Date().toISOString().split('T')[0],
      edition = 'morning',
      title,
      story_ids = [],
    } = req.body;

    // Create the batch
    const batchResult = await pool.query(
      `INSERT INTO news.story_batches (batch_date, edition, title, story_count, status)
       VALUES ($1, $2, $3, $4, 'draft')
       ON CONFLICT (batch_date, edition) DO UPDATE SET
         title = COALESCE(EXCLUDED.title, news.story_batches.title),
         updated_at = NOW()
       RETURNING id`,
      [batch_date, edition, title, story_ids.length]
    );

    const batchId = batchResult.rows[0].id;

    // Add stories to batch
    for (let i = 0; i < story_ids.length; i++) {
      await pool.query(
        `INSERT INTO news.batch_stories (batch_id, story_id, order_index)
         VALUES ($1, $2, $3)
         ON CONFLICT (batch_id, story_id) DO UPDATE SET order_index = EXCLUDED.order_index`,
        [batchId, story_ids[i], i]
      );
    }

    // Update story count
    await pool.query(
      `UPDATE news.story_batches 
       SET story_count = (SELECT COUNT(*) FROM news.batch_stories WHERE batch_id = $1)
       WHERE id = $1`,
      [batchId]
    );

    return res.status(201).json({
      success: true,
      batch: {
        id: batchId,
        batch_date,
        edition,
        story_count: story_ids.length,
      },
    });

  } catch (error) {
    console.error('Error creating batch:', error);
    return res.status(500).json({
      error: 'Failed to create batch',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
