/**
 * Microsoft Outlook Calendar Sync Service
 * Handles bidirectional sync with Outlook/Office 365 via Microsoft Graph API
 * 
 * Uses OAuth 2.0 for authentication and Microsoft Graph API for calendar access
 * https://docs.microsoft.com/en-us/graph/api/resources/calendar
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

export interface MicrosoftOAuthConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string; // 'common' for multi-tenant, or specific tenant ID
  redirectUri: string;
}

export interface MicrosoftTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface OutlookCalendar {
  id: string;
  name: string;
  color?: string;
  changeKey?: string;
  canEdit: boolean;
  isDefaultCalendar: boolean;
  owner?: {
    name: string;
    address: string;
  };
}

export interface OutlookEvent {
  id: string;
  iCalUId: string;
  changeKey: string;
  subject: string;
  body?: {
    contentType: string;
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
  };
  isAllDay: boolean;
  isCancelled: boolean;
  recurrence?: {
    pattern: any;
    range: any;
  };
  attendees?: Array<{
    emailAddress: { name: string; address: string };
    status: { response: string };
  }>;
  organizer?: {
    emailAddress: { name: string; address: string };
  };
  showAs?: string;
  importance?: string;
  sensitivity?: string;
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
// MICROSOFT GRAPH CONSTANTS
// ============================================

const MICROSOFT_GRAPH_URL = 'https://graph.microsoft.com/v1.0';
const MICROSOFT_AUTH_URL = 'https://login.microsoftonline.com';
const SCOPES = [
  'offline_access',
  'Calendars.ReadWrite',
  'User.Read',
].join(' ');

// Color mapping from Outlook to hex
const OUTLOOK_COLORS: Record<string, string> = {
  'auto': '#3B82F6',
  'lightBlue': '#60A5FA',
  'lightGreen': '#4ADE80',
  'lightOrange': '#FB923C',
  'lightGray': '#9CA3AF',
  'lightYellow': '#FACC15',
  'lightTeal': '#2DD4BF',
  'lightPink': '#F472B6',
  'lightBrown': '#A78BFA',
  'lightRed': '#F87171',
  'maxColor': '#3B82F6',
};

// ============================================
// OAUTH HELPER
// ============================================

export class MicrosoftOAuthClient {
  private config: MicrosoftOAuthConfig;

  constructor(config: MicrosoftOAuthConfig) {
    this.config = config;
  }

  /**
   * Generate the authorization URL for user consent
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
      response_mode: 'query',
      scope: SCOPES,
      state,
    });

    return `${MICROSOFT_AUTH_URL}/${this.config.tenantId}/oauth2/v2.0/authorize?${params}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<MicrosoftTokens> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code,
      redirect_uri: this.config.redirectUri,
      grant_type: 'authorization_code',
      scope: SCOPES,
    });

    const response = await fetch(
      `${MICROSOFT_AUTH_URL}/${this.config.tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[Microsoft OAuth] Token exchange failed:', error);
      throw new Error(`Failed to exchange code for tokens: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<MicrosoftTokens> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: SCOPES,
    });

    const response = await fetch(
      `${MICROSOFT_AUTH_URL}/${this.config.tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[Microsoft OAuth] Token refresh failed:', error);
      throw new Error(`Failed to refresh token: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }
}

// ============================================
// MICROSOFT GRAPH CLIENT
// ============================================

export class OutlookCalendarClient {
  private accessToken: string;
  private refreshToken: string;
  private expiresAt: Date;
  private oauthClient: MicrosoftOAuthClient;
  private onTokenRefresh?: (tokens: MicrosoftTokens) => Promise<void>;

  constructor(
    tokens: MicrosoftTokens,
    oauthClient: MicrosoftOAuthClient,
    onTokenRefresh?: (tokens: MicrosoftTokens) => Promise<void>
  ) {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    this.expiresAt = tokens.expiresAt;
    this.oauthClient = oauthClient;
    this.onTokenRefresh = onTokenRefresh;
  }

  private async ensureValidToken(): Promise<void> {
    // Refresh if token expires in less than 5 minutes
    if (new Date() >= new Date(this.expiresAt.getTime() - 5 * 60 * 1000)) {
      console.log('[Outlook] Refreshing access token...');
      const newTokens = await this.oauthClient.refreshAccessToken(this.refreshToken);
      this.accessToken = newTokens.accessToken;
      this.refreshToken = newTokens.refreshToken;
      this.expiresAt = newTokens.expiresAt;
      
      if (this.onTokenRefresh) {
        await this.onTokenRefresh(newTokens);
      }
    }
  }

  private async makeRequest<T>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<T> {
    await this.ensureValidToken();

    const url = `${MICROSOFT_GRAPH_URL}${endpoint}`;
    console.log(`[Outlook] ${method} ${endpoint}`);

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Outlook] Error response:`, errorText.substring(0, 500));
      throw new Error(`Microsoft Graph request failed: ${response.status} ${response.statusText}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<{ displayName: string; mail: string; userPrincipalName: string }> {
    return this.makeRequest('GET', '/me');
  }

  /**
   * List all calendars for the user
   */
  async listCalendars(): Promise<OutlookCalendar[]> {
    const response = await this.makeRequest<{ value: any[] }>('GET', '/me/calendars');
    
    return response.value.map(cal => ({
      id: cal.id,
      name: cal.name,
      color: OUTLOOK_COLORS[cal.color] || OUTLOOK_COLORS['auto'],
      changeKey: cal.changeKey,
      canEdit: cal.canEdit,
      isDefaultCalendar: cal.isDefaultCalendar,
      owner: cal.owner,
    }));
  }

  /**
   * Get events from a calendar
   */
  async getEvents(
    calendarId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<OutlookEvent[]> {
    let endpoint = `/me/calendars/${calendarId}/events`;
    const params: string[] = [];

    if (startDate && endDate) {
      const start = startDate.toISOString();
      const end = endDate.toISOString();
      params.push(`$filter=start/dateTime ge '${start}' and end/dateTime le '${end}'`);
    }

    params.push('$top=500');
    params.push('$select=id,iCalUId,changeKey,subject,body,start,end,location,isAllDay,isCancelled,recurrence,attendees,organizer,showAs,importance,sensitivity');

    if (params.length > 0) {
      endpoint += '?' + params.join('&');
    }

    const response = await this.makeRequest<{ value: OutlookEvent[] }>('GET', endpoint);
    return response.value;
  }

  /**
   * Create a new event
   */
  async createEvent(calendarId: string, event: Partial<OutlookEvent>): Promise<OutlookEvent> {
    return this.makeRequest<OutlookEvent>(
      'POST',
      `/me/calendars/${calendarId}/events`,
      event
    );
  }

  /**
   * Update an existing event
   */
  async updateEvent(calendarId: string, eventId: string, event: Partial<OutlookEvent>): Promise<OutlookEvent> {
    return this.makeRequest<OutlookEvent>(
      'PATCH',
      `/me/calendars/${calendarId}/events/${eventId}`,
      event
    );
  }

  /**
   * Delete an event
   */
  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    await this.makeRequest<void>('DELETE', `/me/calendars/${calendarId}/events/${eventId}`);
  }

  /**
   * Get calendar view (expanded recurring events)
   */
  async getCalendarView(
    calendarId: string,
    startDate: Date,
    endDate: Date
  ): Promise<OutlookEvent[]> {
    const start = startDate.toISOString();
    const end = endDate.toISOString();
    
    const endpoint = `/me/calendars/${calendarId}/calendarView?startDateTime=${start}&endDateTime=${end}&$top=500`;
    
    const response = await this.makeRequest<{ value: OutlookEvent[] }>('GET', endpoint);
    return response.value;
  }
}

