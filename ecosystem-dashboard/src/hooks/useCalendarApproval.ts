/**
 * useCalendarApproval Hook
 * 
 * Hook for integrating calendar actions with the approval system.
 * Wraps calendar event operations to require human approval.
 */

import { useCallback } from 'react';
import { useApprovalSafe } from '@/contexts/ApprovalContext';
import type { CalendarEventPayload, AgentSource } from '@/types/approval';

interface CalendarApprovalOptions {
  agentId?: string;
  agentName?: string;
  conversationId?: string;
}

interface GatedCalendarResult {
  requiresApproval: boolean;
  approvalId?: string;
  status: 'pending' | 'auto-approved' | 'error';
  message: string;
  result?: any;
}

export function useCalendarApproval(options: CalendarApprovalOptions = {}) {
  const {
    agentId = 'calendar-agent',
    agentName = 'Calendar Agent',
    conversationId,
  } = options;

  const approval = useApprovalSafe();

  /**
   * Create a calendar event with approval gate
   */
  const createEventWithApproval = useCallback(async (
    event: {
      title: string;
      startTime: string | Date;
      endTime: string | Date;
      description?: string;
      location?: string;
      calendarId?: string;
      attendees?: Array<{ email: string; name?: string }>;
      reminders?: Array<{ method: 'email' | 'popup' | 'sms'; minutesBefore: number }>;
      allDay?: boolean;
      timezone?: string;
    },
    context?: {
      aiReasoning?: string;
      userRequest?: string;
    }
  ): Promise<GatedCalendarResult> => {
    const payload: CalendarEventPayload = {
      calendar_id: event.calendarId,
      title: event.title,
      start_time: typeof event.startTime === 'string' ? event.startTime : event.startTime.toISOString(),
      end_time: typeof event.endTime === 'string' ? event.endTime : event.endTime.toISOString(),
      description: event.description,
      location: event.location,
      attendees: event.attendees?.map(a => ({
        email: a.email,
        name: a.name,
      })),
      reminders: event.reminders?.map(r => ({
        method: r.method,
        minutes_before: r.minutesBefore,
      })),
      all_day: event.allDay,
      timezone: event.timezone,
    };

    const agent: AgentSource = {
      id: agentId,
      name: agentName,
      type: 'calendar-agent',
      conversation_id: conversationId,
    };

    try {
      const response = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: 'calendar_event_create',
          payload,
          agent,
          title: `Create: ${event.title}`,
          ai_reasoning: context?.aiReasoning,
          context: context?.userRequest,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          requiresApproval: false,
          status: 'error',
          message: error.error || 'Failed to create approval request',
        };
      }

      const data = await response.json();

      if (data.approval.status === 'approved' || data.approval.status === 'executed') {
        return {
          requiresApproval: false,
          approvalId: data.approval.id,
          status: 'auto-approved',
          result: data.approval.execution_result?.data,
          message: 'Event created',
        };
      }

      return {
        requiresApproval: true,
        approvalId: data.approval.id,
        status: 'pending',
        message: 'Event creation requires approval',
      };
    } catch (error) {
      return {
        requiresApproval: false,
        status: 'error',
        message: (error as Error).message,
      };
    }
  }, [agentId, agentName, conversationId]);

  /**
   * Update a calendar event with approval gate
   */
  const updateEventWithApproval = useCallback(async (
    event: {
      eventId: string;
      title: string;
      startTime: string | Date;
      endTime: string | Date;
      description?: string;
      location?: string;
      calendarId?: string;
      attendees?: Array<{ email: string; name?: string }>;
    },
    context?: {
      aiReasoning?: string;
      userRequest?: string;
    }
  ): Promise<GatedCalendarResult> => {
    const payload: CalendarEventPayload = {
      event_id: event.eventId,
      calendar_id: event.calendarId,
      title: event.title,
      start_time: typeof event.startTime === 'string' ? event.startTime : event.startTime.toISOString(),
      end_time: typeof event.endTime === 'string' ? event.endTime : event.endTime.toISOString(),
      description: event.description,
      location: event.location,
      attendees: event.attendees?.map(a => ({
        email: a.email,
        name: a.name,
      })),
    };

    const agent: AgentSource = {
      id: agentId,
      name: agentName,
      type: 'calendar-agent',
      conversation_id: conversationId,
    };

    try {
      const response = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: 'calendar_event_update',
          payload,
          agent,
          title: `Update: ${event.title}`,
          ai_reasoning: context?.aiReasoning,
          context: context?.userRequest,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          requiresApproval: false,
          status: 'error',
          message: error.error || 'Failed to create approval request',
        };
      }

      const data = await response.json();

      if (data.approval.status === 'approved' || data.approval.status === 'executed') {
        return {
          requiresApproval: false,
          approvalId: data.approval.id,
          status: 'auto-approved',
          result: data.approval.execution_result?.data,
          message: 'Event updated',
        };
      }

      return {
        requiresApproval: true,
        approvalId: data.approval.id,
        status: 'pending',
        message: 'Event update requires approval',
      };
    } catch (error) {
      return {
        requiresApproval: false,
        status: 'error',
        message: (error as Error).message,
      };
    }
  }, [agentId, agentName, conversationId]);

  /**
   * Delete a calendar event with approval gate
   */
  const deleteEventWithApproval = useCallback(async (
    event: {
      eventId: string;
      title: string;
      startTime: string | Date;
      endTime: string | Date;
      calendarId?: string;
    },
    context?: {
      aiReasoning?: string;
      userRequest?: string;
    }
  ): Promise<GatedCalendarResult> => {
    const payload: CalendarEventPayload = {
      event_id: event.eventId,
      calendar_id: event.calendarId,
      title: event.title,
      start_time: typeof event.startTime === 'string' ? event.startTime : event.startTime.toISOString(),
      end_time: typeof event.endTime === 'string' ? event.endTime : event.endTime.toISOString(),
    };

    const agent: AgentSource = {
      id: agentId,
      name: agentName,
      type: 'calendar-agent',
      conversation_id: conversationId,
    };

    try {
      const response = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: 'calendar_event_delete',
          payload,
          agent,
          title: `Delete: ${event.title}`,
          ai_reasoning: context?.aiReasoning,
          context: context?.userRequest,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          requiresApproval: false,
          status: 'error',
          message: error.error || 'Failed to create approval request',
        };
      }

      const data = await response.json();

      if (data.approval.status === 'approved' || data.approval.status === 'executed') {
        return {
          requiresApproval: false,
          approvalId: data.approval.id,
          status: 'auto-approved',
          result: data.approval.execution_result?.data,
          message: 'Event deleted',
        };
      }

      return {
        requiresApproval: true,
        approvalId: data.approval.id,
        status: 'pending',
        message: 'Event deletion requires approval',
      };
    } catch (error) {
      return {
        requiresApproval: false,
        status: 'error',
        message: (error as Error).message,
      };
    }
  }, [agentId, agentName, conversationId]);

  /**
   * Send a calendar invite with approval gate
   */
  const sendInviteWithApproval = useCallback(async (
    event: {
      title: string;
      startTime: string | Date;
      endTime: string | Date;
      description?: string;
      location?: string;
      calendarId?: string;
      attendees: Array<{ email: string; name?: string }>;
    },
    context?: {
      aiReasoning?: string;
      userRequest?: string;
    }
  ): Promise<GatedCalendarResult> => {
    const payload: CalendarEventPayload = {
      calendar_id: event.calendarId,
      title: event.title,
      start_time: typeof event.startTime === 'string' ? event.startTime : event.startTime.toISOString(),
      end_time: typeof event.endTime === 'string' ? event.endTime : event.endTime.toISOString(),
      description: event.description,
      location: event.location,
      attendees: event.attendees.map(a => ({
        email: a.email,
        name: a.name,
        response_status: 'needsAction',
      })),
    };

    const agent: AgentSource = {
      id: agentId,
      name: agentName,
      type: 'calendar-agent',
      conversation_id: conversationId,
    };

    try {
      const response = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: 'calendar_invite_send',
          payload,
          agent,
          title: `Invite: ${event.title} (${event.attendees.length} attendees)`,
          ai_reasoning: context?.aiReasoning,
          context: context?.userRequest,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          requiresApproval: false,
          status: 'error',
          message: error.error || 'Failed to create approval request',
        };
      }

      const data = await response.json();

      if (data.approval.status === 'approved' || data.approval.status === 'executed') {
        return {
          requiresApproval: false,
          approvalId: data.approval.id,
          status: 'auto-approved',
          result: data.approval.execution_result?.data,
          message: 'Invite sent',
        };
      }

      return {
        requiresApproval: true,
        approvalId: data.approval.id,
        status: 'pending',
        message: 'Invite requires approval before sending',
      };
    } catch (error) {
      return {
        requiresApproval: false,
        status: 'error',
        message: (error as Error).message,
      };
    }
  }, [agentId, agentName, conversationId]);

  return {
    createEventWithApproval,
    updateEventWithApproval,
    deleteEventWithApproval,
    sendInviteWithApproval,
    pendingCount: approval?.pendingCount ?? 0,
  };
}

export default useCalendarApproval;
