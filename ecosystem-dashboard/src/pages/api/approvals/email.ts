/**
 * Email Approvals API
 * POST /api/approvals/email - Create email approval request
 * 
 * Agent-facing endpoint for routing email drafts and send actions
 * through the approval system before execution.
 * Optimized for the iPhone approvals page with real-time notifications.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import ApprovalService from '@/services/ApprovalService';
import type { ApprovalActionType, EmailPayload, AgentSource } from '@/types/approval';

type EmailAction = 'draft' | 'send' | 'reply' | 'forward';

interface EmailApprovalRequest {
  action: EmailAction;
  email: {
    to: string | string[] | Array<{ email: string; name?: string }>;
    cc?: string | string[] | Array<{ email: string; name?: string }>;
    bcc?: string | string[] | Array<{ email: string; name?: string }>;
    subject: string;
    body: string;
    body_html?: string;
    attachments?: Array<{
      filename: string;
      content_type: string;
      size_bytes: number;
      url?: string;
    }>;
    reply_to_id?: string;
    thread_id?: string;
    draft_id?: string;
    original_email_id?: string;
    priority?: 'high' | 'normal' | 'low';
    send_at?: string;
  };
  agent: {
    id: string;
    name: string;
    type?: AgentSource['type'];
    conversation_id?: string;
    session_id?: string;
  };
  reasoning?: string;
  confidence?: number;
  context?: string;
  original_email?: {
    from: string;
    subject: string;
    snippet?: string;
  };
}

// Normalize recipient format to array of { email, name }
function normalizeRecipients(
  recipients: string | string[] | Array<{ email: string; name?: string }> | undefined
): Array<{ email: string; name?: string }> {
  if (!recipients) return [];
  
  if (typeof recipients === 'string') {
    return recipients.split(',').map(e => ({ email: e.trim() })).filter(r => r.email);
  }
  
  if (Array.isArray(recipients)) {
    return recipients.map(r => {
      if (typeof r === 'string') {
        return { email: r.trim() };
      }
      return r;
    }).filter(r => r.email);
  }
  
  return [];
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
      email,
      agent,
      reasoning,
      confidence,
      context,
      original_email,
    } = req.body as EmailApprovalRequest;

    // Validate required fields
    if (!action || !email || !agent) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['action', 'email', 'agent'],
      });
    }

    if (!['draft', 'send', 'reply', 'forward'].includes(action)) {
      return res.status(400).json({
        error: 'Invalid action',
        valid_actions: ['draft', 'send', 'reply', 'forward'],
      });
    }

    // Validate email payload
    if (!email.to || !email.subject || !email.body) {
      return res.status(400).json({
        error: 'Invalid email payload',
        required: ['to', 'subject', 'body'],
      });
    }

    // For reply/forward, original email info is helpful
    if ((action === 'reply' || action === 'forward') && !email.reply_to_id && !email.original_email_id) {
      console.warn('[Email Approvals] Reply/forward without original email reference');
    }

    // Map action to approval action type
    const actionTypeMap: Record<EmailAction, ApprovalActionType> = {
      draft: 'email_draft_create',
      send: 'email_send',
      reply: 'email_reply',
      forward: 'email_forward',
    };

    // Build normalized email payload
    const emailPayload: EmailPayload = {
      to: normalizeRecipients(email.to),
      cc: normalizeRecipients(email.cc),
      bcc: normalizeRecipients(email.bcc),
      subject: email.subject,
      body: email.body,
      body_html: email.body_html,
      attachments: email.attachments,
      reply_to_id: email.reply_to_id || email.original_email_id,
      thread_id: email.thread_id,
      draft_id: email.draft_id,
      priority: email.priority,
      send_at: email.send_at,
    };

    const agentSource: AgentSource = {
      id: agent.id,
      name: agent.name,
      type: agent.type || 'email-agent',
      conversation_id: agent.conversation_id,
      session_id: agent.session_id,
    };

    // Generate descriptive title
    const actionVerb = {
      draft: 'Draft',
      send: 'Send',
      reply: 'Reply',
      forward: 'Forward',
    }[action];
    
    const recipientPreview = emailPayload.to.slice(0, 2).map(r => r.name || r.email).join(', ');
    const moreRecipients = emailPayload.to.length > 2 ? ` +${emailPayload.to.length - 2}` : '';
    const title = `${actionVerb}: ${email.subject}`;

    // Build reasoning with context
    let fullReasoning = reasoning || '';
    if (original_email) {
      fullReasoning += fullReasoning ? '\n\n' : '';
      fullReasoning += `Original email from ${original_email.from}: "${original_email.subject}"`;
    }
    if (emailPayload.attachments && emailPayload.attachments.length > 0) {
      fullReasoning += fullReasoning ? '\n' : '';
      fullReasoning += `Includes ${emailPayload.attachments.length} attachment(s)`;
    }

    // Create the approval request
    const approval = await ApprovalService.createApprovalRequest({
      actionType: actionTypeMap[action],
      payload: emailPayload,
      agent: agentSource,
      userId,
      title,
      aiReasoning: fullReasoning || `${actionVerb} email to ${recipientPreview}${moreRecipients}`,
      aiConfidence: confidence,
      context,
    });

    return res.status(201).json({
      success: true,
      approval_id: approval.id,
      status: approval.status,
      message: approval.status === 'approved'
        ? `Email ${action} auto-approved and queued for execution`
        : `Email ${action} queued for approval`,
      approval: {
        id: approval.id,
        status: approval.status,
        priority: approval.priority,
        risk_level: approval.risk.level,
        expires_at: approval.expires_at,
        title: approval.title,
        summary: approval.summary,
      },
    });

  } catch (error) {
    console.error('[Email Approvals API] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: (error as Error).message,
    });
  }
}