// ============================================
// EVENT CONVERSION
// ============================================

export function outlookEventToLocal(event: OutlookEvent, calendarId: string): Partial<CalendarEvent> {
  return {
    calendar_id: calendarId,
    external_id: event.id,
    external_source: 'outlook',
    external_etag: event.changeKey,
    ical_uid: event.iCalUId, // Links to email thread for meeting invites
    title: event.subject || 'Untitled Event',
    description: event.body?.content,
    location: event.location?.displayName,
    start_time: event.start.dateTime + 'Z',
    end_time: event.end.dateTime + 'Z',
    all_day: event.isAllDay,
    status: event.isCancelled ? 'cancelled' : 'confirmed',
    recurrence_rule: event.recurrence ? JSON.stringify(event.recurrence) : undefined,
  };
}

export function localEventToOutlook(event: CalendarEvent): Partial<OutlookEvent> {
  const startDate = new Date(event.start_time);
  const endDate = new Date(event.end_time);

  return {
    subject: event.title,
    body: event.description ? {
      contentType: 'text',
      content: event.description,
    } : undefined,
    start: {
      dateTime: startDate.toISOString().replace('Z', ''),
      timeZone: 'UTC',
    },
    end: {
      dateTime: endDate.toISOString().replace('Z', ''),
      timeZone: 'UTC',
    },
    location: event.location ? {
      displayName: event.location,
    } : undefined,
    isAllDay: event.all_day,
  };
}

