/**
 * Calendar Agent Tools
 * 
 * Google ADK tool functions for AI Homelab Calendar System integration.
 * These tools enable natural language calendar management through the dashboard agent.
 */

import { Tool } from '../mock-google-adk';

// ============================================================================
// CALENDAR EVENT TOOLS
// ============================================================================

export const calendarCreateEvent: Tool = {
  name: 'calendar_create_event',
  description: 'Create a new calendar event. Use this when the user wants to schedule a meeting, appointment, or any time-blocked activity.',
  parameters: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'The title/name of the event'
      },
      start_time: {
        type: 'string',
        description: 'Start time in ISO 8601 format (e.g., 2025-12-20T09:00:00-06:00)'
      },
      end_time: {
        type: 'string',
        description: 'End time in ISO 8601 format'
      },
      description: {
        type: 'string',
        description: 'Optional description or notes for the event'
      },
      location: {
        type: 'string',
        description: 'Physical location or virtual meeting URL'
      },
      calendar_id: {
        type: 'string',
        description: 'ID of the calendar to create the event in. If not provided, uses default calendar.'
      },
      attendees: {
        type: 'array',
        description: 'List of attendee email addresses'
      },
      all_day: {
        type: 'boolean',
        description: 'Whether this is an all-day event'
      },
      reminder_minutes: {
        type: 'number',
        description: 'Minutes before event to send reminder (default: 30)'
      }
    },
    required: ['title', 'start_time', 'end_time']
  },
  handler: async (params: any) => {
    try {
      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error || `Failed to create event: ${response.statusText}`,
          conflicts: error.conflicts
        };
      }
      
      const data = await response.json();
      return {
        success: true,
        event: data.event,
        message: `Created event "${data.event.title}" on ${new Date(data.event.start_time).toLocaleDateString()}`
      };
    } catch (error) {
      return {
        success: false,
        error: `Calendar service error: ${error}`
      };
    }
  }
};

export const calendarGetEvents: Tool = {
  name: 'calendar_get_events',
  description: 'Get calendar events for a date range. Use this to see what\'s scheduled, check availability, or review upcoming events.',
  parameters: {
    type: 'object',
    properties: {
      start_date: {
        type: 'string',
        description: 'Start date in ISO 8601 format'
      },
      end_date: {
        type: 'string',
        description: 'End date in ISO 8601 format'
      },
      calendar_ids: {
        type: 'string',
        description: 'Optional comma-separated list of specific calendar IDs to query'
      }
    },
    required: ['start_date', 'end_date']
  },
  handler: async (params: any) => {
    try {
      const queryParams = new URLSearchParams({
        start_date: params.start_date,
        end_date: params.end_date
      });
      
      if (params.calendar_ids) {
        queryParams.append('calendar_ids', params.calendar_ids);
      }
      
      const response = await fetch(`/api/calendar/events?${queryParams}`);
      
      if (!response.ok) {
        return {
          success: false,
          error: `Failed to get events: ${response.statusText}`
        };
      }
      
      const data = await response.json();
      return {
        success: true,
        events: data.events,
        count: data.events.length,
        message: `Found ${data.events.length} events`
      };
    } catch (error) {
      return {
        success: false,
        error: `Calendar service error: ${error}`
      };
    }
  }
};

