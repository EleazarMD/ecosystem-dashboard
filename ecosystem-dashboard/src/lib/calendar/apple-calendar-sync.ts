/**
 * Apple Calendar Sync Service
 * Handles bidirectional sync with Apple Calendar via CalDAV
 * 
 * Uses the IETF CalDAV standard (RFC 4791) for iCloud Calendar access
 */

import { pool } from './db';
import type { 
  SyncAccount, 
  CalendarEvent, 
  Calendar,
  DiscoveredCalendar 
} from './calendar-service';

// ============================================
// TYPES
// ============================================

export interface CalDAVConfig {
  serverUrl: string;
  username: string;
  password: string;
}

export interface CalDAVCalendar {
  href: string;
  displayName: string;
  color?: string;
  ctag?: string;
}

export interface CalDAVEvent {
  uid: string;
  etag: string;
  href: string;
  icalData: string;
}

export interface SyncResult {
  success: boolean;
  eventsCreated: number;
  eventsUpdated: number;
  eventsDeleted: number;
  conflictsDetected: number;
  errors: string[];
}

// ============================================
// CALDAV CONSTANTS
// ============================================

const APPLE_CALDAV_URL = 'https://caldav.icloud.com';
const CALDAV_NAMESPACE = 'urn:ietf:params:xml:ns:caldav';
const DAV_NAMESPACE = 'DAV:';

// ============================================
// CALDAV CLIENT
// ============================================

export class AppleCalendarClient {
  private config: CalDAVConfig;
  private principalUrl: string | null = null;
  private calendarHomeUrl: string | null = null;

  constructor(config: CalDAVConfig) {
    this.config = config;
  }

  private getAuthHeader(): string {
    const credentials = Buffer.from(
      `${this.config.username}:${this.config.password}`
    ).toString('base64');
    return `Basic ${credentials}`;
  }

