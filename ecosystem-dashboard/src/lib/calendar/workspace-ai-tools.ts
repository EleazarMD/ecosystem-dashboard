/**
 * Workspace AI Calendar Tools
 * 12 AI-powered calendar tools for the Goose agent integration
 * 
 * These tools enable natural language calendar management through Workspace AI
 */

import * as calendarService from './calendar-service';
import type { 
  CalendarEvent, 
  Calendar, 
  FreeSlot, 
  ConflictEvent,
  SchedulingLink,
  CalendarStats 
} from './calendar-service';

// ============================================
// TOOL DEFINITIONS
// ============================================

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      items?: { type: string };
    }>;
    required: string[];
  };
}

export const calendarTools: ToolDefinition[] = [
  {
    name: 'calendar_create_event',
    description: 'Create a new calendar event. Use this when the user wants to schedule a meeting, appointment, or any time-blocked activity.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'The title/name of the event',
        },
        start_time: {
          type: 'string',
          description: 'Start time in ISO 8601 format (e.g., 2025-12-20T09:00:00-06:00)',
        },
        end_time: {
          type: 'string',
          description: 'End time in ISO 8601 format',
        },
        description: {
          type: 'string',
          description: 'Optional description or notes for the event',
        },
        location: {
          type: 'string',
          description: 'Physical location or virtual meeting URL',
        },
        calendar_id: {
          type: 'string',
          description: 'ID of the calendar to create the event in. If not provided, uses default calendar.',
        },
        attendees: {
          type: 'array',
          description: 'List of attendee email addresses',
          items: { type: 'string' },
        },
        all_day: {
          type: 'boolean',
          description: 'Whether this is an all-day event',
        },
        reminder_minutes: {
          type: 'number',
          description: 'Minutes before event to send reminder (default: 30)',
        },
      },
      required: ['title', 'start_time', 'end_time'],
    },
  },
  {
    name: 'calendar_get_events',
    description: 'Get calendar events for a date range. Use this to see what\'s scheduled, check availability, or review upcoming events.',
    parameters: {
      type: 'object',
      properties: {
        start_date: {
          type: 'string',
          description: 'Start date in ISO 8601 format',
        },
        end_date: {
          type: 'string',
          description: 'End date in ISO 8601 format',
        },
        calendar_ids: {
          type: 'array',
          description: 'Optional list of specific calendar IDs to query',
          items: { type: 'string' },
        },
      },
      required: ['start_date', 'end_date'],
    },
  },
  {
    name: 'calendar_update_event',
    description: 'Update an existing calendar event. Use this to reschedule, change details, or modify attendees.',
    parameters: {
      type: 'object',
      properties: {
        event_id: {
          type: 'string',
          description: 'The ID of the event to update',
        },
        title: {
          type: 'string',
          description: 'New title for the event',
        },
        start_time: {
          type: 'string',
          description: 'New start time in ISO 8601 format',
        },
        end_time: {
          type: 'string',
          description: 'New end time in ISO 8601 format',
        },
        description: {
          type: 'string',
          description: 'New description',
        },
        location: {
          type: 'string',
          description: 'New location',
        },
        status: {
          type: 'string',
          description: 'Event status',
          enum: ['tentative', 'confirmed', 'cancelled'],
        },
      },
      required: ['event_id'],
    },
  },
  {
    name: 'calendar_delete_event',
    description: 'Delete or cancel a calendar event. Use this when the user wants to remove an event from their calendar.',
    parameters: {
      type: 'object',
      properties: {
        event_id: {
          type: 'string',
          description: 'The ID of the event to delete',
        },
        notify_attendees: {
          type: 'boolean',
          description: 'Whether to notify attendees about the cancellation (default: true)',
        },
      },
      required: ['event_id'],
    },
  },
  {
    name: 'calendar_find_free_time',
    description: 'Find available time slots on a specific date. Use this to help schedule meetings by finding when the user is free.',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'The date to check for free time (YYYY-MM-DD format)',
        },
        duration_minutes: {
          type: 'number',
          description: 'Minimum duration needed for the slot in minutes (default: 60)',
        },
        work_hours_start: {
          type: 'string',
          description: 'Start of work hours (HH:mm format, default: 09:00)',
        },
        work_hours_end: {
          type: 'string',
          description: 'End of work hours (HH:mm format, default: 17:00)',
        },
        calendar_ids: {
          type: 'array',
          description: 'Optional specific calendars to check',
          items: { type: 'string' },
        },
      },
      required: ['date'],
    },
  },
  {
    name: 'calendar_check_conflicts',
    description: 'Check if a proposed time slot conflicts with existing events. Use this before scheduling to verify availability.',
    parameters: {
      type: 'object',
      properties: {
        start_time: {
          type: 'string',
          description: 'Proposed start time in ISO 8601 format',
        },
        end_time: {
          type: 'string',
          description: 'Proposed end time in ISO 8601 format',
        },
        calendar_ids: {
          type: 'array',
          description: 'Optional specific calendars to check',
          items: { type: 'string' },
        },
      },
      required: ['start_time', 'end_time'],
    },
  },
  {
    name: 'calendar_list_calendars',
    description: 'List all calendars available to the user. Use this to see what calendars exist and their settings.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'calendar_get_stats',
    description: 'Get calendar statistics including event counts, pending invites, and sync status.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'calendar_create_scheduling_link',
    description: 'Create a booking/scheduling link that others can use to book time with the user (like Calendly).',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Title for the scheduling link (e.g., "30-minute Meeting")',
        },
        slug: {
          type: 'string',
          description: 'URL slug for the booking link (e.g., "30-min-meeting")',
        },
        duration_minutes: {
          type: 'number',
          description: 'Duration of bookable meetings in minutes',
        },
        description: {
          type: 'string',
          description: 'Optional description shown to bookers',
        },
        buffer_before: {
          type: 'number',
          description: 'Buffer time before meetings in minutes',
        },
        buffer_after: {
          type: 'number',
          description: 'Buffer time after meetings in minutes',
        },
      },
      required: ['title', 'slug', 'duration_minutes'],
    },
  },
  {
    name: 'calendar_respond_to_invite',
    description: 'Respond to a calendar invitation (accept, decline, or tentative).',
    parameters: {
      type: 'object',
      properties: {
        event_id: {
          type: 'string',
          description: 'The ID of the event invitation',
        },
        response: {
          type: 'string',
          description: 'Response to the invitation',
          enum: ['accepted', 'declined', 'tentative'],
        },
      },
      required: ['event_id', 'response'],
    },
  },
  {
    name: 'calendar_get_today_agenda',
    description: 'Get today\'s agenda with all scheduled events. Perfect for morning briefings.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'calendar_smart_schedule',
    description: 'Intelligently suggest the best time for a new event based on preferences, existing schedule, and patterns.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'What the event is about (helps determine best time)',
        },
        duration_minutes: {
          type: 'number',
          description: 'How long the event needs to be',
        },
        preferred_time: {
          type: 'string',
          description: 'Preferred time of day (morning, afternoon, evening)',
          enum: ['morning', 'afternoon', 'evening', 'any'],
        },
        within_days: {
          type: 'number',
          description: 'Find a slot within this many days (default: 7)',
        },
        attendee_emails: {
          type: 'array',
          description: 'Optional attendee emails to check their availability too',
          items: { type: 'string' },
        },
      },
      required: ['title', 'duration_minutes'],
    },
  },
];

