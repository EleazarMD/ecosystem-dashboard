/**
 * GET /api/home/today-counts
 *
 * Returns live counts for the dashboard home Today widget:
 *   - reminders_4h: exomind_jobs reminders firing in the next 4 hours
 *   - events_today: calendar events today (America/Chicago)
 *   - tasks_open: open pi_planner_tasks
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = (req.headers['x-user-id'] as string) || 'eleazar';

  try {
    const [remindersResult, eventsResult, tasksResult] = await Promise.all([
      // Reminders firing in the next 4 hours
      query(
        `SELECT COUNT(*)::int AS count
           FROM exomind_jobs
          WHERE job_type = 'reminder'
            AND status = 'pending'
            AND reminder_sent = FALSE
            AND reminder_at BETWEEN NOW() AND NOW() + INTERVAL '4 hours'
            AND user_id = $1`,
        [userId],
      ),

      // Calendar events today in America/Chicago
      query(
        `SELECT COUNT(*)::int AS count
           FROM calendar.events e
           JOIN calendar.calendars c ON c.id = e.calendar_id
          WHERE (e.start_time AT TIME ZONE 'America/Chicago')::date
                  = (NOW() AT TIME ZONE 'America/Chicago')::date
            AND (e.status IS NULL OR e.status NOT IN ('cancelled'))
            AND c.owner_id = $1`,
        [userId],
      ),

      // Open tasks (no user_id column on pi_planner_tasks)
      query(
        `SELECT COUNT(*)::int AS count
           FROM pi_planner_tasks
          WHERE status IN ('todo', 'doing', 'in_progress')`,
      ),
    ]);

    return res.status(200).json({
      reminders_4h: remindersResult.rows[0]?.count ?? 0,
      events_today: eventsResult.rows[0]?.count ?? 0,
      tasks_open: tasksResult.rows[0]?.count ?? 0,
    });
  } catch (error) {
    console.error('[today-counts] error:', error);
    return res.status(500).json({
      error: 'Failed to fetch counts',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