  private async makeRequest(
    method: string,
    url: string,
    body?: string,
    depth?: number
  ): Promise<Response> {
    const headers: Record<string, string> = {
      'Authorization': this.getAuthHeader(),
      'Content-Type': 'application/xml; charset=utf-8',
    };

    if (depth !== undefined) {
      headers['Depth'] = depth.toString();
    }

    console.log(`[CalDAV] ${method} ${url}`);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body,
      });

      console.log(`[CalDAV] Response: ${response.status} ${response.statusText}`);

      if (!response.ok && response.status !== 207) {
        const errorText = await response.text();
        console.error(`[CalDAV] Error response:`, errorText.substring(0, 500));
        throw new Error(`CalDAV request failed: ${response.status} ${response.statusText}`);
      }

      return response;
    } catch (error) {
      console.error(`[CalDAV] Request error:`, error);
      throw error;
    }
  }

  /**
   * Discover the principal URL for the user
   */
  async discoverPrincipal(): Promise<string> {
    if (this.principalUrl) return this.principalUrl;

    const body = `<?xml version="1.0" encoding="utf-8"?>
      <d:propfind xmlns:d="DAV:">
        <d:prop>
          <d:current-user-principal/>
        </d:prop>
      </d:propfind>`;

    const response = await this.makeRequest('PROPFIND', this.config.serverUrl, body, 0);
    const text = await response.text();
    
    console.log('[CalDAV] Principal response:', text.substring(0, 800));
    
    // Parse XML to extract principal URL from current-user-principal element
    // Apple returns: <current-user-principal xmlns="DAV:"><href xmlns="DAV:">/123/principal/</href>
    const principalMatch = text.match(/<current-user-principal[^>]*>[\s\S]*?<(?:d:)?href[^>]*>([^<]+)<\/(?:d:)?href>/i);
    if (!principalMatch) {
      throw new Error('Could not discover principal URL from response');
    }

    this.principalUrl = new URL(principalMatch[1], this.config.serverUrl).href;
    console.log('[CalDAV] Discovered principal URL:', this.principalUrl);
    return this.principalUrl;
  }

  /**
   * Discover the calendar home URL
   */
  async discoverCalendarHome(): Promise<string> {
    if (this.calendarHomeUrl) return this.calendarHomeUrl;

    const principalUrl = await this.discoverPrincipal();

    const body = `<?xml version="1.0" encoding="utf-8"?>
      <d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
        <d:prop>
          <c:calendar-home-set/>
        </d:prop>
      </d:propfind>`;

    const response = await this.makeRequest('PROPFIND', principalUrl, body, 0);
    const text = await response.text();

    console.log('[CalDAV] Calendar home response:', text.substring(0, 800));

    // Look for calendar-home-set which contains the calendar home URL
    // Apple returns: <calendar-home-set xmlns="..."><href xmlns="DAV:">https://p120-caldav.icloud.com/...</href>
    const calendarHomeMatch = text.match(/<calendar-home-set[^>]*>[\s\S]*?<(?:d:)?href[^>]*>([^<]+)<\/(?:d:)?href>/i);
    
    if (calendarHomeMatch) {
      const homeUrl = calendarHomeMatch[1];
      // Check if it's a full URL or relative path
      this.calendarHomeUrl = homeUrl.startsWith('http') ? homeUrl : new URL(homeUrl, this.config.serverUrl).href;
      console.log('[CalDAV] Discovered calendar home URL:', this.calendarHomeUrl);
      return this.calendarHomeUrl;
    }

    // Fallback: try to find any href that looks like a calendars path
    const hrefMatches = text.match(/<(?:d:)?href[^>]*>([^<]+)<\/(?:d:)?href>/g) || [];
    for (const match of hrefMatches) {
      const hrefValue = match.match(/<(?:d:)?href[^>]*>([^<]+)<\/(?:d:)?href>/)?.[1];
      if (hrefValue && hrefValue.includes('/calendars/')) {
        this.calendarHomeUrl = hrefValue.startsWith('http') ? hrefValue : new URL(hrefValue, this.config.serverUrl).href;
        console.log('[CalDAV] Discovered calendar home URL (fallback):', this.calendarHomeUrl);
        return this.calendarHomeUrl;
      }
    }

    throw new Error('Could not discover calendar home URL');
  }

  /**
   * List all calendars for the user
   */
  async listCalendars(): Promise<CalDAVCalendar[]> {
    const homeUrl = await this.discoverCalendarHome();

    const body = `<?xml version="1.0" encoding="utf-8"?>
      <d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:cs="http://calendarserver.org/ns/" xmlns:x="http://apple.com/ns/ical/">
        <d:prop>
          <d:displayname/>
          <d:resourcetype/>
          <cs:getctag/>
          <x:calendar-color/>
        </d:prop>
      </d:propfind>`;

    const response = await this.makeRequest('PROPFIND', homeUrl, body, 1);
    const text = await response.text();

    console.log('[CalDAV] List calendars response length:', text.length);

    const calendars: CalDAVCalendar[] = [];
    
    // Parse multistatus response - handle both prefixed and non-prefixed
    const responses = text.split(/<(?:d:)?response[^>]*>/g).slice(1);
    
    console.log('[CalDAV] Found', responses.length, 'response elements');
    
    for (const resp of responses) {
      const hrefMatch = resp.match(/<(?:d:)?href[^>]*>([^<]+)<\/(?:d:)?href>/);
      const displayNameMatch = resp.match(/<(?:d:)?displayname[^>]*>([^<]*)<\/(?:d:)?displayname>/i);
      const colorMatch = resp.match(/<(?:x:)?calendar-color[^>]*>([^<]*)<\/(?:x:)?calendar-color>/i);
      const ctagMatch = resp.match(/<(?:cs:)?getctag[^>]*>([^<]*)<\/(?:cs:)?getctag>/i);
      // Check for calendar resource type - Apple uses non-prefixed
      const isCalendar = resp.includes('<calendar') || resp.includes(':calendar/>') || resp.includes(':calendar ');

      if (hrefMatch && isCalendar) {
        calendars.push({
          href: hrefMatch[1],
          displayName: displayNameMatch?.[1] || 'Untitled Calendar',
          color: colorMatch?.[1]?.substring(0, 7),
          ctag: ctagMatch?.[1],
        });
      }
    }

    return calendars;
  }

  /**
   * Get all events from a calendar
   */
  async getEvents(calendarHref: string, startDate?: Date, endDate?: Date): Promise<CalDAVEvent[]> {
    // Use the calendar home URL if discovered, otherwise fall back to server URL
    // Apple's calendar hrefs need to be resolved against the calendar home server (p120-caldav.icloud.com)
    const baseUrl = this.calendarHomeUrl || this.config.serverUrl;
    const calendarUrl = calendarHref.startsWith('http') ? calendarHref : new URL(calendarHref, baseUrl).href;
    
    console.log('[CalDAV] Getting events from:', calendarUrl);

    let timeRange = '';
    if (startDate && endDate) {
      const start = startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const end = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      timeRange = `<c:time-range start="${start}" end="${end}"/>`;
    }

    const body = `<?xml version="1.0" encoding="utf-8"?>
      <c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
        <d:prop>
          <d:getetag/>
          <c:calendar-data/>
        </d:prop>
        <c:filter>
          <c:comp-filter name="VCALENDAR">
            <c:comp-filter name="VEVENT">
              ${timeRange}
            </c:comp-filter>
          </c:comp-filter>
        </c:filter>
      </c:calendar-query>`;

    const response = await this.makeRequest('REPORT', calendarUrl, body, 1);
    const text = await response.text();

    const events: CalDAVEvent[] = [];
    
    // Handle both prefixed (d:response) and non-prefixed (response) XML from Apple
    const responses = text.split(/<(?:d:)?response[^>]*>/g).slice(1);
    
    console.log('[CalDAV] Parsing', responses.length, 'event responses');

    for (const resp of responses) {
      // Handle both prefixed and non-prefixed elements
      const hrefMatch = resp.match(/<(?:d:)?href[^>]*>([^<]+)<\/(?:d:)?href>/);
      const etagMatch = resp.match(/<(?:d:)?getetag[^>]*>"?([^"<]+)"?<\/(?:d:)?getetag>/i);
      const dataMatch = resp.match(/<(?:c:|cal:)?calendar-data[^>]*>([\s\S]*?)<\/(?:c:|cal:)?calendar-data>/i);

      if (hrefMatch && dataMatch) {
        const icalData = dataMatch[1]
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .trim();

        const uidMatch = icalData.match(/UID:([^\r\n]+)/);

        events.push({
          uid: uidMatch?.[1] || hrefMatch[1],
          etag: etagMatch?.[1] || '',
          href: hrefMatch[1],
          icalData,
        });
      }
    }

    console.log('[CalDAV] Parsed', events.length, 'events from calendar');
    return events;
  }

  /**
   * Create or update an event
   */
  async putEvent(calendarHref: string, uid: string, icalData: string, etag?: string): Promise<string> {
    const eventUrl = new URL(`${calendarHref}${uid}.ics`, this.config.serverUrl).href;

    const headers: Record<string, string> = {
      'Authorization': this.getAuthHeader(),
      'Content-Type': 'text/calendar; charset=utf-8',
    };

    if (etag) {
      headers['If-Match'] = `"${etag}"`;
    } else {
      headers['If-None-Match'] = '*';
    }

    const response = await fetch(eventUrl, {
      method: 'PUT',
      headers,
      body: icalData,
    });

    if (!response.ok) {
      throw new Error(`Failed to put event: ${response.status}`);
    }

    return response.headers.get('ETag') || '';
  }

  /**
   * Delete an event
   */
  async deleteEvent(eventHref: string, etag?: string): Promise<void> {
    const eventUrl = new URL(eventHref, this.config.serverUrl).href;

    const headers: Record<string, string> = {
      'Authorization': this.getAuthHeader(),
    };

    if (etag) {
      headers['If-Match'] = `"${etag}"`;
    }

    const response = await fetch(eventUrl, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete event: ${response.status}`);
    }
  }
}

// ============================================
// ICAL PARSER/GENERATOR
// ============================================

export function parseICalEvent(icalData: string): Partial<CalendarEvent> {
  const event: Partial<CalendarEvent> = {};

  const getValue = (property: string): string | undefined => {
    const regex = new RegExp(`${property}[^:]*:([^\\r\\n]+)`, 'i');
    const match = icalData.match(regex);
    return match?.[1];
  };

  const parseDateTime = (value: string | undefined, icalData: string, property: string): string | undefined => {
    if (!value) return undefined;
    
    // Extract TZID if present: DTSTART;TZID=America/Chicago:20251218T090000
    const tzidMatch = icalData.match(new RegExp(`${property};TZID=([^:]+):`));
    const tzid = tzidMatch?.[1];
    
    // Get the date portion after the colon
    const dateStr = value.replace(/.*:/, '');
    
    if (dateStr.length === 8) {
      // All-day event: 20251218
      return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}T00:00:00Z`;
    }
    
    // Parse datetime: 20251218T090000 or 20251218T090000Z
    const year = dateStr.slice(0, 4);
    const month = dateStr.slice(4, 6);
    const day = dateStr.slice(6, 8);
    const hour = dateStr.slice(9, 11);
    const minute = dateStr.slice(11, 13);
    const second = dateStr.slice(13, 15) || '00';
    
    // If already UTC (ends with Z), return as-is
    if (dateStr.endsWith('Z')) {
      return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
    }
    
    // If has TZID, create a date string with timezone offset
    // For now, handle common US timezones; for others, assume local
    if (tzid) {
      // Create ISO string with timezone info for proper parsing
      // The database will store it correctly as TIMESTAMP WITH TIME ZONE
      const localDateStr = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
      
      // Convert local time in the given timezone to UTC using Date API
      // This properly handles DST transitions
      try {
        // Create a date object and use Intl to get the correct offset
        const tempDate = new Date(`${localDateStr}Z`);
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: tzid,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        });
        
        // Get the offset by comparing UTC time with local time in the timezone
        const utcDate = new Date(`${localDateStr}Z`);
        const localParts = formatter.formatToParts(utcDate);
        const getVal = (type: string) => localParts.find(p => p.type === type)?.value || '00';
        
        const localInTz = new Date(
          `${getVal('year')}-${getVal('month')}-${getVal('day')}T${getVal('hour')}:${getVal('minute')}:${getVal('second')}Z`
        );
        
        const offsetMs = localInTz.getTime() - utcDate.getTime();
        const offsetHours = Math.floor(Math.abs(offsetMs) / (1000 * 60 * 60));
        const offsetMins = Math.floor((Math.abs(offsetMs) % (1000 * 60 * 60)) / (1000 * 60));
        const offsetSign = offsetMs >= 0 ? '+' : '-';
        const offsetStr = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;
        
        return `${localDateStr}${offsetStr}`;
      } catch {
        // Fallback for unknown timezones: assume America/Chicago (UTC-6)
        return `${localDateStr}-06:00`;
      }
    }
    
    // No timezone info - assume local time (America/Chicago for this app)
    return `${year}-${month}-${day}T${hour}:${minute}:${second}-06:00`;
  };

  event.external_id = getValue('UID');
  event.title = getValue('SUMMARY') || 'Untitled Event';
  event.description = getValue('DESCRIPTION')?.replace(/\\n/g, '\n');
  event.location = getValue('LOCATION');
  event.start_time = parseDateTime(getValue('DTSTART'), icalData, 'DTSTART');
  event.end_time = parseDateTime(getValue('DTEND'), icalData, 'DTEND');
  event.recurrence_rule = getValue('RRULE');
  
  const dtstart = icalData.match(/DTSTART[^:]*:/)?.[0];
  event.all_day = dtstart?.includes('VALUE=DATE') || false;
  
  const status = getValue('STATUS')?.toLowerCase();
  if (status === 'tentative') event.status = 'tentative';
  else if (status === 'cancelled') event.status = 'cancelled';
  else event.status = 'confirmed';

  return event;
}

