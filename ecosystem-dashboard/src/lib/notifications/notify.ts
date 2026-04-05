/**
 * Server-side notification helper
 * 
 * Import this from any Dashboard service to send a typed push notification
 * with deep link routing. Wraps the PushNotificationService with a
 * standardized notification type catalog.
 * 
 * Usage:
 *   import { notify } from '@/lib/notifications/notify';
 *   await notify.approval({ approvalId: 'abc', title: 'Send email to Bob', agent: 'Hermes' });
 */

import * as fs from 'fs';
import { Pool } from 'pg';
import { createPushNotificationService, type PushNotificationPayload } from './push-service';

// ─── Notification Types ─────────────────────────────────────────────

export type NotificationType =
  | 'approval_request'
  | 'approval_resolved'
  | 'email_received'
  | 'email_urgent'
  | 'calendar_reminder'
  | 'calendar_conflict'
  | 'heartbeat_alert'
  | 'security_alert'
  | 'agent_status'
  | 'system_alert';

interface NotifyOptions {
  userId?: string; // defaults to "eleazar"
}

// ─── Deep Link Route Map ────────────────────────────────────────────
// Maps notification types to iOS app routes and APNs categories

const ROUTE_MAP: Record<NotificationType, { route: string; category: string; threadPrefix: string }> = {
  approval_request:  { route: 'approvals',        category: 'APPROVAL_REQUEST',  threadPrefix: 'approval' },
  approval_resolved: { route: 'approvals',        category: 'APPROVAL_REQUEST',  threadPrefix: 'approval' },
  email_received:    { route: 'email/view',       category: 'EMAIL_RECEIVED',    threadPrefix: 'email' },
  email_urgent:      { route: 'email/view',       category: 'EMAIL_RECEIVED',    threadPrefix: 'email' },
  calendar_reminder: { route: 'calendar/event',   category: 'CALENDAR_REMINDER', threadPrefix: 'calendar' },
  calendar_conflict: { route: 'calendar/event',   category: 'CALENDAR_REMINDER', threadPrefix: 'calendar' },
  heartbeat_alert:   { route: 'agents/heartbeat', category: 'HEARTBEAT_ALERT',   threadPrefix: 'heartbeat' },
  security_alert:    { route: 'security',         category: 'SECURITY_ALERT',    threadPrefix: 'security' },
  agent_status:      { route: 'agents',           category: 'AGENT_STATUS',      threadPrefix: 'agent' },
  system_alert:      { route: 'system',           category: 'SYSTEM_ALERT',      threadPrefix: 'system' },
};

// ─── Singleton pool + push service ──────────────────────────────────

let _pool: Pool | null = null;
function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432', 10),
      database: process.env.DATABASE_NAME || 'ecosystem_unified',
      user: process.env.DATABASE_USER || 'eleazar',
      password: process.env.DATABASE_PASSWORD || '',
    });
  }
  return _pool;
}

function loadApnsConfig() {
  const keyPath = process.env.APNS_KEY_PATH;
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const bundleId = process.env.APNS_BUNDLE_ID;
  if (!keyPath || !keyId || !teamId || !bundleId) return undefined;
  try {
    const privateKey = fs.readFileSync(keyPath, 'utf-8');
    return { keyId, teamId, privateKey, bundleId, production: process.env.APNS_PRODUCTION === 'true' };
  } catch { return undefined; }
}

