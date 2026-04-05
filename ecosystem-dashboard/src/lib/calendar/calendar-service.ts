/**
 * Calendar Service
 * Core service layer for the AI Homelab Calendar System
 * 
 * Handles calendar CRUD, event management, and database operations
 */

import { pool } from './db';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface Calendar {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  calendar_type: CalendarType;
  visibility: CalendarVisibility;
  sync_enabled: boolean;
  sync_source?: SyncSource;
  sync_account_id?: string;
  sync_calendar_id?: string;
  last_synced_at?: string;
  work_org_id?: string;
  family_group_id?: string;
  timezone: string;
  default_reminder_minutes: number;
  created_at: string;
  updated_at: string;
  archived: boolean;
}

export type CalendarType = 'personal' | 'work' | 'family' | 'synced_apple' | 'synced_google' | 'synced_email';
export type CalendarVisibility = 'private' | 'family' | 'organization' | 'public';
export type SyncSource = 'apple_calendar' | 'google_calendar' | 'email_graphrag';

export interface CalendarEvent {
  id: string;
  calendar_id: string;
  title: string;
  description?: string;
  location?: string;
  location_type?: 'physical' | 'virtual' | 'hybrid';
  virtual_meeting_url?: string;
  virtual_meeting_provider?: 'zoom' | 'meet' | 'teams' | 'other';
  start_time: string;
  end_time: string;
  all_day: boolean;
  timezone: string;
  recurrence_rule?: string;
  recurrence_exception_dates?: string[];
  recurring_event_id?: string;
  status: EventStatus;
  priority: EventPriority;
  event_visibility: EventVisibility;
  ai_extracted: boolean;
  ai_confidence?: number;
  ai_source_email_id?: string;
  ai_extracted_data?: Record<string, unknown>;
  external_id?: string;
  external_source?: string;
  external_etag?: string;
  ical_uid?: string; // iCalUID links calendar events to email threads for meeting invites
  workspace_page_id?: string;
  workspace_database_id?: string;
  event_color?: string;
  tags: string[];
  custom_properties: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
  archived: boolean;
  // Joined fields
  calendar_name?: string;
  calendar_color?: string;
  attendees?: EventAttendee[];
}

export type EventStatus = 'tentative' | 'confirmed' | 'cancelled';
export type EventPriority = 'low' | 'normal' | 'high' | 'urgent';
export type EventVisibility = 'default' | 'public' | 'private' | 'confidential';

export interface EventAttendee {
  id: string;
  event_id: string;
  email: string;
  name?: string;
  role: AttendeeRole;
  response_status: ResponseStatus;
  responded_at?: string;
  notify: boolean;
  external_id?: string;
  created_at: string;
}

export type AttendeeRole = 'organizer' | 'attendee' | 'optional' | 'resource';
export type ResponseStatus = 'needs_action' | 'accepted' | 'declined' | 'tentative';

export interface EventReminder {
  id: string;
  event_id: string;
  reminder_type: ReminderType;
  minutes_before: number;
  ai_prompt?: string;
  triggered: boolean;
  triggered_at?: string;
  created_at: string;
}

export type ReminderType = 'notification' | 'email' | 'sms' | 'ai_assistant';

export interface SyncAccount {
  id: string;
  owner_id: string;
  provider: SyncProvider;
  access_token_encrypted?: string;
  refresh_token_encrypted?: string;
  token_expires_at?: string;
  caldav_url?: string;
  caldav_username?: string;
  caldav_password_encrypted?: string;
  account_email?: string;
  account_name?: string;
  sync_enabled: boolean;
  sync_interval_minutes: number;
  last_sync_at?: string;
  last_sync_status?: string;
  last_sync_error?: string;
  discovered_calendars: DiscoveredCalendar[];
  created_at: string;
  updated_at: string;
}

export type SyncProvider = 'apple_calendar' | 'google_calendar' | 'outlook' | 'caldav';

export interface DiscoveredCalendar {
  id: string;
  name: string;
  color?: string;
  selected: boolean;
}

