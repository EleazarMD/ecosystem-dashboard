/**
 * Calendar Events API with Approval Gate
 * 
 * This is an approval-gated version of the calendar events API.
 * POST requests for creating events go through the approval system.
 * 
 * GET /api/calendar/events-gated - Get events (no approval needed)
 * POST /api/calendar/events-gated - Create event (requires approval)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import * as calendarService from '@/lib/calendar';
import ApprovalService from '@/services/ApprovalService';
import type { CalendarEventPayload } from '@/types/approval';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const owner_id = (session.user as any).id;
  
  // Check if this is an approved action execution
  const approvalId = req.headers['x-approval-id'] as string;
  const isApprovedExecution = !!approvalId;

  try {
    if (req.method === 'GET') {
      // GET requests don't need approval
      const { start_date, end_date, calendar_ids } = req.query;

      if (!start_date || !end_date) {
        return res.status(400).json({ 
          error: 'start_date and end_date are required' 
        });
      }

      const events = await calendarService.getEvents({
        owner_id,
        start_date: start_date as string,
        end_date: end_date as string,
        calendar_ids: calendar_ids 
          ? (calendar_ids as string).split(',') 
          : undefined,
      });

      const mappedEvents = events.map(event => ({
        ...event,
        id: (event as unknown as Record<string, unknown>).event_id || event.id,
      }));

      return res.status(200).json({ events: mappedEvents });
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
        timezone,
        attendees,
        reminders,
        // Agent context for approval
        agent_id,
        agent_name,
        agent_type,
        conversation_id,
        ai_reasoning,
        user_request,
        skip_approval, // For internal/approved calls
      } = req.body;

      if (!title || !start_time || !end_time) {
        return res.status(400).json({ 
          error: 'title, start_time, and end_time are required' 
        });
      }

      // If this is an approved execution or skip_approval is set, execute directly
      if (isApprovedExecution || skip_approval === true) {
        // Get default calendar if not specified
        let targetCalendarId = calendar_id;
        if (!targetCalendarId) {
          const defaultCalendar = await calendarService.ensureDefaultCalendar(owner_id);
          targetCalendarId = defaultCalendar.id;
        }

        // Check for conflicts
        const conflicts = await calendarService.checkConflicts({
          owner_id,
          start_time,
          end_time,
        });

        if (conflicts.length > 0) {
          return res.status(409).json({
            error: 'Time conflict detected',
            conflicts,
          });
        }

        const event = await calendarService.createEvent({
          calendar_id: targetCalendarId,
          title,
          start_time,
          end_time,
          description,
          location,
          all_day,
          timezone,
          created_by: owner_id,
          attendees,
          reminders,
        });

        return res.status(201).json({ 
          event,
          approval_status: isApprovedExecution ? 'executed_after_approval' : 'skipped',
        });
      }

      // Create approval request
      const payload: CalendarEventPayload = {
        calendar_id,
        title,
        start_time,
        end_time,
        description,
        location,
        all_day,
        timezone,
        attendees: attendees?.map((a: any) => ({
          email: a.email,
          name: a.name,
          response_status: a.response_status,
        })),
        reminders: reminders?.map((r: any) => ({
          method: r.method,
          minutes_before: r.minutes_before,
        })),
      };

      const approval = await ApprovalService.createApprovalRequest({
        actionType: 'calendar_event_create',
        payload,
        agent: {
          id: agent_id || 'calendar-api',
          name: agent_name || 'Calendar API',
          type: agent_type || 'calendar-agent',
          conversation_id,
        },
        userId: owner_id,
        title: `Create: ${title}`,
        aiReasoning: ai_reasoning,
        context: user_request,
      });

      // Check if auto-approved
      if (approval.status === 'executed') {
        return res.status(201).json({
          event: approval.execution_result?.data?.event,
          approval_id: approval.id,
          approval_status: 'auto_approved',
        });
      }

      // Return pending approval
      return res.status(202).json({
        message: 'Event creation requires approval',
        approval_id: approval.id,
        approval_status: 'pending',
        expires_at: approval.expires_at,
      });
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