async function resolveUserUuid(userId: string): Promise<string | null> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT id FROM users WHERE id::text = $1 OR name ILIKE $1 OR email ILIKE $1 LIMIT 1`,
    [userId]
  );
  return result.rows[0]?.id ?? null;
}

async function sendTyped(
  type: NotificationType,
  title: string,
  body: string,
  extra: {
    resourceId?: string;
    url?: string;
    source?: string;
    data?: Record<string, string>;
  },
  opts: NotifyOptions = {}
): Promise<{ sent: number; failed: number }> {
  const userId = opts.userId || 'eleazar';
  const userUuid = await resolveUserUuid(userId);
  if (!userUuid) {
    console.warn(`[notify] User not found: ${userId}`);
    return { sent: 0, failed: 0 };
  }

  const { route, category, threadPrefix } = ROUTE_MAP[type];
  const threadId = extra.resourceId ? `${threadPrefix}-${extra.resourceId}` : threadPrefix;

  const payload: PushNotificationPayload = {
    title,
    body: body.length > 256 ? body.slice(0, 253) + '...' : body,
    category,
    threadId,
    priority: type.includes('urgent') || type.includes('security') ? 'high' : 'high',
    sound: type === 'security_alert' ? 'alarm.caf' : 'default',
    data: {
      route,
      type,
      source: extra.source || 'dashboard',
      ...(extra.resourceId ? { resourceId: extra.resourceId } : {}),
      ...(extra.url ? { url: extra.url } : {}),
      ...extra.data,
    },
  };

  const pool = getPool();
  const pushService = createPushNotificationService(pool, { apns: loadApnsConfig() });
  return pushService.sendToUser(userUuid, payload);
}

// ─── Typed Convenience Methods ──────────────────────────────────────

export const notify = {
  /**
   * New approval request needs human review
   */
  approval: (p: {
    approvalId: string;
    title: string;
    agent: string;
    actionType?: string;
  }, opts?: NotifyOptions) =>
    sendTyped('approval_request',
      `Approval: ${p.title}`,
      `${p.agent} wants to ${p.actionType || 'perform an action'}. Tap to review.`,
      { resourceId: p.approvalId, url: `/approvals/${p.approvalId}`, source: 'openclaw' },
      opts
    ),

  /**
   * Approval was approved/denied (confirmation)
   */
  approvalResolved: (p: {
    approvalId: string;
    title: string;
    decision: 'approved' | 'denied';
  }, opts?: NotifyOptions) =>
    sendTyped('approval_resolved',
      `${p.decision === 'approved' ? 'Approved' : 'Denied'}: ${p.title}`,
      `The approval request was ${p.decision}.`,
      { resourceId: p.approvalId, url: `/approvals/${p.approvalId}` },
      opts
    ),

  /**
   * New email received (AI-triaged as important)
   */
  email: (p: {
    emailId: string;
    from: string;
    subject: string;
    preview?: string;
    threadId?: string;
    urgent?: boolean;
  }, opts?: NotifyOptions) =>
    sendTyped(p.urgent ? 'email_urgent' : 'email_received',
      p.subject,
      `From ${p.from}${p.preview ? ': ' + p.preview : ''}`,
      {
        resourceId: p.emailId,
        url: `/email/${p.emailId}`,
        source: 'hermes',
        data: p.threadId ? { emailThreadId: p.threadId } : undefined,
      },
      opts
    ),

  /**
   * Calendar event reminder or upcoming meeting
   */
  calendarReminder: (p: {
    eventId: string;
    title: string;
    startTime: string;
    location?: string;
    minutesBefore?: number;
  }, opts?: NotifyOptions) =>
    sendTyped('calendar_reminder',
      `Upcoming: ${p.title}`,
      `${p.startTime}${p.location ? ' at ' + p.location : ''}`,
      { resourceId: p.eventId, url: `/calendar/event/${p.eventId}`, source: 'dashboard' },
      opts
    ),

  /**
   * Calendar conflict detected
   */
  calendarConflict: (p: {
    eventId: string;
    title: string;
    conflictWith: string;
  }, opts?: NotifyOptions) =>
    sendTyped('calendar_conflict',
      `Conflict: ${p.title}`,
      `Overlaps with "${p.conflictWith}". Tap to resolve.`,
      { resourceId: p.eventId, url: `/calendar/event/${p.eventId}`, source: 'dashboard' },
      opts
    ),

  /**
   * OpenClaw heartbeat alert
   */
  heartbeat: (p: {
    agent: string;
    message: string;
  }, opts?: NotifyOptions) =>
    sendTyped('heartbeat_alert',
      `${p.agent} Alert`,
      p.message,
      { source: 'openclaw', url: '/agents' },
      opts
    ),

  /**
   * Homelab security concern
   */
  security: (p: {
    alertId?: string;
    severity: 'info' | 'warning' | 'critical';
    title: string;
    details: string;
  }, opts?: NotifyOptions) =>
    sendTyped('security_alert',
      `Security ${p.severity.toUpperCase()}: ${p.title}`,
      p.details,
      { resourceId: p.alertId, url: `/admin/security${p.alertId ? '/' + p.alertId : ''}`, source: 'security' },
      opts
    ),

  /**
   * Agent status change (came online, went offline, error)
   */
  agentStatus: (p: {
    agentId: string;
    agentName: string;
    status: string;
    details?: string;
  }, opts?: NotifyOptions) =>
    sendTyped('agent_status',
      `${p.agentName}: ${p.status}`,
      p.details || `Agent ${p.agentName} is now ${p.status}.`,
      { resourceId: p.agentId, url: `/agents/${p.agentId}`, source: 'openclaw' },
      opts
    ),

  /**
   * Generic system alert
   */
  system: (p: {
    title: string;
    message: string;
    url?: string;
  }, opts?: NotifyOptions) =>
    sendTyped('system_alert',
      p.title,
      p.message,
      { url: p.url || '/admin/alerts', source: 'dashboard' },
      opts
    ),

  /**
   * Low-level: send any typed notification
   */
  raw: sendTyped,
};
