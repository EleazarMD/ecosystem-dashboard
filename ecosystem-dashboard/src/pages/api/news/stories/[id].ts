/**
 * Single Story API Endpoint
 * GET /api/news/stories/[id]
 * 
 * Returns a single story by ID with full content.
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
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Story ID required' });
  }

  if (req.method === 'GET') {
    return getStory(id, res);
  } else if (req.method === 'PATCH') {
    return updateStory(id, req, res);
  } else if (req.method === 'DELETE') {
    return deleteStory(id, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function getStory(id: string, res: NextApiResponse) {
  try {
    const result = await pool.query(
      `SELECT 
        id,
        topic_id,
        title,
        headline,
        summary,
        full_narrative,
        category,
        style_guide,
        word_count,
        reading_time_minutes,
        research_package,
        citations,
        analysis,
        importance_score,
        quality_score,
        audio_url,
        audio_duration_seconds,
        audio_generated,
        podcast_project_id,
        podcast_exported_at,
        status,
        published_at,
        created_at,
        updated_at
      FROM news.daily_stories
      WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Story not found' });
    }

    return res.status(200).json({
      success: true,
      story: result.rows[0],
    });

  } catch (error) {
    console.error('Error fetching story:', error);
    return res.status(500).json({
      error: 'Failed to fetch story',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function updateStory(id: string, req: NextApiRequest, res: NextApiResponse) {
  try {
    const { status, headline, summary, full_narrative } = req.body;

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      updates.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;

      if (status === 'published') {
        updates.push(`published_at = NOW()`);
      }
    }

    if (headline) {
      updates.push(`headline = $${paramIndex}`);
      params.push(headline);
      paramIndex++;
    }

    if (summary) {
      updates.push(`summary = $${paramIndex}`);
      params.push(summary);
      paramIndex++;
    }

    if (full_narrative) {
      updates.push(`full_narrative = $${paramIndex}`);
      params.push(full_narrative);
      paramIndex++;

      // Recalculate word count
      const wordCount = full_narrative.split(/\s+/).length;
      updates.push(`word_count = $${paramIndex}`);
      params.push(wordCount);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    params.push(id);

    const result = await pool.query(
      `UPDATE news.daily_stories 
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING id, status, updated_at`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Story not found' });
    }

    return res.status(200).json({
      success: true,
      story: result.rows[0],
    });

  } catch (error) {
    console.error('Error updating story:', error);
    return res.status(500).json({
      error: 'Failed to update story',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function deleteStory(id: string, res: NextApiResponse) {
  try {
    const result = await pool.query(
      `DELETE FROM news.daily_stories WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Story not found' });
    }

    return res.status(200).json({
      success: true,
      deleted: id,
    });

  } catch (error) {
    console.error('Error deleting story:', error);
    return res.status(500).json({
      error: 'Failed to delete story',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
