/**
 * Calendar Events API
 * GET /api/calendar/events - Get events for date range
 * POST /api/calendar/events - Create a new event
 * 
 * Multi-tenant routing:
 * - Admin users: Proxies to Hermes Core (Mac Studio sync)
 * - Other users: Fetches from their connected OAuth calendar accounts
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getMobileOrSessionUserId } from '@/lib/mobile-auth';
import { Pool } from 'pg';
import { hermesFetch } from '@/lib/hermes-client';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

const HERMES_CORE_URL = process.env.HERMES_CORE_URL || 'http://localhost:8780';
const ADMIN_USER_ID = process.env.ADMIN_USER_ID;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  
  // Support both session auth (web) and API key auth (mobile)
  const owner_id = getMobileOrSessionUserId(session?.user?.id, req);
  
  if (!owner_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const isAdmin = owner_id === ADMIN_USER_ID || (session?.user as any)?.role === 'admin';
  
  console.log('[Calendar Events API]', {
    owner_id,
    ADMIN_USER_ID,
    isAdmin,
    method: req.method,
  });

  try {
    if (req.method === 'GET') {
      const { start_date, end_date, calendar_ids } = req.query;

      // Admin: Fetch from Hermes Core
      if (isAdmin) {
        const params = new URLSearchParams();
        
        if (start_date) params.append('start_date', start_date as string);
        if (end_date) params.append('end_date', end_date as string);
        
        // Note: Hermes Core doesn't support filtering by multiple calendar_ids
        // We fetch all events and let the frontend filter by selectedCalendars

        const hermesPath = `/v1/calendar/events?${params}`;
        console.log('[Calendar Events API] Fetching from Hermes Core:', hermesPath);
        
        const response = await hermesFetch(hermesPath);
        
        console.log('[Calendar Events API] Hermes Core response:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('[Calendar Events API] Events received:', data.events?.length || 0);
          const events = (data.events || []).map((evt: any) => ({
            id: evt.id,
            calendar_id: evt.calendar_id,
            calendar_name: evt.calendar_name,
            calendar_color: evt.calendar_color,
            calendar_type: 'synced',
            title: evt.title,
            description: evt.description,
            location: evt.location,
            start_time: evt.start_time,
            end_time: evt.end_time,
            all_day: evt.all_day || false,
            status: evt.status || 'confirmed',
            priority: 'normal',
            attendees: evt.attendees || [],
            ai_extracted: evt.source === 'goose_mind_agent',
          }));
          
          // Disable caching for calendar events
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          
          return res.status(200).json({ events });
        } else {
          console.error('Hermes Core events fetch failed:', response.status);
          return res.status(200).json({ events: [] });
        }
      }

      // Other users: Fetch from their OAuth calendars
      const start = start_date ? new Date(start_date as string) : new Date();
      const end = end_date ? new Date(end_date as string) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      const events = await getUserEvents(owner_id, start, end);
      
      // Disable caching for calendar events
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      return res.status(200).json({ events });
    }

    if (req.method === 'POST') {
      const {
        calendar_id,
        title,
        start_time,
        end_time,
        description,
        location,
        all_day,
        attendees,
      } = req.body;

      if (!title || !start_time || !end_time) {
        return res.status(400).json({ 
          error: 'title, start_time, and end_time are required' 
        });
      }

      // Create event via Hermes Core
      const response = await hermesFetch('/v1/calendar/events', {
        method: 'POST',
        body: JSON.stringify({
          calendar_id: calendar_id || '21', // Default to Exchange calendar
          title,
          description,
          location,
          start_time,
          end_time,
          all_day: all_day || false,
          attendees: attendees || [],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return res.status(201).json({ event: data });
      } else {
        const error = await response.json();
        return res.status(response.status).json(error);
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Calendar events API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: (error as Error).message,
    });
  }
}

/**
 * Get events from user's connected OAuth calendar accounts
 */
async function getUserEvents(userId: string, startDate: Date, endDate: Date) {
  try {
    // Get user's sync accounts with access tokens
    const accountsResult = await pool.query(`
      SELECT id, provider, access_token, account_email
      FROM calendar_sync_accounts
      WHERE user_id = $1 AND sync_enabled = true
    `, [userId]);

    if (accountsResult.rows.length === 0) {
      return [];
    }

    const allEvents: any[] = [];

    // Fetch events from each provider
    for (const account of accountsResult.rows) {
      try {
        if (account.provider === 'google') {
          const events = await fetchGoogleEvents(account, startDate, endDate);
          allEvents.push(...events);
        } else if (account.provider === 'microsoft') {
          const events = await fetchMicrosoftEvents(account, startDate, endDate);
          allEvents.push(...events);
        }
      } catch (error) {
        console.error(`Failed to fetch events from ${account.provider}:`, error);
      }
    }

    return allEvents;
  } catch (error: any) {
    if (error.code === '42P01') {
      return [];
    }
    throw error;
  }
}

async function fetchGoogleEvents(account: any, startDate: Date, endDate: Date) {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
    `timeMin=${startDate.toISOString()}&timeMax=${endDate.toISOString()}&singleEvents=true&orderBy=startTime`,
    { headers: { Authorization: `Bearer ${account.access_token}` } }
  );

  if (!response.ok) return [];

  const data = await response.json();
  return (data.items || []).map((evt: any) => ({
    id: evt.id,
    calendar_id: account.id,
    calendar_name: 'Google Calendar',
    calendar_color: '#4285F4',
    calendar_type: 'google',
    title: evt.summary || 'Untitled',
    description: evt.description,
    location: evt.location,
    start_time: evt.start.dateTime || evt.start.date,
    end_time: evt.end.dateTime || evt.end.date,
    all_day: !evt.start.dateTime,
    status: evt.status || 'confirmed',
    priority: 'normal',
    attendees: (evt.attendees || []).map((a: any) => ({
      email: a.email,
      name: a.displayName,
      response_status: a.responseStatus,
    })),
  }));
}

async function fetchMicrosoftEvents(account: any, startDate: Date, endDate: Date) {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendarView?` +
    `startDateTime=${startDate.toISOString()}&endDateTime=${endDate.toISOString()}`,
    { headers: { Authorization: `Bearer ${account.access_token}` } }
  );

  if (!response.ok) return [];

  const data = await response.json();
  return (data.value || []).map((evt: any) => ({
    id: evt.id,
    calendar_id: account.id,
    calendar_name: 'Outlook Calendar',
    calendar_color: '#00A4EF',
    calendar_type: 'microsoft',
    title: evt.subject || 'Untitled',
    description: evt.bodyPreview,
    location: evt.location?.displayName,
    start_time: evt.start.dateTime,
    end_time: evt.end.dateTime,
    all_day: evt.isAllDay,
    status: evt.isCancelled ? 'cancelled' : 'confirmed',
    priority: 'normal',
    attendees: (evt.attendees || []).map((a: any) => ({
      email: a.emailAddress.address,
      name: a.emailAddress.name,
      response_status: a.status.response,
    })),
  }));
}
