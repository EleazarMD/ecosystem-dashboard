/**
 * News System Health Check
 * GET /api/news/health
 * 
 * Returns health status of the Daily News Stories system.
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
    // Check database connection
    const dbCheck = await pool.query('SELECT 1');
    
    // Get stats
    const statsResult = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM news.topics WHERE is_active = true) as active_topics,
        (SELECT COUNT(*) FROM news.sources WHERE enabled = true) as active_sources,
        (SELECT COUNT(*) FROM news.daily_stories) as total_stories,
        (SELECT COUNT(*) FROM news.daily_stories WHERE status = 'published') as published_stories,
        (SELECT COUNT(*) FROM news.daily_stories WHERE audio_generated = true) as stories_with_audio,
        (SELECT COUNT(*) FROM news.story_batches) as total_batches,
        (SELECT MAX(created_at) FROM news.daily_stories) as last_story_created,
        (SELECT MAX(published_at) FROM news.daily_stories) as last_story_published
    `);

    const stats = statsResult.rows[0];

    // Check if schema exists
    const schemaCheck = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.schemata WHERE schema_name = 'news'
      ) as schema_exists
    `);

    const schemaExists = schemaCheck.rows[0].schema_exists;

    return res.status(200).json({
      status: 'healthy',
      service: 'daily-news-stories',
      version: '1.0.0',
      database: {
        connected: true,
        schema_exists: schemaExists,
      },
      stats: {
        active_topics: parseInt(stats.active_topics) || 0,
        active_sources: parseInt(stats.active_sources) || 0,
        total_stories: parseInt(stats.total_stories) || 0,
        published_stories: parseInt(stats.published_stories) || 0,
        stories_with_audio: parseInt(stats.stories_with_audio) || 0,
        total_batches: parseInt(stats.total_batches) || 0,
        last_story_created: stats.last_story_created,
        last_story_published: stats.last_story_published,
      },
      endpoints: {
        topics: {
          generate: 'POST /api/news/topics/generate',
          list: 'GET /api/news/topics',
        },
        research: {
          analyze: 'POST /api/news/research/analyze',
        },
        stories: {
          generate: 'POST /api/news/stories/generate',
          list: 'GET /api/news/stories',
          get: 'GET /api/news/stories/[id]',
          export: 'POST /api/news/stories/export-to-podcast',
        },
        pipeline: {
          run: 'POST /api/news/pipeline/run',
        },
        batches: {
          list: 'GET /api/news/batches',
          create: 'POST /api/news/batches',
        },
        sources: {
          list: 'GET /api/news/sources',
          add: 'POST /api/news/sources',
        },
        mobile: {
          discover: 'GET /api/mobile/news/discover',
          get: 'GET /api/mobile/news/[id]',
        },
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Health check error:', error);
    return res.status(503).json({
      status: 'unhealthy',
      service: 'daily-news-stories',
      error: error instanceof Error ? error.message : 'Unknown error',
      database: {
        connected: false,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