export interface SchedulingLink {
  id: string;
  owner_id: string;
  slug: string;
  title: string;
  description?: string;
  duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  min_notice_hours: number;
  max_future_days: number;
  availability_schedule: WeeklySchedule;
  conflict_calendar_ids: string[];
  require_approval: boolean;
  max_bookings_per_day?: number;
  booking_questions: BookingQuestion[];
  create_in_calendar_id?: string;
  send_confirmation_email: boolean;
  active: boolean;
  total_bookings: number;
  created_at: string;
  updated_at: string;
}

export interface WeeklySchedule {
  monday?: TimeSlot[];
  tuesday?: TimeSlot[];
  wednesday?: TimeSlot[];
  thursday?: TimeSlot[];
  friday?: TimeSlot[];
  saturday?: TimeSlot[];
  sunday?: TimeSlot[];
}

export interface TimeSlot {
  start: string; // HH:mm format
  end: string;   // HH:mm format
}

export interface BookingQuestion {
  id: string;
  question: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox';
  required: boolean;
  options?: string[];
}

export interface FamilyGroup {
  id: string;
  name: string;
  member_ids: string[];
  admin_ids: string[];
  default_timezone: string;
  shared_calendar_id?: string;
  enable_location_sharing: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WorkOrganization {
  id: string;
  name: string;
  domain?: string;
  default_timezone: string;
  working_hours_start: string;
  working_hours_end: string;
  working_days: number[];
  calendar_visibility: CalendarVisibility;
  allow_external_invites: boolean;
  google_workspace_domain?: string;
  microsoft_tenant_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarStats {
  total_calendars: number;
  total_events: number;
  events_today: number;
  events_this_week: number;
  events_this_month: number;
  pending_invites: number;
  synced_accounts: number;
  last_sync?: string;
}

export interface FreeSlot {
  slot_start: string;
  slot_end: string;
  duration_minutes: number;
}

export interface ConflictEvent {
  event_id: string;
  title: string;
  start_time: string;
  end_time: string;
  calendar_name: string;
}

// ============================================
// CREATE OPERATIONS
// ============================================

export async function createCalendar(data: {
  owner_id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  calendar_type?: CalendarType;
  visibility?: CalendarVisibility;
  timezone?: string;
  default_reminder_minutes?: number;
  work_org_id?: string;
  family_group_id?: string;
}): Promise<Calendar> {
  const result = await pool.query(
    `INSERT INTO calendar.calendars (
      owner_id, name, description, color, icon, calendar_type,
      visibility, timezone, default_reminder_minutes, work_org_id, family_group_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [
      data.owner_id,
      data.name,
      data.description || null,
      data.color || '#3B82F6',
      data.icon || 'calendar',
      data.calendar_type || 'personal',
      data.visibility || 'private',
      data.timezone || 'America/Chicago',
      data.default_reminder_minutes || 30,
      data.work_org_id || null,
      data.family_group_id || null,
    ]
  );
  return result.rows[0];
}

export async function createEvent(data: {
  calendar_id: string;
  title: string;
  start_time: string;
  end_time: string;
  created_by: string;
  description?: string;
  location?: string;
  location_type?: string;
  virtual_meeting_url?: string;
  virtual_meeting_provider?: string;
  all_day?: boolean;
  timezone?: string;
  recurrence_rule?: string;
  status?: EventStatus;
  priority?: EventPriority;
  event_visibility?: EventVisibility;
  event_color?: string;
  tags?: string[];
  custom_properties?: Record<string, unknown>;
  attendees?: { email: string; name?: string; role?: AttendeeRole }[];
  reminders?: { minutes_before: number; reminder_type?: ReminderType }[];
}): Promise<CalendarEvent> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create the event
    const eventResult = await client.query(
      `INSERT INTO calendar.events (
        calendar_id, title, description, location, location_type,
        virtual_meeting_url, virtual_meeting_provider, start_time, end_time,
        all_day, timezone, recurrence_rule, status, priority, event_visibility,
        event_color, tags, custom_properties, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        data.calendar_id,
        data.title,
        data.description || null,
        data.location || null,
        data.location_type || null,
        data.virtual_meeting_url || null,
        data.virtual_meeting_provider || null,
        data.start_time,
        data.end_time,
        data.all_day || false,
        data.timezone || 'America/Chicago',
        data.recurrence_rule || null,
        data.status || 'confirmed',
        data.priority || 'normal',
        data.event_visibility || 'default',
        data.event_color || null,
        JSON.stringify(data.tags || []),
        JSON.stringify(data.custom_properties || {}),
        data.created_by,
      ]
    );
    
    const event = eventResult.rows[0];
    
    // Add attendees if provided
    if (data.attendees && data.attendees.length > 0) {
      for (const attendee of data.attendees) {
        await client.query(
          `INSERT INTO calendar.event_attendees (event_id, email, name, role)
           VALUES ($1, $2, $3, $4)`,
          [event.id, attendee.email, attendee.name || null, attendee.role || 'attendee']
        );
      }
    }
    
    // Add reminders if provided
    if (data.reminders && data.reminders.length > 0) {
      for (const reminder of data.reminders) {
        await client.query(
          `INSERT INTO calendar.event_reminders (event_id, minutes_before, reminder_type)
           VALUES ($1, $2, $3)`,
          [event.id, reminder.minutes_before, reminder.reminder_type || 'notification']
        );
      }
    }
    
    await client.query('COMMIT');
    return event;
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function createSchedulingLink(data: {
  owner_id: string;
  slug: string;
  title: string;
  duration_minutes: number;
  description?: string;
  buffer_before_minutes?: number;
  buffer_after_minutes?: number;
  min_notice_hours?: number;
  max_future_days?: number;
  availability_schedule: WeeklySchedule;
  conflict_calendar_ids?: string[];
  require_approval?: boolean;
  max_bookings_per_day?: number;
  booking_questions?: BookingQuestion[];
  create_in_calendar_id?: string;
}): Promise<SchedulingLink> {
  const result = await pool.query(
    `INSERT INTO calendar.scheduling_links (
      owner_id, slug, title, description, duration_minutes,
      buffer_before_minutes, buffer_after_minutes, min_notice_hours,
      max_future_days, availability_schedule, conflict_calendar_ids,
      require_approval, max_bookings_per_day, booking_questions, create_in_calendar_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *`,
    [
      data.owner_id,
      data.slug,
      data.title,
      data.description || null,
      data.duration_minutes,
      data.buffer_before_minutes || 0,
      data.buffer_after_minutes || 0,
      data.min_notice_hours || 24,
      data.max_future_days || 60,
      JSON.stringify(data.availability_schedule),
      data.conflict_calendar_ids || [],
      data.require_approval || false,
      data.max_bookings_per_day || null,
      JSON.stringify(data.booking_questions || []),
      data.create_in_calendar_id || null,
    ]
  );
  return result.rows[0];
}

export async function createFamilyGroup(data: {
  name: string;
  created_by: string;
  member_ids?: string[];
  admin_ids?: string[];
  default_timezone?: string;
}): Promise<FamilyGroup> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create family group
    const groupResult = await client.query(
      `INSERT INTO calendar.family_groups (
        name, member_ids, admin_ids, default_timezone, created_by
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        data.name,
        data.member_ids || [data.created_by],
        data.admin_ids || [data.created_by],
        data.default_timezone || 'America/Chicago',
        data.created_by,
      ]
    );
    
    const group = groupResult.rows[0];
    
    // Create shared family calendar
    const calendarResult = await client.query(
      `INSERT INTO calendar.calendars (
        owner_id, name, calendar_type, visibility, family_group_id, color
      ) VALUES ($1, $2, 'family', 'family', $3, '#10B981')
      RETURNING id`,
      [data.created_by, `${data.name} Calendar`, group.id]
    );
    
    // Update family group with shared calendar
    await client.query(
      `UPDATE calendar.family_groups SET shared_calendar_id = $1 WHERE id = $2`,
      [calendarResult.rows[0].id, group.id]
    );
    
    await client.query('COMMIT');
    
    return { ...group, shared_calendar_id: calendarResult.rows[0].id };
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ============================================
// READ OPERATIONS
// ============================================

export async function getCalendars(ownerId: string): Promise<Calendar[]> {
  const result = await pool.query(
    `SELECT * FROM calendar.calendars 
     WHERE owner_id = $1 AND NOT archived
     ORDER BY calendar_type, name`,
    [ownerId]
  );
  return result.rows;
}

export async function getCalendarById(id: string): Promise<Calendar | null> {
  const result = await pool.query(
    `SELECT * FROM calendar.calendars WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function getEvents(params: {
  owner_id: string;
  start_date: string;
  end_date: string;
  calendar_ids?: string[];
}): Promise<CalendarEvent[]> {
  const result = await pool.query(
    `SELECT * FROM calendar.get_events_in_range($1, $2, $3, $4)`,
    [
      params.owner_id,
      params.start_date,
      params.end_date,
      params.calendar_ids || null,
    ]
  );
  return result.rows;
}

export async function getEventById(id: string): Promise<CalendarEvent | null> {
  const result = await pool.query(
    `SELECT e.*, c.name as calendar_name, c.color as calendar_color
     FROM calendar.events e
     JOIN calendar.calendars c ON e.calendar_id = c.id
     WHERE e.id = $1`,
    [id]
  );
  
  if (!result.rows[0]) return null;
  
  // Get attendees
  const attendeesResult = await pool.query(
    `SELECT * FROM calendar.event_attendees WHERE event_id = $1`,
    [id]
  );
  
  return {
    ...result.rows[0],
    attendees: attendeesResult.rows,
  };
}

export async function getEventReminders(eventId: string): Promise<EventReminder[]> {
  const result = await pool.query(
    `SELECT * FROM calendar.event_reminders WHERE event_id = $1`,
    [eventId]
  );
  return result.rows;
}

export async function getSchedulingLinks(ownerId: string): Promise<SchedulingLink[]> {
  const result = await pool.query(
    `SELECT * FROM calendar.scheduling_links 
     WHERE owner_id = $1
     ORDER BY created_at DESC`,
    [ownerId]
  );
  return result.rows;
}

export async function getSchedulingLinkBySlug(slug: string): Promise<SchedulingLink | null> {
  const result = await pool.query(
    `SELECT * FROM calendar.scheduling_links WHERE slug = $1 AND active = true`,
    [slug]
  );
  return result.rows[0] || null;
}

export async function getSyncAccounts(ownerId: string): Promise<SyncAccount[]> {
  const result = await pool.query(
    `SELECT id, owner_id, provider, account_email, account_name,
            sync_enabled, sync_interval_minutes, last_sync_at,
            last_sync_status, last_sync_error, discovered_calendars,
            created_at, updated_at
     FROM calendar.sync_accounts 
     WHERE owner_id = $1`,
    [ownerId]
  );
  return result.rows;
}

export async function getFamilyGroup(userId: string): Promise<FamilyGroup | null> {
  const result = await pool.query(
    `SELECT * FROM calendar.family_groups 
     WHERE $1 = ANY(member_ids)
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

export async function getCalendarStats(ownerId: string): Promise<CalendarStats> {
  const result = await pool.query(
    `SELECT * FROM calendar.get_stats($1)`,
    [ownerId]
  );
  return result.rows[0];
}

// ============================================
// UPDATE OPERATIONS
// ============================================

export async function updateCalendar(
  id: string,
  updates: Partial<Omit<Calendar, 'id' | 'created_at' | 'updated_at'>>
): Promise<Calendar | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;
  
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      fields.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }
  
  if (fields.length === 0) return getCalendarById(id);
  
  values.push(id);
  
  const result = await pool.query(
    `UPDATE calendar.calendars 
     SET ${fields.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    values
  );
  
  return result.rows[0] || null;
}

export async function updateEvent(
  id: string,
  updates: Partial<Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>>
): Promise<CalendarEvent | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;
  
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && key !== 'attendees') {
      if (key === 'tags' || key === 'custom_properties' || key === 'ai_extracted_data') {
        fields.push(`${key} = $${paramIndex}`);
        values.push(JSON.stringify(value));
      } else {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
      }
      paramIndex++;
    }
  }
  
  if (fields.length === 0) return getEventById(id);
  
  values.push(id);
  
  const result = await pool.query(
    `UPDATE calendar.events 
     SET ${fields.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    values
  );
  
  return result.rows[0] || null;
}

export async function updateAttendeeResponse(
  eventId: string,
  email: string,
  status: ResponseStatus
): Promise<EventAttendee | null> {
  const result = await pool.query(
    `UPDATE calendar.event_attendees 
     SET response_status = $1, responded_at = NOW()
     WHERE event_id = $2 AND email = $3
     RETURNING *`,
    [status, eventId, email]
  );
  return result.rows[0] || null;
}

// ============================================
// DELETE OPERATIONS
// ============================================

export async function deleteCalendar(id: string): Promise<boolean> {
  const result = await pool.query(
    `UPDATE calendar.calendars SET archived = true WHERE id = $1`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function deleteEvent(id: string): Promise<boolean> {
  const result = await pool.query(
    `UPDATE calendar.events SET archived = true WHERE id = $1`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function cancelEvent(id: string, notifyAttendees = true): Promise<CalendarEvent | null> {
  const event = await updateEvent(id, { status: 'cancelled' });
  
  if (event && notifyAttendees) {
    // TODO: Send cancellation notifications to attendees
  }
  
  return event;
}

// ============================================
// SCHEDULING OPERATIONS
// ============================================

export async function findFreeSlots(params: {
  owner_id: string;
  date: string;
  duration_minutes: number;
  calendar_ids?: string[];
  work_hours_start?: string;
  work_hours_end?: string;
}): Promise<FreeSlot[]> {
  const result = await pool.query(
    `SELECT * FROM calendar.find_free_slots($1, $2, $3, $4, $5, $6)`,
    [
      params.owner_id,
      params.date,
      params.duration_minutes,
      params.calendar_ids || null,
      params.work_hours_start || '09:00',
      params.work_hours_end || '17:00',
    ]
  );
  return result.rows;
}

export async function checkConflicts(params: {
  owner_id: string;
  start_time: string;
  end_time: string;
  exclude_event_id?: string;
  calendar_ids?: string[];
}): Promise<ConflictEvent[]> {
  const result = await pool.query(
    `SELECT * FROM calendar.check_conflicts($1, $2, $3, $4, $5)`,
    [
      params.owner_id,
      params.start_time,
      params.end_time,
      params.exclude_event_id || null,
      params.calendar_ids || null,
    ]
  );
  return result.rows;
}

// ============================================
// SHARING OPERATIONS
// ============================================

export async function shareCalendar(params: {
  calendar_id: string;
  share_type: 'user' | 'family_group' | 'work_org' | 'link' | 'public';
  permission: 'view' | 'edit' | 'manage';
  created_by: string;
  share_target_id?: string;
  share_target_email?: string;
  show_event_details?: boolean;
  show_busy_only?: boolean;
}): Promise<{ id: string; share_link_token?: string }> {
  const shareLinkToken = params.share_type === 'link' 
    ? generateShareToken() 
    : null;
  
  const result = await pool.query(
    `INSERT INTO calendar.sharing_rules (
      calendar_id, share_type, share_target_id, share_target_email,
      permission, share_link_token, show_event_details, show_busy_only, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id, share_link_token`,
    [
      params.calendar_id,
      params.share_type,
      params.share_target_id || null,
      params.share_target_email || null,
      params.permission,
      shareLinkToken,
      params.show_event_details ?? true,
      params.show_busy_only ?? false,
      params.created_by,
    ]
  );
  
  return result.rows[0];
}

export async function getSharedCalendars(userId: string): Promise<Calendar[]> {
  const result = await pool.query(
    `SELECT c.* FROM calendar.calendars c
     JOIN calendar.sharing_rules sr ON c.id = sr.calendar_id
     WHERE (sr.share_target_id = $1 OR sr.share_type = 'public')
       AND NOT c.archived
     ORDER BY c.name`,
    [userId]
  );
  return result.rows;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateShareToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// ============================================
// DEFAULT CALENDAR SETUP
// ============================================

export async function ensureDefaultCalendar(ownerId: string): Promise<Calendar> {
  // Check if user has any calendars
  const existing = await pool.query(
    `SELECT * FROM calendar.calendars 
     WHERE owner_id = $1 AND calendar_type = 'personal' AND NOT archived
     LIMIT 1`,
    [ownerId]
  );
  
  if (existing.rows[0]) {
    return existing.rows[0];
  }
  
  // Create default personal calendar
  return createCalendar({
    owner_id: ownerId,
    name: 'Personal Calendar',
    calendar_type: 'personal',
    visibility: 'private',
    color: '#3B82F6',
  });
}
