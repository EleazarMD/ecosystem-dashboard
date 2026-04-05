/**
 * Approval Integration Library
 * 
 * Provides utilities for integrating the approval system into existing
 * AI agent actions. Use these wrappers to ensure all consequential
 * actions go through the human-in-the-loop approval system.
 */

import type {
  ApprovalActionType,
  CalendarEventPayload,
  EmailPayload,
  AgentSource,
} from '@/types/approval';

/**
 * Wrapper to make any action require approval
 */
export async function requireApproval<T>(
  actionType: ApprovalActionType,
  payload: T,
  agent: AgentSource,
  options?: {
    title?: string;
    aiReasoning?: string;
    aiConfidence?: number;
    context?: string;
    userId?: string;
  }
): Promise<{
  requiresApproval: boolean;
  approvalId?: string;
  status: 'pending' | 'auto-approved' | 'error';
  result?: any;
  message: string;
}> {
  const userId = options?.userId || 'default-user';
  
  try {
    const response = await fetch('/api/approvals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      },
      body: JSON.stringify({
        action_type: actionType,
        payload,
        agent,
        title: options?.title,
        ai_reasoning: options?.aiReasoning,
        ai_confidence: options?.aiConfidence,
        context: options?.context,
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
    
    // Check if auto-approved
    if (data.approval.status === 'approved' || data.approval.status === 'executed') {
      return {
        requiresApproval: false,
        approvalId: data.approval.id,
        status: 'auto-approved',
        result: data.approval.execution_result?.data,
        message: 'Action was auto-approved and executed',
      };
    }

    return {
      requiresApproval: true,
      approvalId: data.approval.id,
      status: 'pending',
      message: 'Action requires human approval',
    };
  } catch (error) {
    return {
      requiresApproval: false,
      status: 'error',
      message: (error as Error).message,
    };
  }
}

/**
 * Create a calendar event with approval
 */
export async function createCalendarEventWithApproval(
  event: CalendarEventPayload,
  agent: AgentSource,
  context?: { aiReasoning?: string; userRequest?: string }
) {
  return requireApproval('calendar_event_create', event, agent, {
    title: `Create: ${event.title}`,
    aiReasoning: context?.aiReasoning,
    context: context?.userRequest,
  });
}

/**
 * Send an email with approval
 */
export async function sendEmailWithApproval(
  email: EmailPayload,
  agent: AgentSource,
  context?: { aiReasoning?: string; userRequest?: string }
) {
  return requireApproval('email_send', email, agent, {
    title: `Send: ${email.subject}`,
    aiReasoning: context?.aiReasoning,
    context: context?.userRequest,
  });
}

/**
 * Create an email draft with approval
 */
export async function createEmailDraftWithApproval(
  email: EmailPayload,
  agent: AgentSource,
  context?: { aiReasoning?: string; userRequest?: string }
) {
  return requireApproval('email_draft_create', email, agent, {
    title: `Draft: ${email.subject}`,
    aiReasoning: context?.aiReasoning,
    context: context?.userRequest,
  });
}

/**
 * Send a calendar invite with approval
 */
export async function sendCalendarInviteWithApproval(
  event: CalendarEventPayload,
  agent: AgentSource,
  context?: { aiReasoning?: string; userRequest?: string }
) {
  return requireApproval('calendar_invite_send', event, agent, {
    title: `Invite: ${event.title}`,
    aiReasoning: context?.aiReasoning,
    context: context?.userRequest,
  });
}

/**
 * Example integration for Goose/WorkspaceAI agent
 * 
 * Usage in agent tool handlers:
 * 
 * ```typescript
 * import { createCalendarEventWithApproval } from '@/lib/approvalIntegration';
 * 
 * async function handleCreateCalendarEvent(params: any, sessionContext: any) {
 *   const result = await createCalendarEventWithApproval(
 *     {
 *       title: params.title,
 *       start_time: params.start_time,
 *       end_time: params.end_time,
 *       description: params.description,
 *       location: params.location,
 *       attendees: params.attendees,
 *     },
 *     {
 *       id: 'workspace-ai',
 *       name: 'Workspace AI',
 *       type: 'workspace-ai',
 *       conversation_id: sessionContext.conversationId,
 *       session_id: sessionContext.sessionId,
 *     },
 *     {
 *       aiReasoning: 'User requested to schedule a meeting',
 *       userRequest: sessionContext.lastUserMessage,
 *     }
 *   );
 * 
 *   if (result.requiresApproval) {
 *     return {
 *       type: 'pending_approval',
 *       message: `I've prepared the calendar event "${params.title}". ` +
 *                `Please approve it in your mobile dashboard before I can create it.`,
 *       approvalId: result.approvalId,
 *     };
 *   }
 * 
 *   if (result.status === 'auto-approved') {
 *     return {
 *       type: 'success',
 *       message: `Created calendar event "${params.title}"`,
 *       data: result.result,
 *     };
 *   }
 * 
 *   return {
 *     type: 'error',
 *     message: result.message,
 *   };
 * }
 * ```
 */

/**
 * Helper to format approval status for AI response
 */
export function formatApprovalResponse(
  result: Awaited<ReturnType<typeof requireApproval>>,
  actionDescription: string
): string {
  if (result.status === 'error') {
    return `I encountered an error while trying to ${actionDescription}: ${result.message}`;
  }

  if (result.status === 'auto-approved') {
    return `I've completed the action: ${actionDescription}`;
  }

  return `I've prepared to ${actionDescription}, but it requires your approval first. ` +
         `Please check your mobile dashboard to approve or reject this action. ` +
         `Approval ID: ${result.approvalId}`;
}

/**
 * Constants for agent identification
 */
export const AGENT_SOURCES = {
  WORKSPACE_AI: {
    id: 'workspace-ai',
    name: 'Workspace AI',
    type: 'workspace-ai' as const,
  },
  EMAIL_AGENT: {
    id: 'email-agent',
    name: 'Email Agent',
    type: 'email-agent' as const,
  },
  CALENDAR_AGENT: {
    id: 'calendar-agent',
    name: 'Calendar Agent',
    type: 'calendar-agent' as const,
  },
  GOOSE: {
    id: 'goose',
    name: 'Goose',
    type: 'goose' as const,
  },
};
