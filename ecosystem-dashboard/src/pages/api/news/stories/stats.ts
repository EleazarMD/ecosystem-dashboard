/**
 * News Stories Statistics API
 * GET /api/news/stories/stats
 * 
 * Returns aggregate statistics for the news stories collection.
 * Useful for iOS app dashboard and summary views.
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
    // Total counts by status
    const statusCounts = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM news.daily_stories
      GROUP BY status
    `);

    // Category breakdown
    const categoryCounts = await pool.query(`
      SELECT 
        category,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE audio_url IS NOT NULL) as with_audio
      FROM news.daily_stories
      WHERE status IN ('published', 'ready')
      GROUP BY category
      ORDER BY count DESC
    `);

    // Audio statistics
    const audioStats = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE audio_url IS NOT NULL) as total_with_audio,
        COUNT(*) as total_stories,
        SUM(audio_duration_seconds) FILTER (WHERE audio_url IS NOT NULL) as total_audio_seconds,
        AVG(audio_duration_seconds) FILTER (WHERE audio_url IS NOT NULL) as avg_audio_seconds,
        MAX(audio_duration_seconds) as max_audio_seconds,
        MIN(audio_duration_seconds) FILTER (WHERE audio_url IS NOT NULL) as min_audio_seconds
      FROM news.daily_stories
      WHERE status IN ('published', 'ready')
    `);

    // Recent activity (last 7 days)
    const recentActivity = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as stories_created,
        COUNT(*) FILTER (WHERE audio_url IS NOT NULL) as with_audio
      FROM news.daily_stories
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    // Word count statistics
    const contentStats = await pool.query(`
      SELECT 
        AVG(word_count) as avg_word_count,
        SUM(word_count) as total_words,
        AVG(reading_time_minutes) as avg_reading_time
      FROM news.daily_stories
      WHERE status IN ('published', 'ready')
    `);

    const audio = audioStats.rows[0];
    const content = contentStats.rows[0];

    // Format total listening time
    const totalSeconds = parseInt(audio.total_audio_seconds) || 0;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    return res.status(200).json({
      success: true,
      stats: {
        totals: {
          all_stories: statusCounts.rows.reduce((sum, r) => sum + parseInt(r.count), 0),
          by_status: Object.fromEntries(statusCounts.rows.map(r => [r.status, parseInt(r.count)])),
        },
        audio: {
          stories_with_audio: parseInt(audio.total_with_audio) || 0,
          total_duration_seconds: totalSeconds,
          total_duration_formatted: `${hours}h ${minutes}m`,
          average_duration_seconds: Math.round(parseFloat(audio.avg_audio_seconds) || 0),
          longest_seconds: parseInt(audio.max_audio_seconds) || 0,
          shortest_seconds: parseInt(audio.min_audio_seconds) || 0,
        },
        content: {
          average_word_count: Math.round(parseFloat(content.avg_word_count) || 0),
          total_words: parseInt(content.total_words) || 0,
          average_reading_time_minutes: Math.round(parseFloat(content.avg_reading_time) || 0),
        },
        categories: categoryCounts.rows.map(r => ({
          category: r.category,
          count: parseInt(r.count),
          with_audio: parseInt(r.with_audio),
        })),
        recent_activity: recentActivity.rows.map(r => ({
          date: r.date,
          stories_created: parseInt(r.stories_created),
          with_audio: parseInt(r.with_audio),
        })),
      },
    });

  } catch (error) {
    console.error('Error fetching story stats:', error);
    return res.status(500).json({
      error: 'Failed to fetch statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