export const calendarUpdateEvent: Tool = {
  name: 'calendar_update_event',
  description: 'Update an existing calendar event. Use this to reschedule, change details, or modify attendees.',
  parameters: {
    type: 'object',
    properties: {
      event_id: {
        type: 'string',
        description: 'The ID of the event to update'
      },
      title: {
        type: 'string',
        description: 'New title for the event'
      },
      start_time: {
        type: 'string',
        description: 'New start time in ISO 8601 format'
      },
      end_time: {
        type: 'string',
        description: 'New end time in ISO 8601 format'
      },
      description: {
        type: 'string',
        description: 'New description'
      },
      location: {
        type: 'string',
        description: 'New location'
      },
      status: {
        type: 'string',
        enum: ['tentative', 'confirmed', 'cancelled'],
        description: 'Event status'
      }
    },
    required: ['event_id']
  },
  handler: async (params: any) => {
    try {
      const { event_id, ...updates } = params;
      
      const response = await fetch(`/api/calendar/events/${event_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error || `Failed to update event: ${response.statusText}`,
          conflicts: error.conflicts
        };
      }
      
      const data = await response.json();
      return {
        success: true,
        event: data.event,
        message: `Updated event "${data.event.title}"`
      };
    } catch (error) {
      return {
        success: false,
        error: `Calendar service error: ${error}`
      };
    }
  }
};

export const calendarDeleteEvent: Tool = {
  name: 'calendar_delete_event',
  description: 'Delete or cancel a calendar event. Use this when the user wants to remove an event from their calendar.',
  parameters: {
    type: 'object',
    properties: {
      event_id: {
        type: 'string',
        description: 'The ID of the event to delete'
      },
      notify_attendees: {
        type: 'boolean',
        description: 'Whether to notify attendees about the cancellation (default: true)'
      }
    },
    required: ['event_id']
  },
  handler: async (params: any) => {
    try {
      const queryParams = params.notify_attendees === false ? '?notify_attendees=false' : '';
      
      const response = await fetch(`/api/calendar/events/${params.event_id}${queryParams}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        return {
          success: false,
          error: `Failed to delete event: ${response.statusText}`
        };
      }
      
      const data = await response.json();
      return {
        success: true,
        message: data.message
      };
    } catch (error) {
      return {
        success: false,
        error: `Calendar service error: ${error}`
      };
    }
  }
};

// ============================================================================
// SCHEDULING TOOLS
// ============================================================================

export const calendarFindFreeTime: Tool = {
  name: 'calendar_find_free_time',
  description: 'Find available time slots on a specific date. Use this to help schedule meetings by finding when the user is free.',
  parameters: {
    type: 'object',
    properties: {
      date: {
        type: 'string',
        description: 'The date to check for free time (YYYY-MM-DD format)'
      },
      duration_minutes: {
        type: 'number',
        description: 'Minimum duration needed for the slot in minutes (default: 60)'
      },
      work_hours_start: {
        type: 'string',
        description: 'Start of work hours (HH:mm format, default: 09:00)'
      },
      work_hours_end: {
        type: 'string',
        description: 'End of work hours (HH:mm format, default: 17:00)'
      }
    },
    required: ['date']
  },
  handler: async (params: any) => {
    try {
      const queryParams = new URLSearchParams({ date: params.date });
      
      if (params.duration_minutes) {
        queryParams.append('duration_minutes', params.duration_minutes.toString());
      }
      if (params.work_hours_start) {
        queryParams.append('work_hours_start', params.work_hours_start);
      }
      if (params.work_hours_end) {
        queryParams.append('work_hours_end', params.work_hours_end);
      }
      
      const response = await fetch(`/api/calendar/free-time?${queryParams}`);
      
      if (!response.ok) {
        return {
          success: false,
          error: `Failed to find free time: ${response.statusText}`
        };
      }
      
      const data = await response.json();
      
      if (data.slots.length === 0) {
        return {
          success: true,
          slots: [],
          message: 'No free time slots available on this date'
        };
      }
      
      const formattedSlots = data.slots.map((slot: any) => ({
        ...slot,
        formatted: `${new Date(slot.slot_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(slot.slot_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${slot.duration_minutes} min)`
      }));
      
      return {
        success: true,
        date: data.date,
        slots: formattedSlots,
        count: data.count,
        message: `Found ${data.count} available time slots`
      };
    } catch (error) {
      return {
        success: false,
        error: `Calendar service error: ${error}`
      };
    }
  }
};