export function generateICalEvent(event: CalendarEvent): string {
  const formatDateTime = (dateStr: string, allDay: boolean): string => {
    const date = new Date(dateStr);
    if (allDay) {
      return date.toISOString().slice(0, 10).replace(/-/g, '');
    }
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const uid = event.external_id || event.id;
  const dtstart = formatDateTime(event.start_time, event.all_day);
  const dtend = formatDateTime(event.end_time, event.all_day);
  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  let ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//AI Homelab//Calendar//EN
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dtstamp}`;

  if (event.all_day) {
    ical += `
DTSTART;VALUE=DATE:${dtstart}
DTEND;VALUE=DATE:${dtend}`;
  } else {
    ical += `
DTSTART:${dtstart}
DTEND:${dtend}`;
  }

  ical += `
SUMMARY:${event.title}`;

  if (event.description) {
    ical += `
DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`;
  }

  if (event.location) {
    ical += `
LOCATION:${event.location}`;
  }

  if (event.recurrence_rule) {
    ical += `
RRULE:${event.recurrence_rule}`;
  }

  if (event.status) {
    ical += `
STATUS:${event.status.toUpperCase()}`;
  }

  ical += `
END:VEVENT
END:VCALENDAR`;

  return ical;
}

// ============================================
// SYNC SERVICE
// ============================================

export class AppleCalendarSyncService {
  
  /**
   * Connect a new Apple Calendar account
   */
  async connectAccount(params: {
    owner_id: string;
    username: string;
    password: string; // App-specific password
  }): Promise<SyncAccount> {
    const client = new AppleCalendarClient({
      serverUrl: APPLE_CALDAV_URL,
      username: params.username,
      password: params.password,
    });

    // Verify credentials and discover calendars
    const calendars = await client.listCalendars();

    const discoveredCalendars: DiscoveredCalendar[] = calendars.map(cal => ({
      id: cal.href,
      name: cal.displayName,
      color: cal.color,
      selected: true,
    }));

    // Store account (encrypt password in production!)
    const result = await pool.query(
      `INSERT INTO calendar.sync_accounts (
        owner_id, provider, caldav_url, caldav_username, caldav_password_encrypted,
        account_email, account_name, discovered_calendars, sync_enabled
      ) VALUES ($1, 'apple_calendar', $2, $3, $4, $5, $6, $7, true)
      RETURNING *`,
      [
        params.owner_id,
        APPLE_CALDAV_URL,
        params.username,
        params.password, // TODO: Encrypt this!
        params.username,
        'Apple Calendar',
        JSON.stringify(discoveredCalendars),
      ]
    );

    // Create local calendars for each discovered calendar
    for (const cal of discoveredCalendars) {
      await pool.query(
        `INSERT INTO calendar.calendars (
          owner_id, name, calendar_type, sync_enabled, sync_source,
          sync_account_id, sync_calendar_id, color
        ) VALUES ($1, $2, 'synced_apple', true, 'apple_calendar', $3, $4, $5)
        ON CONFLICT DO NOTHING`,
        [params.owner_id, cal.name, result.rows[0].id, cal.id, cal.color || '#3B82F6']
      );
    }

    return result.rows[0];
  }

  /**
   * Force full re-sync by clearing etags first
   * This ensures all events are re-parsed with current timezone handling
   */
  async forceFullResync(syncAccountId: string): Promise<SyncResult> {
    // Clear all etags for this sync account's calendars to force re-processing
    await pool.query(
      `UPDATE calendar.events e
       SET external_etag = NULL
       FROM calendar.calendars c
       WHERE e.calendar_id = c.id
         AND c.sync_account_id = $1`,
      [syncAccountId]
    );
    
    // Now run normal sync - all events will be updated since etags are cleared
    return this.syncFromApple(syncAccountId);
  }

  /**
   * Sync events from Apple Calendar
   */
  async syncFromApple(syncAccountId: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
      conflictsDetected: 0,
      errors: [],
    };

    try {
      // Get sync account
      const accountResult = await pool.query(
        `SELECT * FROM calendar.sync_accounts WHERE id = $1`,
        [syncAccountId]
      );
      
      if (!accountResult.rows[0]) {
        throw new Error('Sync account not found');
      }

      const account = accountResult.rows[0];

      const client = new AppleCalendarClient({
        serverUrl: account.caldav_url,
        username: account.caldav_username,
        password: account.caldav_password_encrypted, // TODO: Decrypt!
      });

      // Discover calendar home URL first (needed for proper event fetching)
      await client.discoverCalendarHome();

      // Get local calendars linked to this account
      const calendarsResult = await pool.query(
        `SELECT * FROM calendar.calendars WHERE sync_account_id = $1`,
        [syncAccountId]
      );

      // Sync each calendar
      for (const calendar of calendarsResult.rows) {
        try {
          // Get events from Apple Calendar (last 30 days to next 90 days)
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - 30);
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + 90);

          const appleEvents = await client.getEvents(
            calendar.sync_calendar_id,
            startDate,
            endDate
          );

          // Process each event
          for (const appleEvent of appleEvents) {
            const parsed = parseICalEvent(appleEvent.icalData);

            // Check if event exists locally
            const existingResult = await pool.query(
              `SELECT * FROM calendar.events 
               WHERE calendar_id = $1 AND external_id = $2`,
              [calendar.id, parsed.external_id]
            );

            if (existingResult.rows[0]) {
              // Update existing event if etag changed
              if (existingResult.rows[0].external_etag !== appleEvent.etag) {
                await pool.query(
                  `UPDATE calendar.events SET
                    title = $1, description = $2, location = $3,
                    start_time = $4, end_time = $5, all_day = $6,
                    recurrence_rule = $7, status = $8, external_etag = $9
                   WHERE id = $10`,
                  [
                    parsed.title,
                    parsed.description,
                    parsed.location,
                    parsed.start_time,
                    parsed.end_time,
                    parsed.all_day,
                    parsed.recurrence_rule,
                    parsed.status,
                    appleEvent.etag,
                    existingResult.rows[0].id,
                  ]
                );
                result.eventsUpdated++;
              }
            } else {
              // Create new event
              await pool.query(
                `INSERT INTO calendar.events (
                  calendar_id, title, description, location,
                  start_time, end_time, all_day, recurrence_rule,
                  status, external_id, external_source, external_etag, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'apple_calendar', $11, $12)`,
                [
                  calendar.id,
                  parsed.title,
                  parsed.description,
                  parsed.location,
                  parsed.start_time,
                  parsed.end_time,
                  parsed.all_day,
                  parsed.recurrence_rule,
                  parsed.status,
                  parsed.external_id,
                  appleEvent.etag,
                  account.owner_id,
                ]
              );
              result.eventsCreated++;
            }
          }

          // Find deleted events (events in local DB but not in Apple)
          const appleUids = new Set(appleEvents.map(e => e.uid));
          const localEventsResult = await pool.query(
            `SELECT id, external_id FROM calendar.events 
             WHERE calendar_id = $1 AND external_source = 'apple_calendar'`,
            [calendar.id]
          );

          for (const localEvent of localEventsResult.rows) {
            if (!appleUids.has(localEvent.external_id)) {
              await pool.query(
                `UPDATE calendar.events SET archived = true WHERE id = $1`,
                [localEvent.id]
              );
              result.eventsDeleted++;
            }
          }

        } catch (calError) {
          result.errors.push(`Calendar ${calendar.name}: ${(calError as Error).message}`);
        }
      }

      // Update last sync timestamp
      await pool.query(
        `UPDATE calendar.sync_accounts 
         SET last_sync_at = NOW(), last_sync_status = 'completed'
         WHERE id = $1`,
        [syncAccountId]
      );

      // Log sync result
      await pool.query(
        `INSERT INTO calendar.sync_logs (
          sync_account_id, sync_type, direction, status,
          events_created, events_updated, events_deleted,
          completed_at, duration_ms
        ) VALUES ($1, 'incremental', 'inbound', 'completed', $2, $3, $4, NOW(), 0)`,
        [syncAccountId, result.eventsCreated, result.eventsUpdated, result.eventsDeleted]
      );

      result.success = true;

    } catch (error) {
      result.errors.push((error as Error).message);
      
      await pool.query(
        `UPDATE calendar.sync_accounts 
         SET last_sync_status = 'failed', last_sync_error = $1
         WHERE id = $2`,
        [(error as Error).message, syncAccountId]
      );
    }

    return result;
  }

  /**
   * Push a local event to Apple Calendar
   */
  async pushToApple(eventId: string): Promise<boolean> {
    try {
      // Get event with calendar info
      const eventResult = await pool.query(
        `SELECT e.*, c.sync_account_id, c.sync_calendar_id
         FROM calendar.events e
         JOIN calendar.calendars c ON e.calendar_id = c.id
         WHERE e.id = $1 AND c.sync_source = 'apple_calendar'`,
        [eventId]
      );

      if (!eventResult.rows[0]) {
        return false;
      }

      const event = eventResult.rows[0];

      // Get sync account
      const accountResult = await pool.query(
        `SELECT * FROM calendar.sync_accounts WHERE id = $1`,
        [event.sync_account_id]
      );

      if (!accountResult.rows[0]) {
        return false;
      }

      const account = accountResult.rows[0];

      const client = new AppleCalendarClient({
        serverUrl: account.caldav_url,
        username: account.caldav_username,
        password: account.caldav_password_encrypted,
      });

      // Generate iCal data
      const icalData = generateICalEvent(event);

      // Push to Apple Calendar
      const newEtag = await client.putEvent(
        event.sync_calendar_id,
        event.external_id || event.id,
        icalData,
        event.external_etag
      );

      // Update local event with new etag
      await pool.query(
        `UPDATE calendar.events 
         SET external_id = COALESCE(external_id, $1), external_etag = $2
         WHERE id = $3`,
        [event.id, newEtag, eventId]
      );

      return true;

    } catch (error) {
      console.error('Failed to push event to Apple Calendar:', error);
      return false;
    }
  }

  /**
   * Delete event from Apple Calendar
   */
  async deleteFromApple(eventId: string): Promise<boolean> {
    try {
      const eventResult = await pool.query(
        `SELECT e.*, c.sync_account_id, c.sync_calendar_id
         FROM calendar.events e
         JOIN calendar.calendars c ON e.calendar_id = c.id
         WHERE e.id = $1`,
        [eventId]
      );

      if (!eventResult.rows[0] || !eventResult.rows[0].external_id) {
        return false;
      }

      const event = eventResult.rows[0];

      const accountResult = await pool.query(
        `SELECT * FROM calendar.sync_accounts WHERE id = $1`,
        [event.sync_account_id]
      );

      if (!accountResult.rows[0]) {
        return false;
      }

      const account = accountResult.rows[0];

      const client = new AppleCalendarClient({
        serverUrl: account.caldav_url,
        username: account.caldav_username,
        password: account.caldav_password_encrypted,
      });

      await client.deleteEvent(
        `${event.sync_calendar_id}${event.external_id}.ics`,
        event.external_etag
      );

      return true;

    } catch (error) {
      console.error('Failed to delete event from Apple Calendar:', error);
      return false;
    }
  }
}

// Export singleton instance
export const appleCalendarSync = new AppleCalendarSyncService();
