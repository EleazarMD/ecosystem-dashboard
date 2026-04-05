/**
 * useEmailApproval Hook
 * 
 * Hook for integrating email actions with the approval system.
 * Wraps email send/reply/forward operations to require human approval.
 */

import { useCallback } from 'react';
import { useApprovalSafe } from '@/contexts/ApprovalContext';
import type { EmailPayload, AgentSource } from '@/types/approval';

interface EmailApprovalOptions {
  agentId?: string;
  agentName?: string;
  conversationId?: string;
}

interface GatedEmailResult {
  requiresApproval: boolean;
  approvalId?: string;
  status: 'pending' | 'auto-approved' | 'error';
  message: string;
  result?: any;
}

export function useEmailApproval(options: EmailApprovalOptions = {}) {
  const {
    agentId = 'email-agent',
    agentName = 'Email Agent',
    conversationId,
  } = options;

  const approval = useApprovalSafe();

  /**
   * Send an email with approval gate
   */
  const sendEmailWithApproval = useCallback(async (
    email: {
      to: string | string[];
      cc?: string | string[];
      subject: string;
      body: string;
      inReplyTo?: string;
      threadId?: string;
    },
    context?: {
      aiReasoning?: string;
      userRequest?: string;
    }
  ): Promise<GatedEmailResult> => {
    // Normalize recipients
    const toArray = Array.isArray(email.to) 
      ? email.to 
      : email.to.split(',').map(e => e.trim()).filter(Boolean);
    
    const ccArray = email.cc
      ? (Array.isArray(email.cc) ? email.cc : email.cc.split(',').map(e => e.trim()).filter(Boolean))
      : [];

    const payload: EmailPayload = {
      to: toArray.map(e => ({ email: e })),
      cc: ccArray.map(e => ({ email: e })),
      subject: email.subject,
      body: email.body,
      reply_to_id: email.inReplyTo,
      thread_id: email.threadId,
    };

    const agent: AgentSource = {
      id: agentId,
      name: agentName,
      type: 'email-agent',
      conversation_id: conversationId,
    };

    try {
      const response = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: email.inReplyTo ? 'email_reply' : 'email_send',
          payload,
          agent,
          title: `${email.inReplyTo ? 'Reply' : 'Send'}: ${email.subject}`,
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
          message: 'Email was auto-approved and sent',
        };
      }

      return {
        requiresApproval: true,
        approvalId: data.approval.id,
        status: 'pending',
        message: 'Email requires approval before sending',
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
   * Create an email draft with approval gate
   */
  const createDraftWithApproval = useCallback(async (
    email: {
      to: string | string[];
      cc?: string | string[];
      subject: string;
      body: string;
    },
    context?: {
      aiReasoning?: string;
      userRequest?: string;
    }
  ): Promise<GatedEmailResult> => {
    const toArray = Array.isArray(email.to) 
      ? email.to 
      : email.to.split(',').map(e => e.trim()).filter(Boolean);
    
    const ccArray = email.cc
      ? (Array.isArray(email.cc) ? email.cc : email.cc.split(',').map(e => e.trim()).filter(Boolean))
      : [];

    const payload: EmailPayload = {
      to: toArray.map(e => ({ email: e })),
      cc: ccArray.map(e => ({ email: e })),
      subject: email.subject,
      body: email.body,
    };

    const agent: AgentSource = {
      id: agentId,
      name: agentName,
      type: 'email-agent',
      conversation_id: conversationId,
    };

    try {
      const response = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: 'email_draft_create',
          payload,
          agent,
          title: `Draft: ${email.subject}`,
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

      // Drafts are often auto-approved
      if (data.approval.status === 'approved' || data.approval.status === 'executed') {
        return {
          requiresApproval: false,
          approvalId: data.approval.id,
          status: 'auto-approved',
          result: data.approval.execution_result?.data,
          message: 'Draft created',
        };
      }

      return {
        requiresApproval: true,
        approvalId: data.approval.id,
        status: 'pending',
        message: 'Draft creation requires approval',
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
   * Forward an email with approval gate
   */
  const forwardEmailWithApproval = useCallback(async (
    email: {
      to: string | string[];
      cc?: string | string[];
      subject: string;
      body: string;
      originalEmailId: string;
    },
    context?: {
      aiReasoning?: string;
      userRequest?: string;
    }
  ): Promise<GatedEmailResult> => {
    const toArray = Array.isArray(email.to) 
      ? email.to 
      : email.to.split(',').map(e => e.trim()).filter(Boolean);
    
    const ccArray = email.cc
      ? (Array.isArray(email.cc) ? email.cc : email.cc.split(',').map(e => e.trim()).filter(Boolean))
      : [];

    const payload: EmailPayload = {
      to: toArray.map(e => ({ email: e })),
      cc: ccArray.map(e => ({ email: e })),
      subject: email.subject,
      body: email.body,
      reply_to_id: email.originalEmailId,
    };

    const agent: AgentSource = {
      id: agentId,
      name: agentName,
      type: 'email-agent',
      conversation_id: conversationId,
    };

    try {
      const response = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: 'email_forward',
          payload,
          agent,
          title: `Forward: ${email.subject}`,
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
          message: 'Email forwarded',
        };
      }

      return {
        requiresApproval: true,
        approvalId: data.approval.id,
        status: 'pending',
        message: 'Forward requires approval',
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
    sendEmailWithApproval,
    createDraftWithApproval,
    forwardEmailWithApproval,
    // Expose pending count for UI
    pendingCount: approval?.pendingCount ?? 0,
  };
}

export default useEmailApproval;