export const calendarGetStats: Tool = {
  name: 'calendar_get_stats',
  description: 'Get calendar statistics including event counts, pending invites, and sync status.',
  parameters: {
    type: 'object',
    properties: {}
  },
  handler: async () => {
    try {
      const response = await fetch('/api/calendar/stats');
      
      if (!response.ok) {
        return {
          success: false,
          error: `Failed to get calendar stats: ${response.statusText}`
        };
      }
      
      const data = await response.json();
      return {
        success: true,
        stats: data.stats,
        message: `${data.stats.events_today} events today, ${data.stats.events_this_week} this week`
      };
    } catch (error) {
      return {
        success: false,
        error: `Calendar service error: ${error}`
      };
    }
  }
};

export const calendarListCalendars: Tool = {
  name: 'calendar_list_calendars',
  description: 'List all calendars available to the user. Use this to see what calendars exist and their settings.',
  parameters: {
    type: 'object',
    properties: {}
  },
  handler: async () => {
    try {
      const response = await fetch('/api/calendar/calendars');
      
      if (!response.ok) {
        return {
          success: false,
          error: `Failed to list calendars: ${response.statusText}`
        };
      }
      
      const data = await response.json();
      return {
        success: true,
        calendars: data.calendars,
        count: data.calendars.length,
        message: `You have ${data.calendars.length} calendars`
      };
    } catch (error) {
      return {
        success: false,
        error: `Calendar service error: ${error}`
      };
    }
  }
};

export const calendarGetTodayAgenda: Tool = {
  name: 'calendar_get_today_agenda',
  description: 'Get today\'s agenda with all scheduled events. Perfect for morning briefings.',
  parameters: {
    type: 'object',
    properties: {}
  },
  handler: async () => {
    try {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      today.setHours(0, 0, 0, 0);
      tomorrow.setHours(0, 0, 0, 0);
      
      const queryParams = new URLSearchParams({
        start_date: today.toISOString(),
        end_date: tomorrow.toISOString()
      });
      
      const response = await fetch(`/api/calendar/events?${queryParams}`);
      
      if (!response.ok) {
        return {
          success: false,
          error: `Failed to get today's agenda: ${response.statusText}`
        };
      }
      
      const data = await response.json();
      
      if (data.events.length === 0) {
        return {
          success: true,
          events: [],
          message: 'You have no events scheduled for today'
        };
      }
      
      // Sort by start time
      const events = data.events.sort((a: any, b: any) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
      
      const agenda = events.map((event: any) => ({
        time: new Date(event.start_time).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        title: event.title,
        location: event.location,
        duration: Math.round(
          (new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / 60000
        ) + ' min'
      }));
      
      return {
        success: true,
        events,
        agenda,
        count: events.length,
        message: `Today's agenda: ${events.length} events`
      };
    } catch (error) {
      return {
        success: false,
        error: `Calendar service error: ${error}`
      };
    }
  }
};

// ============================================================================
// SCHEDULING LINKS TOOLS
// ============================================================================

export const calendarCreateSchedulingLink: Tool = {
  name: 'calendar_create_scheduling_link',
  description: 'Create a booking/scheduling link that others can use to book time with the user (like Calendly).',
  parameters: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Title for the scheduling link (e.g., "30-minute Meeting")'
      },
      slug: {
        type: 'string',
        description: 'URL slug for the booking link (e.g., "30-min-meeting")'
      },
      duration_minutes: {
        type: 'number',
        description: 'Duration of bookable meetings in minutes'
      },
      description: {
        type: 'string',
        description: 'Optional description shown to bookers'
      },
      buffer_before: {
        type: 'number',
        description: 'Buffer time before meetings in minutes'
      },
      buffer_after: {
        type: 'number',
        description: 'Buffer time after meetings in minutes'
      }
    },
    required: ['title', 'slug', 'duration_minutes']
  },
  handler: async (params: any) => {
    try {
      const response = await fetch('/api/calendar/scheduling-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: params.title,
          slug: params.slug,
          duration_minutes: params.duration_minutes,
          description: params.description,
          buffer_before_minutes: params.buffer_before,
          buffer_after_minutes: params.buffer_after
        })
      });
      
      if (!response.ok) {
        return {
          success: false,
          error: `Failed to create scheduling link: ${response.statusText}`
        };
      }
      
      const data = await response.json();
      return {
        success: true,
        link: data.link,
        booking_url: data.booking_url,
        message: `Created scheduling link: ${data.booking_url}`
      };
    } catch (error) {
      return {
        success: false,
        error: `Calendar service error: ${error}`
      };
    }
  }
};

