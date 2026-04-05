/**
 * News Stories Playlist API
 * GET/POST /api/news/stories/playlist
 * 
 * Manages user playlists for news story audio playback.
 * Supports creating playlists, adding/removing stories, and playback tracking.
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
    return getPlaylist(req, res);
  } else if (req.method === 'POST') {
    return createPlaylist(req, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function getPlaylist(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      type = 'auto', // 'auto' | 'custom' | 'recent' | 'unplayed'
      category,
      limit = '20',
    } = req.query;

    let query = '';
    const params: any[] = [];

    if (type === 'recent') {
      // Most recent stories with audio
      query = `
        SELECT 
          id, title, headline, summary, category, style_guide,
          word_count, reading_time_minutes,
          audio_url, audio_duration_seconds,
          status, created_at, published_at
        FROM news.daily_stories
        WHERE audio_url IS NOT NULL
          AND status IN ('published', 'ready')
        ORDER BY created_at DESC
        LIMIT $1
      `;
      params.push(parseInt(limit as string));
    } else if (type === 'auto') {
      // Auto-generated playlist: mix of categories, prioritize recent
      query = `
        WITH ranked_stories AS (
          SELECT 
            id, title, headline, summary, category, style_guide,
            word_count, reading_time_minutes,
            audio_url, audio_duration_seconds,
            status, created_at, published_at,
            ROW_NUMBER() OVER (PARTITION BY category ORDER BY created_at DESC) as rank
          FROM news.daily_stories
          WHERE audio_url IS NOT NULL
            AND status IN ('published', 'ready')
        )
        SELECT * FROM ranked_stories
        WHERE rank <= 3
        ORDER BY created_at DESC
        LIMIT $1
      `;
      params.push(parseInt(limit as string));
    } else {
      // Default: all with audio
      query = `
        SELECT 
          id, title, headline, summary, category, style_guide,
          word_count, reading_time_minutes,
          audio_url, audio_duration_seconds,
          status, created_at, published_at
        FROM news.daily_stories
        WHERE audio_url IS NOT NULL
          AND status IN ('published', 'ready')
      `;

      if (category && category !== 'all') {
        query += ` AND category = $1`;
        params.push(category);
        query += ` ORDER BY created_at DESC LIMIT $2`;
        params.push(parseInt(limit as string));
      } else {
        query += ` ORDER BY created_at DESC LIMIT $1`;
        params.push(parseInt(limit as string));
      }
    }

    const result = await pool.query(query, params);

    // Calculate total playlist duration
    const totalDuration = result.rows.reduce(
      (sum, row) => sum + (row.audio_duration_seconds || 0),
      0
    );

    const hours = Math.floor(totalDuration / 3600);
    const minutes = Math.floor((totalDuration % 3600) / 60);

    // Format stories for playlist
    const playlist = result.rows.map((row, index) => ({
      position: index + 1,
      id: row.id,
      title: row.title,
      headline: row.headline || row.title,
      summary: row.summary,
      category: row.category,
      style_guide: row.style_guide,
      audio_url: row.audio_url,
      duration_seconds: row.audio_duration_seconds,
      duration_formatted: row.audio_duration_seconds
        ? `${Math.floor(row.audio_duration_seconds / 60)}:${String(row.audio_duration_seconds % 60).padStart(2, '0')}`
        : null,
      reading_time_minutes: row.reading_time_minutes,
      created_at: row.created_at,
      published_at: row.published_at,
    }));

    return res.status(200).json({
      success: true,
      playlist: {
        type,
        items: playlist,
        total_items: playlist.length,
        total_duration_seconds: totalDuration,
        total_duration_formatted: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
      },
    });

  } catch (error) {
    console.error('Error fetching playlist:', error);
    return res.status(500).json({
      error: 'Failed to fetch playlist',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function createPlaylist(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { story_ids, name = 'Custom Playlist' } = req.body;

    if (!story_ids || !Array.isArray(story_ids) || story_ids.length === 0) {
      return res.status(400).json({ error: 'story_ids array required' });
    }

    // Fetch the requested stories in order
    const placeholders = story_ids.map((_, i) => `$${i + 1}`).join(',');
    const result = await pool.query(
      `SELECT 
        id, title, headline, summary, category, style_guide,
        word_count, reading_time_minutes,
        audio_url, audio_duration_seconds,
        status, created_at, published_at
      FROM news.daily_stories
      WHERE id IN (${placeholders})
        AND audio_url IS NOT NULL`,
      story_ids
    );

    // Maintain requested order
    const storyMap = new Map(result.rows.map(r => [r.id, r]));
    const orderedStories = story_ids
      .map(id => storyMap.get(id))
      .filter(Boolean);

    const totalDuration = orderedStories.reduce(
      (sum, row) => sum + (row.audio_duration_seconds || 0),
      0
    );

    const playlist = orderedStories.map((row, index) => ({
      position: index + 1,
      id: row.id,
      title: row.title,
      headline: row.headline || row.title,
      summary: row.summary,
      category: row.category,
      audio_url: row.audio_url,
      duration_seconds: row.audio_duration_seconds,
      duration_formatted: row.audio_duration_seconds
        ? `${Math.floor(row.audio_duration_seconds / 60)}:${String(row.audio_duration_seconds % 60).padStart(2, '0')}`
        : null,
      created_at: row.created_at,
    }));

    return res.status(200).json({
      success: true,
      playlist: {
        name,
        type: 'custom',
        items: playlist,
        total_items: playlist.length,
        total_duration_seconds: totalDuration,
      },
    });

  } catch (error) {
    console.error('Error creating playlist:', error);
    return res.status(500).json({
      error: 'Failed to create playlist',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
