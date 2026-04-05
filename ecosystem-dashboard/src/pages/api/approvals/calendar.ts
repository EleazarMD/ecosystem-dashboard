/**
 * Calendar Approvals API
 * POST /api/approvals/calendar - Create calendar event approval request
 * 
 * Agent-facing endpoint for routing calendar actions through the approval system.
 * Supports create, update, and delete operations.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import ApprovalService from '@/services/ApprovalService';
import type { ApprovalActionType, CalendarEventPayload, AgentSource } from '@/types/approval';

interface CalendarApprovalRequest {
  action: 'create' | 'update' | 'delete';
  event: CalendarEventPayload;
  agent: {
    id: string;
    name: string;
    type?: AgentSource['type'];
    conversation_id?: string;
  };
  reasoning?: string;
  confidence?: number;
  context?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const userId = (session.user as any).id;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      action,
      event,
      agent,
      reasoning,
      confidence,
      context,
    } = req.body as CalendarApprovalRequest;

    // Validate required fields
    if (!action || !event || !agent) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['action', 'event', 'agent'],
      });
    }

    if (!['create', 'update', 'delete'].includes(action)) {
      return res.status(400).json({
        error: 'Invalid action',
        valid_actions: ['create', 'update', 'delete'],
      });
    }

    // Validate event payload
    if (!event.title || !event.start_time || !event.end_time) {
      return res.status(400).json({
        error: 'Invalid event payload',
        required: ['title', 'start_time', 'end_time'],
      });
    }

    // For update/delete, event_id is required
    if ((action === 'update' || action === 'delete') && !event.event_id) {
      return res.status(400).json({
        error: `event_id is required for ${action} action`,
      });
    }

    // Map action to approval action type
    const actionTypeMap: Record<string, ApprovalActionType> = {
      create: 'calendar_event_create',
      update: 'calendar_event_update',
      delete: 'calendar_event_delete',
    };

    const agentSource: AgentSource = {
      id: agent.id,
      name: agent.name,
      type: agent.type || 'calendar-agent',
      conversation_id: agent.conversation_id,
    };

    // Generate a descriptive title
    const actionVerb = action === 'create' ? 'Create' : action === 'update' ? 'Update' : 'Delete';
    const eventTime = new Date(event.start_time).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    const title = `${actionVerb}: "${event.title}" on ${eventTime}`;

    // Create the approval request
    const approval = await ApprovalService.createApprovalRequest({
      actionType: actionTypeMap[action],
      payload: event,
      agent: agentSource,
      userId,
      title,
      aiReasoning: reasoning,
      aiConfidence: confidence,
      context,
    });

    return res.status(201).json({
      success: true,
      approval_id: approval.id,
      status: approval.status,
      message: approval.status === 'approved'
        ? 'Calendar action auto-approved and executed'
        : 'Calendar action queued for approval',
      approval: {
        id: approval.id,
        status: approval.status,
        priority: approval.priority,
        risk_level: approval.risk.level,
        expires_at: approval.expires_at,
      },
    });

  } catch (error) {
    console.error('[Calendar Approvals API] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: (error as Error).message,
    });
  }
}
