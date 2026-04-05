/**
 * useApprovalGate Hook
 * 
 * A hook that wraps AI agent actions and routes them through the approval system.
 * Use this to gate any consequential action that requires human approval.
 */

import { useCallback } from 'react';
import type {
  ApprovalActionType,
  ApprovalPayload,
  AgentSource,
  CalendarEventPayload,
  EmailPayload,
} from '@/types/approval';

interface ApprovalGateOptions {
  agentId: string;
  agentName: string;
  agentType: AgentSource['type'];
  userId?: string;
  conversationId?: string;
  sessionId?: string;
}

interface GatedActionResult {
  requiresApproval: boolean;
  approvalId?: string;
  status: 'pending' | 'approved' | 'rejected' | 'auto-approved' | 'error';
  message: string;
  result?: any;
}

/**
 * Hook to gate AI agent actions through the approval system
 */
export function useApprovalGate(options: ApprovalGateOptions) {
  const {
    agentId,
    agentName,
    agentType,
    userId = 'default-user',
    conversationId,
    sessionId,
  } = options;
  
  /**
   * Submit an action for approval
   */
  const requestApproval = useCallback(async (
    actionType: ApprovalActionType,
    payload: ApprovalPayload,
    context?: {
      title?: string;
      aiReasoning?: string;
      aiConfidence?: number;
      userRequest?: string;
    }
  ): Promise<GatedActionResult> => {
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
          agent: {
            id: agentId,
            name: agentName,
            type: agentType,
            conversation_id: conversationId,
            session_id: sessionId,
          },
          title: context?.title,
          ai_reasoning: context?.aiReasoning,
          ai_confidence: context?.aiConfidence,
          context: context?.userRequest,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        return {
          requiresApproval: false,
          status: 'error',
          message: error.error || 'Failed to request approval',
        };
      }
      
      const data = await response.json();
      
      // Check if it was auto-approved
      if (data.approval.status === 'approved' || data.approval.status === 'executed') {
        return {
          requiresApproval: false,
          approvalId: data.approval.id,
          status: 'auto-approved',
          message: 'Action was auto-approved and executed',
          result: data.approval.execution_result?.data,
        };
      }
      
      return {
        requiresApproval: true,
        approvalId: data.approval.id,
        status: 'pending',
        message: 'Action requires human approval',
      };
      
    } catch (error) {
      console.error('[useApprovalGate] Request error:', error);
      return {
        requiresApproval: false,
        status: 'error',
        message: (error as Error).message,
      };
    }
  }, [agentId, agentName, agentType, userId, conversationId, sessionId]);
  
  /**
   * Gate a calendar event creation
   */
  const gateCalendarEventCreate = useCallback(async (
    event: CalendarEventPayload,
    context?: { aiReasoning?: string; userRequest?: string }
  ): Promise<GatedActionResult> => {
    return requestApproval('calendar_event_create', event, {
      title: `Create: ${event.title}`,
      ...context,
    });
  }, [requestApproval]);
  
  /**
   * Gate a calendar event update
   */
  const gateCalendarEventUpdate = useCallback(async (
    event: CalendarEventPayload,
    context?: { aiReasoning?: string; userRequest?: string }
  ): Promise<GatedActionResult> => {
    return requestApproval('calendar_event_update', event, {
      title: `Update: ${event.title}`,
      ...context,
    });
  }, [requestApproval]);
  
  /**
   * Gate a calendar event deletion
   */
  const gateCalendarEventDelete = useCallback(async (
    event: CalendarEventPayload,
    context?: { aiReasoning?: string; userRequest?: string }
  ): Promise<GatedActionResult> => {
    return requestApproval('calendar_event_delete', event, {
      title: `Delete: ${event.title}`,
      ...context,
    });
  }, [requestApproval]);
  
  /**
   * Gate sending a calendar invite
   */
  const gateCalendarInviteSend = useCallback(async (
    event: CalendarEventPayload,
    context?: { aiReasoning?: string; userRequest?: string }
  ): Promise<GatedActionResult> => {
    return requestApproval('calendar_invite_send', event, {
      title: `Send invite: ${event.title}`,
      ...context,
    });
  }, [requestApproval]);
  
  /**
   * Gate creating an email draft
   */
  const gateEmailDraftCreate = useCallback(async (
    email: EmailPayload,
    context?: { aiReasoning?: string; userRequest?: string }
  ): Promise<GatedActionResult> => {
    return requestApproval('email_draft_create', email, {
      title: `Draft: ${email.subject}`,
      ...context,
    });
  }, [requestApproval]);
  
  /**
   * Gate sending an email
   */
  const gateEmailSend = useCallback(async (
    email: EmailPayload,
    context?: { aiReasoning?: string; userRequest?: string }
  ): Promise<GatedActionResult> => {
    return requestApproval('email_send', email, {
      title: `Send: ${email.subject}`,
      ...context,
    });
  }, [requestApproval]);
  
  /**
   * Gate replying to an email
   */
  const gateEmailReply = useCallback(async (
    email: EmailPayload,
    context?: { aiReasoning?: string; userRequest?: string }
  ): Promise<GatedActionResult> => {
    return requestApproval('email_reply', email, {
      title: `Reply: ${email.subject}`,
      ...context,
    });
  }, [requestApproval]);
  
  /**
   * Gate forwarding an email
   */
  const gateEmailForward = useCallback(async (
    email: EmailPayload,
    context?: { aiReasoning?: string; userRequest?: string }
  ): Promise<GatedActionResult> => {
    return requestApproval('email_forward', email, {
      title: `Forward: ${email.subject}`,
      ...context,
    });
  }, [requestApproval]);
  
  /**
   * Gate a generic action
   */
  const gateAction = useCallback(async (
    actionType: ApprovalActionType,
    payload: ApprovalPayload,
    context?: { title?: string; aiReasoning?: string; userRequest?: string }
  ): Promise<GatedActionResult> => {
    return requestApproval(actionType, payload, context);
  }, [requestApproval]);
  
  return {
    requestApproval,
    gateCalendarEventCreate,
    gateCalendarEventUpdate,
    gateCalendarEventDelete,
    gateCalendarInviteSend,
    gateEmailDraftCreate,
    gateEmailSend,
    gateEmailReply,
    gateEmailForward,
    gateAction,
  };
}

/**
 * Helper to create an approval-gated version of any async function
 */
export function createGatedAction<T extends ApprovalPayload>(
  actionType: ApprovalActionType,
  originalAction: (payload: T) => Promise<any>,
  gateOptions: ApprovalGateOptions
) {
  return async (
    payload: T,
    context?: { title?: string; aiReasoning?: string; userRequest?: string }
  ) => {
    // Request approval first
    const response = await fetch('/api/approvals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': gateOptions.userId || 'default-user',
      },
      body: JSON.stringify({
        action_type: actionType,
        payload,
        agent: {
          id: gateOptions.agentId,
          name: gateOptions.agentName,
          type: gateOptions.agentType,
          conversation_id: gateOptions.conversationId,
          session_id: gateOptions.sessionId,
        },
        ...context,
      }),
    });
    
    const data = await response.json();
    
    // If auto-approved, the action was already executed
    if (data.approval?.status === 'executed') {
      return data.approval.execution_result?.data;
    }
    
    // Otherwise, return pending status
    return {
      pending: true,
      approvalId: data.approval?.id,
      message: 'Action pending approval',
    };
  };
}

export default useApprovalGate;
