/**
 * Child Inbox API
 * ============================================================================
 * Fetches emails from CIG for a child account with safety filtering.
 *
 * GET /api/child/inbox?limit=20&folder=inbox
 *   Returns recent emails for the authenticated child, with:
 *   - Content-filtered subjects/snippets
 *   - Approved-sender list enforcement (if configured)
 *   - Activity logged for parental oversight
 *
 * GET /api/child/inbox?emailId=xxx
 *   Returns a single email with full body (also content-filtered).
 *
 * PUT /api/child/inbox?emailId=xxx&action=read|unread
 *   Marks an email as read/unread.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getChildServiceContext } from '@/lib/platform/child-service-middleware';
import { logChildActivity } from '@/lib/platform/content-filter-service';
import { cigFetch } from '@/lib/cig-client';

interface InboxEmail {
  id: string;
  subject: string;
  from: string;
  from_name?: string;
  date: string;
  snippet?: string;
  body_html?: string;
  body_text?: string;
  is_read: boolean;
  has_attachments: boolean;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const context = await getChildServiceContext(req, res);
  if (!context) return;

  // Only child accounts use this endpoint
  if (context.accountType !== 'child') {
    return res.status(403).json({ error: 'This endpoint is for child accounts only' });
  }

  try {
    if (req.method === 'GET') {
      const emailId = req.query.emailId as string | undefined;

      if (emailId) {
        return handleGetSingle(context, emailId, res);
      }
      return handleList(context, req, res);
    }

    if (req.method === 'PUT') {
      const emailId = req.query.emailId as string;
      const action = req.query.action as string;
      return handleMarkRead(context, emailId, action, res);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[Child Inbox] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch inbox' });
  }
}

// ============================================================================
// GET — List emails
// ============================================================================

async function handleList(
  context: { userId: string; childName: string; parentalControls: any },
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const folder = (req.query.folder as string) || 'inbox';

  try {
    const cigResponse = await cigFetch(
      `/v1/emails/recent?limit=${limit}&folder=${encodeURIComponent(folder)}&exclude_body=true`,
      { headers: { 'X-User-ID': context.userId } },
    );

    if (!cigResponse.ok) {
      console.error('[Child Inbox] CIG returned:', cigResponse.status);
      return res.status(cigResponse.status).json({ error: 'Failed to fetch emails from CIG' });
    }

    const cigData = await cigResponse.json();
    const rawEmails: InboxEmail[] = cigData.emails || cigData.data || [];

    // Filter emails through safety checks
    const safeEmails = rawEmails
      .filter((email) => !isFromBlockedSender(email, context.parentalControls))
      .map((email) => sanitizeEmail(email))
      .slice(0, limit);

    // Log inbox access
    await logChildActivity(context.userId, 'inbox_view', {
      serviceId: 'email-inbox',
      metadata: { emailCount: safeEmails.length, folder },
    });

    return res.status(200).json({
      emails: safeEmails,
      total: safeEmails.length,
      folder,
    });
  } catch (error) {
    console.error('[Child Inbox] List error:', error);
    return res.status(500).json({ error: 'Inbox unavailable' });
  }
}

// ============================================================================
// GET — Single email with body
// ============================================================================

async function handleGetSingle(
  context: { userId: string; childName: string; parentalControls: any },
  emailId: string,
  res: NextApiResponse,
) {
  try {
    const cigResponse = await cigFetch(
      `/v1/emails/${encodeURIComponent(emailId)}`,
      { headers: { 'X-User-ID': context.userId } },
    );

    if (!cigResponse.ok) {
      return res.status(cigResponse.status).json({ error: 'Email not found' });
    }

    const cigData = await cigResponse.json();
    const rawEmail = cigData.email?.email || cigData.email || cigData;

    // Check sender safety
    if (isFromBlockedSender(rawEmail, context.parentalControls)) {
      return res.status(403).json({ error: 'This email is from a blocked sender' });
    }

    const safeEmail = sanitizeEmail(rawEmail, true);

    // Log email read
    await logChildActivity(context.userId, 'email_read', {
      serviceId: 'email-inbox',
      userMessage: rawEmail.subject,
      metadata: { emailId, from: rawEmail.from },
    });

    // Auto-mark as read via CIG
    try {
      await cigFetch(`/v1/emails/${encodeURIComponent(emailId)}/read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': context.userId },
        body: JSON.stringify({ is_read: true }),
      });
    } catch { /* non-fatal */ }

    return res.status(200).json({ email: safeEmail });
  } catch (error) {
    console.error('[Child Inbox] Single email error:', error);
    return res.status(500).json({ error: 'Failed to fetch email' });
  }
}

// ============================================================================
// PUT — Mark read/unread
// ============================================================================

async function handleMarkRead(
  context: { userId: string; parentalControls: any },
  emailId: string,
  action: string,
  res: NextApiResponse,
) {
  if (!emailId) {
    return res.status(400).json({ error: 'emailId is required' });
  }

  const isRead = action === 'read';

  try {
    const cigResponse = await cigFetch(
      `/v1/emails/${encodeURIComponent(emailId)}/read`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': context.userId },
        body: JSON.stringify({ is_read: isRead }),
      },
    );

    if (!cigResponse.ok) {
      return res.status(cigResponse.status).json({ error: 'Failed to update email' });
    }

    return res.status(200).json({ success: true, emailId, is_read: isRead });
  } catch (error) {
    console.error('[Child Inbox] Mark read error:', error);
    return res.status(500).json({ error: 'Failed to mark email' });
  }
}

// ============================================================================
// Safety helpers
// ============================================================================

function isFromBlockedSender(email: InboxEmail, controls: any): boolean {
  if (!controls) return false;

  const blockedSenders: string[] = controls.blockedSenders || [];
  const blockedDomains: string[] = controls.blockedDomains || [];

  const fromLower = (email.from || '').toLowerCase();

  if (blockedSenders.some((s) => fromLower.includes(s.toLowerCase()))) {
    return true;
  }

  const domain = fromLower.split('@')[1]?.split('>')[0];
  if (domain && blockedDomains.some((d) => domain.includes(d.toLowerCase()))) {
    return true;
  }

  // If allowed senders list is configured and non-empty, enforce whitelist
  const allowedSenders: string[] = controls.allowedSenders || [];
  if (allowedSenders.length > 0) {
    const isAllowed = allowedSenders.some((s) => fromLower.includes(s.toLowerCase()));
    if (!isAllowed) {
      return true;
    }
  }

  return false;
}

function sanitizeEmail(email: any, includeBody = false): InboxEmail {
  const sanitized: InboxEmail = {
    id: email.id || email.email_id || '',
    subject: sanitizeText(email.subject || '(no subject)'),
    from: sanitizeText(email.from || email.sender_email || ''),
    from_name: sanitizeText(email.from_name || email.sender_name || ''),
    date: email.date || email.received_at || new Date().toISOString(),
    snippet: sanitizeText(email.snippet || email.preview || ''),
    is_read: email.is_read ?? false,
    has_attachments: email.has_attachments ?? false,
  };

  if (includeBody) {
    sanitized.body_html = sanitizeHtml(email.body_html || email.html || '');
    sanitized.body_text = sanitizeText(email.body_text || email.text || '');
  }

  return sanitized;
}

function sanitizeText(text: string): string {
  if (!text) return '';
  // Strip potential HTML tags from text fields
  return text.replace(/<[^>]*>/g, '').substring(0, 500);
}

function sanitizeHtml(html: string): string {
  if (!html) return '';
  // Basic sanitization: strip script tags, event handlers, and external resources
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/on\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[^>]*>/gi, '')
    .substring(0, 50000);
}