// ============================================================================
// SYNC TOOLS
// ============================================================================

export const calendarSyncApple: Tool = {
  name: 'calendar_sync_apple',
  description: 'Trigger a sync with Apple Calendar. Use this to manually refresh calendar data from iCloud.',
  parameters: {
    type: 'object',
    properties: {
      account_id: {
        type: 'string',
        description: 'The Apple Calendar sync account ID'
      }
    },
    required: ['account_id']
  },
  handler: async (params: any) => {
    try {
      const response = await fetch('/api/calendar/sync/apple', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: params.account_id })
      });
      
      if (!response.ok) {
        return {
          success: false,
          error: `Failed to sync Apple Calendar: ${response.statusText}`
        };
      }
      
      const data = await response.json();
      return {
        success: data.result.success,
        result: data.result,
        message: data.message
      };
    } catch (error) {
      return {
        success: false,
        error: `Calendar sync error: ${error}`
      };
    }
  }
};

// ============================================================================
// EMAIL EXTRACTION TOOLS
// ============================================================================

export const calendarGetEmailExtractions: Tool = {
  name: 'calendar_get_email_extractions',
  description: 'Get pending calendar event extractions from emails that need review.',
  parameters: {
    type: 'object',
    properties: {}
  },
  handler: async () => {
    try {
      const response = await fetch('/api/calendar/email-extractions');
      
      if (!response.ok) {
        return {
          success: false,
          error: `Failed to get email extractions: ${response.statusText}`
        };
      }
      
      const data = await response.json();
      return {
        success: true,
        extractions: data.extractions,
        stats: data.stats,
        pending_count: data.extractions.length,
        message: `${data.extractions.length} pending event extractions from emails`
      };
    } catch (error) {
      return {
        success: false,
        error: `Calendar service error: ${error}`
      };
    }
  }
};

export const calendarAcceptEmailExtraction: Tool = {
  name: 'calendar_accept_email_extraction',
  description: 'Accept an email extraction and create the calendar event.',
  parameters: {
    type: 'object',
    properties: {
      extraction_id: {
        type: 'string',
        description: 'The ID of the email extraction to accept'
      },
      calendar_id: {
        type: 'string',
        description: 'Optional calendar ID to create the event in'
      }
    },
    required: ['extraction_id']
  },
  handler: async (params: any) => {
    try {
      const response = await fetch(`/api/calendar/email-extractions/${params.extraction_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'accept',
          calendar_id: params.calendar_id
        })
      });
      
      if (!response.ok) {
        return {
          success: false,
          error: `Failed to accept extraction: ${response.statusText}`
        };
      }
      
      const data = await response.json();
      return {
        success: true,
        event: data.event,
        message: data.message
      };
    } catch (error) {
      return {
        success: false,
        error: `Calendar service error: ${error}`
      };
    }
  }
};

// ============================================================================
// EXPORT ALL CALENDAR TOOLS
// ============================================================================

export const calendarTools = [
  calendarCreateEvent,
  calendarGetEvents,
  calendarUpdateEvent,
  calendarDeleteEvent,
  calendarFindFreeTime,
  calendarGetStats,
  calendarListCalendars,
  calendarGetTodayAgenda,
  calendarCreateSchedulingLink,
  calendarSyncApple,
  calendarGetEmailExtractions,
  calendarAcceptEmailExtraction
];

export default calendarTools;