// ============================================
// TOOL HANDLERS
// ============================================

export interface ToolContext {
  owner_id: string;
  timezone?: string;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;
}

export async function executeCalendarTool(
  toolName: string,
  params: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  try {
    switch (toolName) {
      case 'calendar_create_event':
        return await handleCreateEvent(params, context);
      
      case 'calendar_get_events':
        return await handleGetEvents(params, context);
      
      case 'calendar_update_event':
        return await handleUpdateEvent(params, context);
      
      case 'calendar_delete_event':
        return await handleDeleteEvent(params, context);
      
      case 'calendar_find_free_time':
        return await handleFindFreeTime(params, context);
      
      case 'calendar_check_conflicts':
        return await handleCheckConflicts(params, context);
      
      case 'calendar_list_calendars':
        return await handleListCalendars(context);
      
      case 'calendar_get_stats':
        return await handleGetStats(context);
      
      case 'calendar_create_scheduling_link':
        return await handleCreateSchedulingLink(params, context);
      
      case 'calendar_respond_to_invite':
        return await handleRespondToInvite(params, context);
      
      case 'calendar_get_today_agenda':
        return await handleGetTodayAgenda(context);
      
      case 'calendar_smart_schedule':
        return await handleSmartSchedule(params, context);
      
      default:
        return {
          success: false,
          error: `Unknown tool: ${toolName}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

// ============================================
// HANDLER IMPLEMENTATIONS
// ============================================

async function handleCreateEvent(
  params: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  // Ensure user has a default calendar
  const defaultCalendar = await calendarService.ensureDefaultCalendar(context.owner_id);
  
  // Check for conflicts first
  const conflicts = await calendarService.checkConflicts({
    owner_id: context.owner_id,
    start_time: params.start_time as string,
    end_time: params.end_time as string,
  });
  
  if (conflicts.length > 0) {
    return {
      success: false,
      error: 'Time conflict detected',
      data: { conflicts },
      message: `This time slot conflicts with: ${conflicts.map(c => c.title).join(', ')}`,
    };
  }
  
  const event = await calendarService.createEvent({
    calendar_id: (params.calendar_id as string) || defaultCalendar.id,
    title: params.title as string,
    start_time: params.start_time as string,
    end_time: params.end_time as string,
    description: params.description as string | undefined,
    location: params.location as string | undefined,
    all_day: params.all_day as boolean | undefined,
    created_by: context.owner_id,
    attendees: params.attendees 
      ? (params.attendees as string[]).map(email => ({ email }))
      : undefined,
    reminders: params.reminder_minutes 
      ? [{ minutes_before: params.reminder_minutes as number }]
      : [{ minutes_before: 30 }],
  });
  
  return {
    success: true,
    data: event,
    message: `Created event "${event.title}" on ${new Date(event.start_time).toLocaleDateString()}`,
  };
}

async function handleGetEvents(
  params: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  const events = await calendarService.getEvents({
    owner_id: context.owner_id,
    start_date: params.start_date as string,
    end_date: params.end_date as string,
    calendar_ids: params.calendar_ids as string[] | undefined,
  });
  
  return {
    success: true,
    data: events,
    message: `Found ${events.length} events`,
  };
}

async function handleUpdateEvent(
  params: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  const { event_id, ...updates } = params;
  
  const event = await calendarService.updateEvent(
    event_id as string,
    updates as Partial<CalendarEvent>
  );
  
  if (!event) {
    return {
      success: false,
      error: 'Event not found',
    };
  }
  
  return {
    success: true,
    data: event,
    message: `Updated event "${event.title}"`,
  };
}

async function handleDeleteEvent(
  params: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  const notifyAttendees = params.notify_attendees !== false;
  
  const event = await calendarService.cancelEvent(
    params.event_id as string,
    notifyAttendees
  );
  
  if (!event) {
    return {
      success: false,
      error: 'Event not found',
    };
  }
  
  return {
    success: true,
    data: event,
    message: `Cancelled event "${event.title}"`,
  };
}

async function handleFindFreeTime(
  params: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  const slots = await calendarService.findFreeSlots({
    owner_id: context.owner_id,
    date: params.date as string,
    duration_minutes: (params.duration_minutes as number) || 60,
    calendar_ids: params.calendar_ids as string[] | undefined,
    work_hours_start: params.work_hours_start as string | undefined,
    work_hours_end: params.work_hours_end as string | undefined,
  });
  
  if (slots.length === 0) {
    return {
      success: true,
      data: [],
      message: 'No free time slots available on this date',
    };
  }
  
  const formattedSlots = slots.map(slot => ({
    ...slot,
    formatted: `${new Date(slot.slot_start).toLocaleTimeString()} - ${new Date(slot.slot_end).toLocaleTimeString()} (${slot.duration_minutes} min)`,
  }));
  
  return {
    success: true,
    data: formattedSlots,
    message: `Found ${slots.length} available time slots`,
  };
}

async function handleCheckConflicts(
  params: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  const conflicts = await calendarService.checkConflicts({
    owner_id: context.owner_id,
    start_time: params.start_time as string,
    end_time: params.end_time as string,
    calendar_ids: params.calendar_ids as string[] | undefined,
  });
  
  return {
    success: true,
    data: conflicts,
    message: conflicts.length > 0 
      ? `Found ${conflicts.length} conflicting events` 
      : 'No conflicts found - time slot is available',
  };
}

async function handleListCalendars(context: ToolContext): Promise<ToolResult> {
  const calendars = await calendarService.getCalendars(context.owner_id);
  
  return {
    success: true,
    data: calendars,
    message: `You have ${calendars.length} calendars`,
  };
}

async function handleGetStats(context: ToolContext): Promise<ToolResult> {
  const stats = await calendarService.getCalendarStats(context.owner_id);
  
  return {
    success: true,
    data: stats,
    message: `${stats.events_today} events today, ${stats.events_this_week} this week`,
  };
}

async function handleCreateSchedulingLink(
  params: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  // Default availability: weekdays 9-5
  const defaultAvailability = {
    monday: [{ start: '09:00', end: '17:00' }],
    tuesday: [{ start: '09:00', end: '17:00' }],
    wednesday: [{ start: '09:00', end: '17:00' }],
    thursday: [{ start: '09:00', end: '17:00' }],
    friday: [{ start: '09:00', end: '17:00' }],
  };
  
  const link = await calendarService.createSchedulingLink({
    owner_id: context.owner_id,
    title: params.title as string,
    slug: params.slug as string,
    duration_minutes: params.duration_minutes as number,
    description: params.description as string | undefined,
    buffer_before_minutes: params.buffer_before as number | undefined,
    buffer_after_minutes: params.buffer_after as number | undefined,
    availability_schedule: defaultAvailability,
  });
  
  return {
    success: true,
    data: link,
    message: `Created scheduling link: /book/${link.slug}`,
  };
}

async function handleRespondToInvite(
  params: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  // Get user's email (in production, fetch from user profile)
  const userEmail = context.owner_id; // Simplified for now
  
  const attendee = await calendarService.updateAttendeeResponse(
    params.event_id as string,
    userEmail,
    params.response as 'accepted' | 'declined' | 'tentative'
  );
  
  if (!attendee) {
    return {
      success: false,
      error: 'Could not find your invitation for this event',
    };
  }
  
  return {
    success: true,
    data: attendee,
    message: `Responded "${params.response}" to the invitation`,
  };
}

async function handleGetTodayAgenda(context: ToolContext): Promise<ToolResult> {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  today.setHours(0, 0, 0, 0);
  tomorrow.setHours(0, 0, 0, 0);
  
  const events = await calendarService.getEvents({
    owner_id: context.owner_id,
    start_date: today.toISOString(),
    end_date: tomorrow.toISOString(),
  });
  
  if (events.length === 0) {
    return {
      success: true,
      data: [],
      message: 'You have no events scheduled for today',
    };
  }
  
  // Sort by start time
  events.sort((a, b) => 
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );
  
  const agenda = events.map(event => ({
    time: new Date(event.start_time).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    title: event.title,
    location: event.location,
    duration: Math.round(
      (new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / 60000
    ) + ' min',
  }));
  
  return {
    success: true,
    data: { events, agenda },
    message: `Today's agenda: ${events.length} events`,
  };
}

async function handleSmartSchedule(
  params: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  const durationMinutes = params.duration_minutes as number;
  const withinDays = (params.within_days as number) || 7;
  const preferredTime = (params.preferred_time as string) || 'any';
  
  // Define time ranges based on preference
  const timeRanges = {
    morning: { start: '08:00', end: '12:00' },
    afternoon: { start: '12:00', end: '17:00' },
    evening: { start: '17:00', end: '20:00' },
    any: { start: '09:00', end: '17:00' },
  };
  
  const range = timeRanges[preferredTime as keyof typeof timeRanges] || timeRanges.any;
  const suggestions: Array<{ date: string; slots: FreeSlot[] }> = [];
  
  // Check each day for the next N days
  for (let i = 0; i < withinDays; i++) {
    const checkDate = new Date();
    checkDate.setDate(checkDate.getDate() + i);
    
    // Skip weekends for work scheduling
    const dayOfWeek = checkDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;
    
    const dateStr = checkDate.toISOString().split('T')[0];
    
    const slots = await calendarService.findFreeSlots({
      owner_id: context.owner_id,
      date: dateStr,
      duration_minutes: durationMinutes,
      work_hours_start: range.start,
      work_hours_end: range.end,
    });
    
    if (slots.length > 0) {
      suggestions.push({
        date: dateStr,
        slots: slots.slice(0, 3), // Top 3 slots per day
      });
    }
    
    // Stop if we found enough options
    if (suggestions.length >= 3) break;
  }
  
  if (suggestions.length === 0) {
    return {
      success: false,
      error: `No available ${durationMinutes}-minute slots found in the next ${withinDays} days`,
      message: 'Try extending the search range or reducing the duration',
    };
  }
  
  // Format the best suggestion
  const bestSlot = suggestions[0].slots[0];
  const bestDate = suggestions[0].date;
  
  return {
    success: true,
    data: {
      suggestions,
      recommended: {
        date: bestDate,
        start_time: bestSlot.slot_start,
        end_time: new Date(
          new Date(bestSlot.slot_start).getTime() + durationMinutes * 60000
        ).toISOString(),
      },
    },
    message: `Recommended: ${new Date(bestDate).toLocaleDateString()} at ${new Date(bestSlot.slot_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
  };
}

// ============================================
// EXPORT FOR GOOSE INTEGRATION
// ============================================

export function getCalendarToolDefinitions(): ToolDefinition[] {
  return calendarTools;
}

export function getCalendarToolNames(): string[] {
  return calendarTools.map(t => t.name);
}