// ============================================
// SYNC SERVICE
// ============================================

export class OutlookCalendarSyncService {
  private oauthConfig: MicrosoftOAuthConfig;

  constructor() {
    this.oauthConfig = {
      clientId: process.env.MICROSOFT_CLIENT_ID || '',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
      tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
      redirectUri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3000/api/calendar/sync/outlook/callback',
    };
  }

  /**
   * Check if Outlook integration is configured
   */
  isConfigured(): boolean {
    return !!(this.oauthConfig.clientId && this.oauthConfig.clientSecret);
  }

  /**
   * Get OAuth client
   */
  getOAuthClient(): MicrosoftOAuthClient {
    if (!this.isConfigured()) {
      throw new Error(
        'Microsoft OAuth not configured. Please set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET environment variables.'
      );
    }
    return new MicrosoftOAuthClient(this.oauthConfig);
  }

  /**
   * Generate authorization URL for connecting Outlook
   */
  getAuthorizationUrl(userId: string): string {
    const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');
    return this.getOAuthClient().getAuthorizationUrl(state);
  }

  /**
   * Complete OAuth flow and connect account
   */
  async connectAccount(params: {
    owner_id: string;
    code: string;
  }): Promise<SyncAccount> {
    const oauthClient = this.getOAuthClient();
    
    // Exchange code for tokens
    const tokens = await oauthClient.exchangeCodeForTokens(params.code);

    // Create client and get user profile
    const client = new OutlookCalendarClient(tokens, oauthClient);
    const profile = await client.getProfile();

    // Discover calendars
    const calendars = await client.listCalendars();

    const discoveredCalendars: DiscoveredCalendar[] = calendars.map(cal => ({
      id: cal.id,
      name: cal.name,
      color: cal.color,
      selected: cal.isDefaultCalendar || cal.canEdit,
    }));

    // Store account
    const result = await pool.query(
      `INSERT INTO calendar.sync_accounts (
        owner_id, provider, account_email, account_name,
        access_token_encrypted, refresh_token_encrypted, token_expires_at,
        discovered_calendars, sync_enabled
      ) VALUES ($1, 'outlook', $2, $3, $4, $5, $6, $7, true)
      RETURNING *`,
      [
        params.owner_id,
        profile.mail || profile.userPrincipalName,
        profile.displayName,
        tokens.accessToken,  // TODO: Encrypt in production
        tokens.refreshToken, // TODO: Encrypt in production
        tokens.expiresAt,
        JSON.stringify(discoveredCalendars),
      ]
    );

    // Create local calendars for each discovered calendar
    for (const cal of discoveredCalendars) {
      if (cal.selected) {
        await pool.query(
          `INSERT INTO calendar.calendars (
            owner_id, name, calendar_type, sync_enabled, sync_source,
            sync_account_id, sync_calendar_id, color
          ) VALUES ($1, $2, 'synced_outlook', true, 'outlook', $3, $4, $5)
          ON CONFLICT DO NOTHING`,
          [params.owner_id, cal.name, result.rows[0].id, cal.id, cal.color || '#3B82F6']
        );
      }
    }

    return result.rows[0];
  }

  /**
   * Get client for an existing account
   */
  private async getClientForAccount(syncAccountId: string): Promise<{
    client: OutlookCalendarClient;
    account: any;
  }> {
    const accountResult = await pool.query(
      `SELECT * FROM calendar.sync_accounts WHERE id = $1`,
      [syncAccountId]
    );

    if (!accountResult.rows[0]) {
      throw new Error('Sync account not found');
    }

    const account = accountResult.rows[0];
    const oauthClient = this.getOAuthClient();

    const tokens: MicrosoftTokens = {
      accessToken: account.access_token_encrypted,  // TODO: Decrypt in production
      refreshToken: account.refresh_token_encrypted, // TODO: Decrypt in production
      expiresAt: new Date(account.token_expires_at),
    };

    const client = new OutlookCalendarClient(
      tokens,
      oauthClient,
      async (newTokens) => {
        // Update tokens in database when refreshed
        await pool.query(
          `UPDATE calendar.sync_accounts 
           SET access_token_encrypted = $1, refresh_token_encrypted = $2, token_expires_at = $3
           WHERE id = $4`,
          [newTokens.accessToken, newTokens.refreshToken, newTokens.expiresAt, syncAccountId]
        );
      }
    );

    return { client, account };
  }

