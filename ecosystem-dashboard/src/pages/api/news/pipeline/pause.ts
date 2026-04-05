/**
 * News Pipeline Pause API
 * POST /api/news/pipeline/pause - Pause the pipeline
 * 
 * Body:
 * - reason: string (optional) - Why pausing
 * - until: string (optional) - ISO date to auto-resume
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = 'eleazar';
  const { reason, until } = req.body;

  try {
    // Get current settings
    const result = await pool.query(
      `SELECT settings FROM news.pipeline_settings WHERE user_id = $1`,
      [userId]
    );

    const settings = result.rows[0]?.settings || { pipeline: {} };
    
    // Update pause state
    settings.pipeline.paused = true;
    settings.pipeline.pause_reason = reason || null;
    settings.pipeline.pause_until = until || null;

    // Save
    await pool.query(
      `INSERT INTO news.pipeline_settings (user_id, settings, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         settings = $2,
         updated_at = NOW()`,
      [userId, JSON.stringify(settings)]
    );

    console.log(`⏸️ News pipeline paused${until ? ` until ${until}` : ''}`);

    return res.status(200).json({
      success: true,
      status: 'paused',
      pause_reason: reason,
      pause_until: until,
    });

  } catch (error) {
    console.error('Error pausing pipeline:', error);
    return res.status(500).json({
      error: 'Failed to pause pipeline',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
