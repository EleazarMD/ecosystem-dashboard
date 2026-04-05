/**
 * Unified Submit for Approval API
 * POST /api/email-graphrag/submit-for-approval
 * 
 * Unified endpoint for ANY agent to submit items to the approval queue.
 * Routes to the central approvals system which sends real-time
 * notifications to the iPhone approvals page.
 * 
 * Supported submission types:
 * - Email: drafts, send, reply, forward
 * - Calendar: events, appointments, invites
 * - Knowledge Graph: entities, relationships
 * - Contacts: create, update
 * - Tasks & Reminders
 * - System actions
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import ApprovalService from '@/services/ApprovalService';
import type { 
  ApprovalActionType, 
  EmailPayload, 
  CalendarEventPayload,
  KnowledgeGraphPayload,
  AgentSource 
} from '@/types/approval';

type SubmissionType = 
  | 'email_draft' 
  | 'email_send' 
  | 'calendar_event' 
  | 'calendar_invite'
  | 'knowledge_graph' 
  | 'contact'
  | 'reminder'
  | 'task';

interface BaseSubmission {
  type: SubmissionType;
  reasoning?: string;
  confidence?: number;
  context?: string;
  source_email_id?: string;
}

interface EmailDraftSubmission extends BaseSubmission {
  type: 'email_draft' | 'email_send';
  draft: {
    draft_id?: string;
    to: string;
    to_name?: string;
    cc?: string;
    subject: string;
    body: string;
    body_html?: string;
    original_email_id?: string;
    original_email_subject?: string;
    original_email_from?: string;
    thread_id?: string;
    similar_emails_used?: number;
    confidence?: number;
    tone?: string;
    attachments?: Array<{
      filename: string;
      content_type: string;
      size_bytes: number;
    }>;
  };
}

interface KnowledgeGraphSubmission extends BaseSubmission {
  type: 'knowledge_graph';
  action: 'add' | 'update' | 'delete';
  entity: {
    entity_type: 'person' | 'organization' | 'location' | 'event' | 'concept' | 'project' | 'email_thread' | 'topic';
    entity_id?: string;
    name: string;
    properties: Record<string, unknown>;
    relationships?: Array<{
      type: string;
      target_id: string;
      target_name?: string;
      properties?: Record<string, unknown>;
    }>;
    source?: string;
    confidence?: number;
    tags?: string[];
  };
}

interface ContactSubmission extends BaseSubmission {
  type: 'contact';
  action: 'create' | 'update';
  contact: {
    email: string;
    name?: string;
    organization?: string;
    title?: string;
    phone?: string;
    notes?: string;
    tags?: string[];
    relationship_strength?: number;
    last_contact?: string;
    email_count?: number;
  };
}

interface CalendarSubmission extends BaseSubmission {
  type: 'calendar_event' | 'calendar_invite';
  action: 'create' | 'update' | 'delete';
  event: {
    event_id?: string;
    calendar_id?: string;
    calendar_name?: string;
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    location?: string;
    attendees?: Array<{
      email: string;
      name?: string;
      response_status?: 'needsAction' | 'accepted' | 'declined' | 'tentative';
    }>;
    reminders?: Array<{
      method: 'email' | 'popup' | 'sms';
      minutes_before: number;
    }>;
    recurrence?: {
      frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
      interval?: number;
      until?: string;
      count?: number;
    };
    all_day?: boolean;
    timezone?: string;
  };
}

interface ReminderSubmission extends BaseSubmission {
  type: 'reminder';
  reminder: {
    title: string;
    description?: string;
    due_date: string;
    priority?: 'low' | 'normal' | 'high';
    related_to?: {
      type: 'email' | 'calendar' | 'contact' | 'task';
      id: string;
      name?: string;
    };
    recurrence?: {
      frequency: 'daily' | 'weekly' | 'monthly';
      interval?: number;
    };
  };
}

interface TaskSubmission extends BaseSubmission {
  type: 'task';
  task: {
    title: string;
    description?: string;
    due_date?: string;
    priority?: 'low' | 'normal' | 'high';
    assignee?: string;
    project?: string;
    tags?: string[];
    related_to?: {
      type: 'email' | 'calendar' | 'contact';
      id: string;
      name?: string;
    };
  };
}

type ApprovalSubmission = 
  | EmailDraftSubmission 
  | KnowledgeGraphSubmission 
  | ContactSubmission 
  | CalendarSubmission
  | ReminderSubmission
  | TaskSubmission;

interface SubmitForApprovalRequest {
  submissions: ApprovalSubmission[];
  agent?: {
    id?: string;
    name?: string;
    session_id?: string;
  };
  batch_context?: string;
}

const DEFAULT_AGENT: AgentSource = {
  id: 'homelab-agent',
  name: 'Homelab Dashboard Agent',
  type: 'workspace-ai',
};

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
    const { submissions, agent, batch_context } = req.body as SubmitForApprovalRequest;

    if (!submissions || !Array.isArray(submissions) || submissions.length === 0) {
      return res.status(400).json({
        error: 'Missing or empty submissions array',
        required: ['submissions'],
      });
    }

    const agentSource: AgentSource = {
      id: agent?.id || DEFAULT_AGENT.id,
      name: agent?.name || DEFAULT_AGENT.name,
      type: agent?.id?.includes('email') ? 'email-agent' : 
            agent?.id?.includes('calendar') ? 'calendar-agent' : 'workspace-ai',
      session_id: agent?.session_id,
    };

    const results: Array<{
      index: number;
      type: SubmissionType;
      success: boolean;
      approval_id?: string;
      status?: string;
      error?: string;
    }> = [];

    // Process each submission
    for (let i = 0; i < submissions.length; i++) {
      const submission = submissions[i];
      
      try {
        let approval;

        switch (submission.type) {
          case 'email_draft':
          case 'email_send': {
            const emailSub = submission as EmailDraftSubmission;
            approval = await processEmailSubmission(emailSub, agentSource, userId, batch_context);
            break;
          }
          
          case 'knowledge_graph': {
            const kgSub = submission as KnowledgeGraphSubmission;
            approval = await processKnowledgeGraphSubmission(kgSub, agentSource, userId, batch_context);
            break;
          }
          
          case 'contact': {
            const contactSub = submission as ContactSubmission;
            approval = await processContactSubmission(contactSub, agentSource, userId, batch_context);
            break;
          }

          case 'calendar_event':
          case 'calendar_invite': {
            const calSub = submission as CalendarSubmission;
            approval = await processCalendarSubmission(calSub, agentSource, userId, batch_context);
            break;
          }

          case 'reminder': {
            const reminderSub = submission as ReminderSubmission;
            approval = await processReminderSubmission(reminderSub, agentSource, userId, batch_context);
            break;
          }

          case 'task': {
            const taskSub = submission as TaskSubmission;
            approval = await processTaskSubmission(taskSub, agentSource, userId, batch_context);
            break;
          }
          
          default:
            throw new Error(`Unknown submission type: ${(submission as any).type}`);
        }

        results.push({
          index: i,
          type: submission.type,
          success: true,
          approval_id: approval.id,
          status: approval.status,
        });

      } catch (error) {
        results.push({
          index: i,
          type: submission.type,
          success: false,
          error: (error as Error).message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const pendingCount = results.filter(r => r.status === 'pending').length;

    return res.status(201).json({
      success: successCount > 0,
      total: submissions.length,
      successful: successCount,
      pending_approval: pendingCount,
      auto_approved: successCount - pendingCount,
      results,
      message: pendingCount > 0
        ? `${pendingCount} item(s) queued for approval on mobile dashboard`
        : `${successCount} item(s) processed (auto-approved or failed)`,
    });

  } catch (error) {
    console.error('[Email GraphRAG Submit for Approval] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: (error as Error).message,
    });
  }
}

async function processEmailSubmission(
  submission: EmailDraftSubmission,
  agent: AgentSource,
  userId: string,
  batchContext?: string
) {
  const { draft, reasoning, confidence, context, source_email_id } = submission;

  // Parse recipients
  const toRecipients = draft.to.split(',').map(e => ({
    email: e.trim(),
    name: draft.to_name,
  })).filter(r => r.email);

  const ccRecipients = draft.cc
    ? draft.cc.split(',').map(e => ({ email: e.trim() })).filter(r => r.email)
    : [];

  const emailPayload: EmailPayload = {
    to: toRecipients,
    cc: ccRecipients,
    subject: draft.subject,
    body: draft.body,
    body_html: draft.body_html,
    reply_to_id: draft.original_email_id || source_email_id,
    thread_id: draft.thread_id,
    draft_id: draft.draft_id,
    attachments: draft.attachments,
  };

  const actionType: ApprovalActionType = submission.type === 'email_send' 
    ? 'email_send' 
    : 'email_draft_create';

  // Build title
  const recipientPreview = toRecipients.slice(0, 2).map(r => r.name || r.email).join(', ');
  const isReply = !!draft.original_email_id;
  const actionVerb = submission.type === 'email_send' ? 'Send' : isReply ? 'Reply Draft' : 'Draft';
  const title = `${actionVerb}: ${draft.subject}`;

  // Build reasoning
  let fullReasoning = reasoning || '';
  if (draft.original_email_from && draft.original_email_subject) {
    fullReasoning += fullReasoning ? '\n\n' : '';
    fullReasoning += `In reply to ${draft.original_email_from}: "${draft.original_email_subject}"`;
  }
  if (draft.similar_emails_used && draft.similar_emails_used > 0) {
    fullReasoning += fullReasoning ? '\n' : '';
    fullReasoning += `Generated using ${draft.similar_emails_used} similar email(s) as context`;
  }
  if (draft.tone) {
    fullReasoning += fullReasoning ? '\n' : '';
    fullReasoning += `Tone: ${draft.tone}`;
  }

  return ApprovalService.createApprovalRequest({
    actionType,
    payload: emailPayload,
    agent,
    userId,
    title,
    aiReasoning: fullReasoning || `AI-generated ${actionVerb.toLowerCase()} to ${recipientPreview}`,
    aiConfidence: confidence ?? draft.confidence,
    context: context || batchContext,
  });
}

async function processKnowledgeGraphSubmission(
  submission: KnowledgeGraphSubmission,
  agent: AgentSource,
  userId: string,
  batchContext?: string
) {
  const { action, entity, reasoning, confidence, context, source_email_id } = submission;

  // Map action to approval type
  const actionTypeMap: Record<string, ApprovalActionType> = {
    add: 'knowledge_graph_add',
    update: 'knowledge_graph_update',
    delete: 'knowledge_graph_delete',
  };

  const kgPayload: KnowledgeGraphPayload = {
    entity_type: entity.entity_type as any,
    entity_id: entity.entity_id,
    name: entity.name,
    properties: {
      ...entity.properties,
      source_email_id,
    },
    relationships: entity.relationships,
    source: entity.source || 'email-graphrag',
    confidence: entity.confidence ?? confidence,
    tags: entity.tags,
  };

  // Generate title
  const actionVerb = action === 'add' ? 'Add' : action === 'update' ? 'Update' : 'Delete';
  const entityTypeLabel = entity.entity_type.charAt(0).toUpperCase() + entity.entity_type.slice(1).replace(/_/g, ' ');
  const title = `${actionVerb} ${entityTypeLabel}: "${entity.name}"`;

  // Build reasoning
  let fullReasoning = reasoning || '';
  if (entity.relationships && entity.relationships.length > 0) {
    fullReasoning += fullReasoning ? '\n' : '';
    fullReasoning += `With ${entity.relationships.length} relationship(s)`;
  }
  if (source_email_id) {
    fullReasoning += fullReasoning ? '\n' : '';
    fullReasoning += `Extracted from email analysis`;
  }

  return ApprovalService.createApprovalRequest({
    actionType: actionTypeMap[action],
    payload: kgPayload,
    agent,
    userId,
    title,
    aiReasoning: fullReasoning || `${actionVerb} ${entity.entity_type} "${entity.name}" in knowledge graph`,
    aiConfidence: confidence ?? entity.confidence,
    context: context || batchContext,
  });
}

async function processContactSubmission(
  submission: ContactSubmission,
  agent: AgentSource,
  userId: string,
  batchContext?: string
) {
  const { action, contact, reasoning, confidence, context, source_email_id } = submission;

  const actionType: ApprovalActionType = action === 'create' ? 'contact_create' : 'contact_update';

  // Use KnowledgeGraphPayload for contacts (they're entities in the graph)
  const contactPayload: KnowledgeGraphPayload = {
    entity_type: 'person',
    name: contact.name || contact.email,
    properties: {
      email: contact.email,
      name: contact.name,
      organization: contact.organization,
      title: contact.title,
      phone: contact.phone,
      notes: contact.notes,
      relationship_strength: contact.relationship_strength,
      last_contact: contact.last_contact,
      email_count: contact.email_count,
      source_email_id,
    },
    source: 'email-graphrag',
    confidence,
    tags: contact.tags,
  };

  const actionVerb = action === 'create' ? 'Add' : 'Update';
  const title = `${actionVerb} Contact: ${contact.name || contact.email}`;

  let fullReasoning = reasoning || '';
  if (contact.organization) {
    fullReasoning += fullReasoning ? '\n' : '';
    fullReasoning += `Organization: ${contact.organization}`;
  }
  if (contact.email_count && contact.email_count > 0) {
    fullReasoning += fullReasoning ? '\n' : '';
    fullReasoning += `Based on ${contact.email_count} email(s)`;
  }

  return ApprovalService.createApprovalRequest({
    actionType,
    payload: contactPayload,
    agent,
    userId,
    title,
    aiReasoning: fullReasoning || `${actionVerb} contact from email analysis`,
    aiConfidence: confidence,
    context: context || batchContext,
  });
}

async function processCalendarSubmission(
  submission: CalendarSubmission,
  agent: AgentSource,
  userId: string,
  batchContext?: string
) {
  const { action, event, reasoning, confidence, context, type } = submission;

  // Map action to approval type
  const actionTypeMap: Record<string, ApprovalActionType> = {
    create: type === 'calendar_invite' ? 'calendar_invite_send' : 'calendar_event_create',
    update: 'calendar_event_update',
    delete: 'calendar_event_delete',
  };

  const calendarPayload: CalendarEventPayload = {
    event_id: event.event_id,
    calendar_id: event.calendar_id,
    calendar_name: event.calendar_name,
    title: event.title,
    description: event.description,
    start_time: event.start_time,
    end_time: event.end_time,
    location: event.location,
    attendees: event.attendees,
    reminders: event.reminders,
    recurrence: event.recurrence,
    all_day: event.all_day,
    timezone: event.timezone,
  };

  // Generate title
  const actionVerb = action === 'create' ? 'Create' : action === 'update' ? 'Update' : 'Delete';
  const eventTime = new Date(event.start_time).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const title = type === 'calendar_invite' 
    ? `Send Invite: "${event.title}" on ${eventTime}`
    : `${actionVerb} Event: "${event.title}" on ${eventTime}`;

  // Build reasoning
  let fullReasoning = reasoning || '';
  if (event.attendees && event.attendees.length > 0) {
    fullReasoning += fullReasoning ? '\n' : '';
    fullReasoning += `With ${event.attendees.length} attendee(s): ${event.attendees.slice(0, 3).map(a => a.name || a.email).join(', ')}`;
  }
  if (event.location) {
    fullReasoning += fullReasoning ? '\n' : '';
    fullReasoning += `Location: ${event.location}`;
  }
  if (event.recurrence) {
    fullReasoning += fullReasoning ? '\n' : '';
    fullReasoning += `Recurring: ${event.recurrence.frequency}`;
  }

  return ApprovalService.createApprovalRequest({
    actionType: actionTypeMap[action],
    payload: calendarPayload,
    agent,
    userId,
    title,
    aiReasoning: fullReasoning || `${actionVerb} calendar event "${event.title}"`,
    aiConfidence: confidence,
    context: context || batchContext,
  });
}

async function processReminderSubmission(
  submission: ReminderSubmission,
  agent: AgentSource,
  userId: string,
  batchContext?: string
) {
  const { reminder, reasoning, confidence, context } = submission;

  const actionType: ApprovalActionType = 'reminder_create';

  // Use generic payload structure
  const reminderPayload = {
    action: 'create_reminder',
    target: reminder.title,
    parameters: {
      title: reminder.title,
      description: reminder.description,
      due_date: reminder.due_date,
      priority: reminder.priority || 'normal',
      related_to: reminder.related_to,
      recurrence: reminder.recurrence,
    },
    description: `Reminder: ${reminder.title}`,
  };

  const dueDate = new Date(reminder.due_date).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const title = `Create Reminder: "${reminder.title}" - Due ${dueDate}`;

  let fullReasoning = reasoning || '';
  if (reminder.related_to) {
    fullReasoning += fullReasoning ? '\n' : '';
    fullReasoning += `Related to ${reminder.related_to.type}: ${reminder.related_to.name || reminder.related_to.id}`;
  }
  if (reminder.priority && reminder.priority !== 'normal') {
    fullReasoning += fullReasoning ? '\n' : '';
    fullReasoning += `Priority: ${reminder.priority}`;
  }

  return ApprovalService.createApprovalRequest({
    actionType,
    payload: reminderPayload,
    agent,
    userId,
    title,
    aiReasoning: fullReasoning || `Create reminder for "${reminder.title}"`,
    aiConfidence: confidence,
    context: context || batchContext,
  });
}

async function processTaskSubmission(
  submission: TaskSubmission,
  agent: AgentSource,
  userId: string,
  batchContext?: string
) {
  const { task, reasoning, confidence, context } = submission;

  const actionType: ApprovalActionType = 'task_create';

  // Use generic payload structure
  const taskPayload = {
    action: 'create_task',
    target: task.title,
    parameters: {
      title: task.title,
      description: task.description,
      due_date: task.due_date,
      priority: task.priority || 'normal',
      assignee: task.assignee,
      project: task.project,
      tags: task.tags,
      related_to: task.related_to,
    },
    description: `Task: ${task.title}`,
  };

  let title = `Create Task: "${task.title}"`;
  if (task.due_date) {
    const dueDate = new Date(task.due_date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    title += ` - Due ${dueDate}`;
  }

  let fullReasoning = reasoning || '';
  if (task.project) {
    fullReasoning += fullReasoning ? '\n' : '';
    fullReasoning += `Project: ${task.project}`;
  }
  if (task.assignee) {
    fullReasoning += fullReasoning ? '\n' : '';
    fullReasoning += `Assignee: ${task.assignee}`;
  }
  if (task.related_to) {
    fullReasoning += fullReasoning ? '\n' : '';
    fullReasoning += `Related to ${task.related_to.type}: ${task.related_to.name || task.related_to.id}`;
  }

  return ApprovalService.createApprovalRequest({
    actionType,
    payload: taskPayload,
    agent,
    userId,
    title,
    aiReasoning: fullReasoning || `Create task "${task.title}"`,
    aiConfidence: confidence,
    context: context || batchContext,
  });
}
