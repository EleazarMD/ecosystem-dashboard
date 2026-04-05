/**
 * News Pipeline Status API
 * GET /api/news/pipeline/status - Get current pipeline status
 * 
 * Returns:
 * - Current status (active, paused, disabled)
 * - Last run time and result
 * - Next scheduled run
 * - Today's statistics
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

  const userId = 'eleazar';

  try {
    // Get settings
    const settingsResult = await pool.query(
      `SELECT settings FROM news.pipeline_settings WHERE user_id = $1`,
      [userId]
    );
    
    const settings = settingsResult.rows[0]?.settings || {
      pipeline: { enabled: true, paused: false, pause_until: null }
    };

    // Determine status
    let status: 'active' | 'paused' | 'disabled' = 'active';
    if (!settings.pipeline.enabled) {
      status = 'disabled';
    } else if (settings.pipeline.paused) {
      // Check if pause has expired
      if (settings.pipeline.pause_until) {
        const pauseUntil = new Date(settings.pipeline.pause_until);
        if (pauseUntil > new Date()) {
          status = 'paused';
        }
      } else {
        status = 'paused';
      }
    }

    // Get last run info
    const lastRunResult = await pool.query(
      `SELECT id, created_at, status, story_count, error_message
       FROM news.pipeline_runs
       ORDER BY created_at DESC
       LIMIT 1`
    );
    
    const lastRun = lastRunResult.rows[0] || null;

    // Get today's stats
    const todayStatsResult = await pool.query(
      `SELECT 
         COUNT(*) as stories_today,
         COALESCE(SUM(generation_cost), 0) as cost_today
       FROM news.daily_stories
       WHERE created_at >= CURRENT_DATE`
    );
    
    const todayStats = todayStatsResult.rows[0] || { stories_today: 0, cost_today: 0 };

    // Get errors in last 24h
    const errorsResult = await pool.query(
      `SELECT COUNT(*) as error_count
       FROM news.pipeline_runs
       WHERE created_at >= NOW() - INTERVAL '24 hours'
         AND status = 'failed'`
    );
    
    const errorsLast24h = parseInt(errorsResult.rows[0]?.error_count || '0');

    // Calculate next run time
    const nextRun = calculateNextRun(settings);

    return res.status(200).json({
      status,
      pause_reason: settings.pipeline.pause_reason,
      pause_until: settings.pipeline.pause_until,
      last_run: lastRun ? {
        id: lastRun.id,
        time: lastRun.created_at,
        status: lastRun.status,
        story_count: lastRun.story_count,
        error: lastRun.error_message,
      } : null,
      next_run: nextRun,
      stories_today: parseInt(todayStats.stories_today),
      cost_today: parseFloat(todayStats.cost_today),
      errors_last_24h: errorsLast24h,
      schedule: settings.pipeline.schedule,
    });

  } catch (error) {
    console.error('Error fetching pipeline status:', error);
    return res.status(500).json({
      error: 'Failed to fetch pipeline status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

function calculateNextRun(settings: any): string | null {
  if (!settings.pipeline.enabled || settings.pipeline.paused) {
    return null;
  }

  const now = new Date();
  const timezone = settings.pipeline.schedule?.morning?.timezone || 'America/Chicago';
  
  // Get current time in target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  
  const currentTime = formatter.format(now);
  const [currentHour, currentMinute] = currentTime.split(':').map(Number);
  const currentMinutes = currentHour * 60 + currentMinute;

  const schedule = settings.pipeline.schedule || {};
  const runs: { time: string; minutes: number }[] = [];

  if (schedule.morning?.enabled) {
    const [h, m] = schedule.morning.time.split(':').map(Number);
    runs.push({ time: schedule.morning.time, minutes: h * 60 + m });
  }
  
  if (schedule.afternoon?.enabled) {
    const [h, m] = schedule.afternoon.time.split(':').map(Number);
    runs.push({ time: schedule.afternoon.time, minutes: h * 60 + m });
  }

  // Sort by time
  runs.sort((a, b) => a.minutes - b.minutes);

  // Find next run
  for (const run of runs) {
    if (run.minutes > currentMinutes) {
      // Today
      const nextDate = new Date(now);
      const [h, m] = run.time.split(':').map(Number);
      nextDate.setHours(h, m, 0, 0);
      return nextDate.toISOString();
    }
  }

  // Tomorrow's first run
  if (runs.length > 0) {
    const nextDate = new Date(now);
    nextDate.setDate(nextDate.getDate() + 1);
    const [h, m] = runs[0].time.split(':').map(Number);
    nextDate.setHours(h, m, 0, 0);
    return nextDate.toISOString();
  }

  return null;
}