  /**
   * Sync events from Outlook
   */
  async syncFromOutlook(syncAccountId: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
      conflictsDetected: 0,
      errors: [],
    };

    try {
      const { client, account } = await this.getClientForAccount(syncAccountId);

      // Get local calendars linked to this account
      const calendarsResult = await pool.query(
        `SELECT * FROM calendar.calendars WHERE sync_account_id = $1`,
        [syncAccountId]
      );

      // Sync each calendar
      for (const calendar of calendarsResult.rows) {
        try {
          // Get events from Outlook (last 30 days to next 90 days)
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - 30);
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + 90);

          const outlookEvents = await client.getCalendarView(
            calendar.sync_calendar_id,
            startDate,
            endDate
          );

          console.log(`[Outlook] Fetched ${outlookEvents.length} events from ${calendar.name}`);

          // Process each event
          for (const outlookEvent of outlookEvents) {
            const parsed = outlookEventToLocal(outlookEvent, calendar.id);

            // Check if event exists locally
            const existingResult = await pool.query(
              `SELECT * FROM calendar.events 
               WHERE calendar_id = $1 AND external_id = $2`,
              [calendar.id, parsed.external_id]
            );

            if (existingResult.rows[0]) {
              // Update existing event if changeKey changed
              if (existingResult.rows[0].external_etag !== outlookEvent.changeKey) {
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
                    outlookEvent.changeKey,
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
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'outlook', $11, $12)`,
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
                  outlookEvent.changeKey,
                  account.owner_id,
                ]
              );
              result.eventsCreated++;
            }
          }

          // Find deleted events
          const outlookIds = new Set(outlookEvents.map(e => e.id));
          const localEventsResult = await pool.query(
            `SELECT id, external_id FROM calendar.events 
             WHERE calendar_id = $1 AND external_source = 'outlook'`,
            [calendar.id]
          );

          for (const localEvent of localEventsResult.rows) {
            if (!outlookIds.has(localEvent.external_id)) {
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
   * Push a local event to Outlook
   */
  async pushToOutlook(eventId: string): Promise<boolean> {
    try {
      // Get event with calendar info
      const eventResult = await pool.query(
        `SELECT e.*, c.sync_account_id, c.sync_calendar_id
         FROM calendar.events e
         JOIN calendar.calendars c ON e.calendar_id = c.id
         WHERE e.id = $1 AND c.sync_source = 'outlook'`,
        [eventId]
      );

      if (!eventResult.rows[0]) {
        return false;
      }

      const event = eventResult.rows[0];
      const { client } = await this.getClientForAccount(event.sync_account_id);

      const outlookEvent = localEventToOutlook(event);

      let newEvent: OutlookEvent;
      if (event.external_id) {
        // Update existing event
        newEvent = await client.updateEvent(
          event.sync_calendar_id,
          event.external_id,
          outlookEvent
        );
      } else {
        // Create new event
        newEvent = await client.createEvent(
          event.sync_calendar_id,
          outlookEvent
        );
      }

      // Update local event with external ID and changeKey
      await pool.query(
        `UPDATE calendar.events 
         SET external_id = $1, external_etag = $2, external_source = 'outlook'
         WHERE id = $3`,
        [newEvent.id, newEvent.changeKey, eventId]
      );

      return true;

    } catch (error) {
      console.error('Failed to push event to Outlook:', error);
      return false;
    }
  }

  /**
   * Delete event from Outlook
   */
  async deleteFromOutlook(eventId: string): Promise<boolean> {
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
      const { client } = await this.getClientForAccount(event.sync_account_id);

      await client.deleteEvent(event.sync_calendar_id, event.external_id);

      return true;

    } catch (error) {
      console.error('Failed to delete event from Outlook:', error);
      return false;
    }
  }
}

// Export singleton instance
export const outlookCalendarSync = new OutlookCalendarSyncService();
