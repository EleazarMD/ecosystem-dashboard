/**
 * Child Calendar API
 * ============================================================================
 * Fetches synced calendar events for a child account from the database.
 *
 * Events are stored by AppleCalendarSyncService in calendar.events table,
 * linked to calendar.calendars which have owner_id = child's user ID.
 *
 * GET /api/child/calendar?start_date=...&end_date=...
 *   Returns calendar events for the authenticated child within the date range.
 *
 * GET /api/child/calendar/calendars
 *   Returns the child's connected calendars.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = (session.user as any).id;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const action = req.query.action as string;

  try {
    if (action === 'calendars') {
      return handleGetCalendars(userId, res);
    }

    return handleGetEvents(userId, req, res);
  } catch (error) {
    console.error('[Child Calendar] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch calendar data' });
  }
}

// ============================================================================
// GET — List child's connected calendars
// ============================================================================

async function handleGetCalendars(userId: string, res: NextApiResponse) {
  try {
    const result = await pool.query(
      `SELECT
         c.id, c.name, c.color, c.calendar_type, c.sync_enabled,
         c.sync_source, c.last_synced_at,
         sa.account_email, sa.provider as sync_provider
       FROM calendar.calendars c
       LEFT JOIN calendar.sync_accounts sa ON c.sync_account_id = sa.id
       WHERE c.owner_id = $1 AND NOT c.archived
       ORDER BY c.calendar_type, c.name`,
      [userId],
    );

    return res.status(200).json({
      calendars: result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        color: row.color || '#3B82F6',
        type: row.calendar_type,
        syncEnabled: row.sync_enabled,
        syncSource: row.sync_source,
        lastSyncedAt: row.last_synced_at,
        accountEmail: row.account_email,
        provider: row.sync_provider,
      })),
    });
  } catch (error) {
    if ((error as any).code === '42P01') {
      return res.status(200).json({ calendars: [] });
    }
    throw error;
  }
}

// ============================================================================
// GET — List events in date range
// ============================================================================

async function handleGetEvents(userId: string, req: NextApiRequest, res: NextApiResponse) {
  const startDate = (req.query.start_date as string) || new Date().toISOString();
  const endDate = (req.query.end_date as string) ||
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const result = await pool.query(
      `SELECT
         e.id, e.title, e.description, e.location,
         e.start_time, e.end_time, e.all_day,
         e.status, e.recurrence_rule,
         e.external_source, e.ical_uid,
         c.name as calendar_name,
         c.color as calendar_color,
         c.id as calendar_id,
         c.calendar_type
       FROM calendar.events e
       JOIN calendar.calendars c ON e.calendar_id = c.id
       WHERE c.owner_id = $1
         AND NOT e.archived
         AND NOT c.archived
         AND e.start_time >= $2
         AND e.start_time <= $3
         AND e.status != 'cancelled'
       ORDER BY e.start_time ASC`,
      [userId, startDate, endDate],
    );

    // Fetch attendees for each event
    const events = [];
    for (const row of result.rows) {
      let attendees: any[] = [];
      try {
        const attResult = await pool.query(
          `SELECT email, name, role, response_status
           FROM calendar.event_attendees
           WHERE event_id = $1`,
          [row.id],
        );
        attendees = attResult.rows;
      } catch { /* table may not exist */ }

      events.push({
        id: row.id,
        calendarId: row.calendar_id,
        calendarName: row.calendar_name,
        calendarColor: row.calendar_color || '#3B82F6',
        calendarType: row.calendar_type,
        title: row.title,
        description: row.description,
        location: row.location,
        startTime: row.start_time,
        endTime: row.end_time,
        allDay: row.all_day,
        status: row.status,
        recurrenceRule: row.recurrence_rule,
        source: row.external_source,
        attendees,
      });
    }

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res.status(200).json({
      events,
      total: events.length,
      startDate,
      endDate,
    });
  } catch (error) {
    if ((error as any).code === '42P01') {
      return res.status(200).json({ events: [], total: 0 });
    }
    throw error;
  }
}
