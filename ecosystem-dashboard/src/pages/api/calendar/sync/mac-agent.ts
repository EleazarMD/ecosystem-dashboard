/**
 * Mac Agent Calendar Sync API
 * 
 * Receives calendar data from the Mac agent running on Mac Studio.
 * This allows syncing Exchange/Outlook calendars that are configured
 * in macOS Calendar.app without requiring direct OAuth access.
 * 
 * POST - Receive calendar sync data from Mac agent
 * GET - Get sync status
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import * as calendarService from '@/lib/calendar';

interface CalendarInfo {
  id: string;
  name: string;
  color?: string;
  account_name: string;
  account_type: string;
  is_subscribed: boolean;
  can_modify: boolean;
}

interface CalendarEvent {
  id: string;
  calendar_id: string;
  calendar_name: string;
  calendar_color?: string;
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  is_recurring: boolean;
  recurrence_rule?: string;
  status: string;
  organizer?: string;
  attendees: Array<{ email: string; name?: string; status?: string }>;
  external_id?: string;
  last_modified: string;
}

interface SyncPayload {
  source: string;
  calendars: CalendarInfo[];
  events: CalendarEvent[];
  sync_timestamp: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const userId = 'default-user'; // TODO: Get from API key or session

  try {
    switch (req.method) {
      case 'POST': {
        const payload = req.body as SyncPayload;

        if (!payload.calendars || !payload.events) {
          return res.status(400).json({ error: 'Missing calendars or events data' });
        }

        console.log(`[Mac Agent Sync] Received ${payload.calendars.length} calendars, ${payload.events.length} events`);

        let eventsCreated = 0;
        let eventsUpdated = 0;
        let calendarsCreated = 0;

        // First, ensure sync account exists for mac_agent
        let syncAccountId: string;
        const existingAccount = await calendarService.pool.query(
          `SELECT id FROM calendar.sync_accounts 
           WHERE owner_id = $1 AND provider = 'mac_agent'`,
          [userId]
        );

        if (existingAccount.rows[0]) {
          syncAccountId = existingAccount.rows[0].id;
          // Update last sync
          await calendarService.pool.query(
            `UPDATE calendar.sync_accounts 
             SET last_sync_at = NOW(), last_sync_status = 'completed'
             WHERE id = $1`,
            [syncAccountId]
          );
        } else {
          // Create sync account
          const newAccount = await calendarService.pool.query(
            `INSERT INTO calendar.sync_accounts (
              owner_id, provider, account_email, account_name,
              sync_enabled, last_sync_at, last_sync_status
            ) VALUES ($1, 'mac_agent', 'mac-studio@local', 'Mac Studio Calendar Agent', true, NOW(), 'completed')
            RETURNING id`,
            [userId]
          );
          syncAccountId = newAccount.rows[0].id;
        }

        // Process calendars
        const calendarIdMap: Record<string, string> = {};

        for (const cal of payload.calendars) {
          // Determine calendar type based on account type
          let calendarType = 'synced_mac';
          if (cal.account_type === 'exchange') {
            calendarType = 'synced_outlook';
          } else if (cal.account_type === 'icloud') {
            calendarType = 'synced_apple';
          } else if (cal.account_type === 'google') {
            calendarType = 'synced_google';
          }

          // Check if calendar exists
          const existingCal = await calendarService.pool.query(
            `SELECT id FROM calendar.calendars 
             WHERE sync_account_id = $1 AND sync_calendar_id = $2`,
            [syncAccountId, cal.id]
          );

          let localCalendarId: string;

          if (existingCal.rows[0]) {
            localCalendarId = existingCal.rows[0].id;
            // Update calendar
            await calendarService.pool.query(
              `UPDATE calendar.calendars 
               SET name = $1, color = $2, last_synced_at = NOW()
               WHERE id = $3`,
              [cal.name, cal.color || '#3B82F6', localCalendarId]
            );
          } else {
            // Create calendar
            const newCal = await calendarService.pool.query(
              `INSERT INTO calendar.calendars (
                owner_id, name, color, calendar_type, sync_enabled,
                sync_source, sync_account_id, sync_calendar_id, last_synced_at
              ) VALUES ($1, $2, $3, $4, true, 'mac_agent', $5, $6, NOW())
              RETURNING id`,
              [userId, cal.name, cal.color || '#3B82F6', calendarType, syncAccountId, cal.id]
            );
            localCalendarId = newCal.rows[0].id;
            calendarsCreated++;
          }

          calendarIdMap[cal.id] = localCalendarId;
        }

        // Process events
        for (const evt of payload.events) {
          const localCalendarId = calendarIdMap[evt.calendar_id];
          if (!localCalendarId) {
            console.warn(`[Mac Agent Sync] Unknown calendar ID: ${evt.calendar_id}`);
            continue;
          }

          // Check if event exists
          const existingEvt = await calendarService.pool.query(
            `SELECT id FROM calendar.events 
             WHERE calendar_id = $1 AND external_id = $2`,
            [localCalendarId, evt.id]
          );

          // Map status
          let status = 'confirmed';
          if (evt.status?.toLowerCase().includes('tentative')) {
            status = 'tentative';
          } else if (evt.status?.toLowerCase().includes('cancel')) {
            status = 'cancelled';
          }

          if (existingEvt.rows[0]) {
            // Update event
            await calendarService.pool.query(
              `UPDATE calendar.events SET
                title = $1, description = $2, location = $3,
                start_time = $4, end_time = $5, all_day = $6,
                recurrence_rule = $7, status = $8, updated_at = NOW()
               WHERE id = $9`,
              [
                evt.title,
                evt.description,
                evt.location,
                evt.start_time,
                evt.end_time,
                evt.all_day,
                evt.recurrence_rule,
                status,
                existingEvt.rows[0].id,
              ]
            );
            eventsUpdated++;
          } else {
            // Create event
            await calendarService.pool.query(
              `INSERT INTO calendar.events (
                calendar_id, title, description, location,
                start_time, end_time, all_day, recurrence_rule,
                status, external_id, external_source, created_by
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'mac_agent', $11)`,
              [
                localCalendarId,
                evt.title,
                evt.description,
                evt.location,
                evt.start_time,
                evt.end_time,
                evt.all_day,
                evt.recurrence_rule,
                status,
                evt.id,
                userId,
              ]
            );
            eventsCreated++;
          }
        }

        // Log sync result
        await calendarService.pool.query(
          `INSERT INTO calendar.sync_logs (
            sync_account_id, sync_type, direction, status,
            events_created, events_updated, completed_at, duration_ms
          ) VALUES ($1, 'incremental', 'inbound', 'completed', $2, $3, NOW(), 0)`,
          [syncAccountId, eventsCreated, eventsUpdated]
        );

        console.log(`[Mac Agent Sync] Complete: ${eventsCreated} created, ${eventsUpdated} updated, ${calendarsCreated} calendars`);

        return res.status(200).json({
          success: true,
          calendars_synced: payload.calendars.length,
          calendars_created: calendarsCreated,
          events_created: eventsCreated,
          events_updated: eventsUpdated,
        });
      }

      case 'GET': {
        // Get sync status
        const accountResult = await calendarService.pool.query(
          `SELECT id, last_sync_at, last_sync_status, last_sync_error
           FROM calendar.sync_accounts 
           WHERE owner_id = $1 AND provider = 'mac_agent'`,
          [userId]
        );

        if (!accountResult.rows[0]) {
          return res.status(200).json({
            configured: false,
            message: 'Mac agent calendar sync not configured',
          });
        }

        const account = accountResult.rows[0];

        // Get calendar count
        const calendarCount = await calendarService.pool.query(
          `SELECT COUNT(*) as count FROM calendar.calendars 
           WHERE sync_account_id = $1`,
          [account.id]
        );

        // Get recent sync logs
        const recentLogs = await calendarService.pool.query(
          `SELECT * FROM calendar.sync_logs 
           WHERE sync_account_id = $1 
           ORDER BY completed_at DESC LIMIT 5`,
          [account.id]
        );

        return res.status(200).json({
          configured: true,
          last_sync: account.last_sync_at,
          last_status: account.last_sync_status,
          last_error: account.last_sync_error,
          calendars_count: parseInt(calendarCount.rows[0].count),
          recent_syncs: recentLogs.rows,
        });
      }

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Mac agent calendar sync error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: (error as Error).message,
    });
  }
}
