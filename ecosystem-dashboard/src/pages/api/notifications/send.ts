/**
 * API endpoint to send a push notification to a user's devices
 * 
 * POST /api/notifications/send
 * 
 * Body:
 *   userId: string (default: "eleazar")
 *   title: string
 *   body: string
 *   category?: string — APNs category for actionable notifications
 *     "APPROVAL_REQUEST" | "EMAIL_RECEIVED" | "CALENDAR_REMINDER" |
 *     "HEARTBEAT_ALERT" | "SECURITY_ALERT" | "AGENT_STATUS" | "SYSTEM_ALERT"
 *   threadId?: string — groups notifications in Notification Center
 *   priority?: "high" | "normal"
 *   sound?: string
 *   data?: Record<string, string> — custom payload delivered to the app, supports:
 *     route:      iOS deep link route (e.g. "approvals", "email/view", "calendar/event")
 *     resourceId: ID of the resource to open (approval ID, email ID, event ID, etc.)
 *     url:        Dashboard web URL fallback (e.g. "/approvals/abc-123")
 *     source:     originating service ("openclaw", "hermes", "dashboard", "security")
 *     Any additional string key-value pairs
 * 
 * Auth: X-API-Key header must match AI_GATEWAY_API_KEY env var
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import * as fs from 'fs';
import { createPushNotificationService } from '@/lib/notifications/push-service';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  database: process.env.DATABASE_NAME || 'ecosystem_unified',
  user: process.env.DATABASE_USER || 'eleazar',
  password: process.env.DATABASE_PASSWORD || '',
});

function loadApnsConfig() {
  const keyPath = process.env.APNS_KEY_PATH;
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const bundleId = process.env.APNS_BUNDLE_ID;

  if (!keyPath || !keyId || !teamId || !bundleId) {
    console.warn('[Notifications/send] APNs not fully configured');
    return undefined;
  }

  try {
    const privateKey = fs.readFileSync(keyPath, 'utf-8');
    return {
      keyId,
      teamId,
      privateKey,
      bundleId,
      production: process.env.APNS_PRODUCTION === 'true',
    };
  } catch (err) {
    console.error('[Notifications/send] Failed to read APNs key:', err);
    return undefined;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth: internal API key or session-based
  const apiKey = req.headers['x-api-key'] as string;
  const expectedKey = process.env.AI_GATEWAY_API_KEY || process.env.INTERNAL_API_KEY || 'ai-gateway-api-key-2024';
  if (apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const {
    userId = 'eleazar',
    title,
    body,
    data,
    category,
    threadId,
    priority = 'high',
    sound,
  } = req.body;

  if (!title || !body) {
    return res.status(400).json({ error: 'title and body are required' });
  }

  try {
    // Resolve userId (name or email) to UUID
    const userResult = await pool.query(
      `SELECT id FROM users WHERE id::text = $1 OR name ILIKE $1 OR email ILIKE $1 LIMIT 1`,
      [userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: `User not found: ${userId}` });
    }
    const userUuid = userResult.rows[0].id;

    const apnsConfig = loadApnsConfig();
    const pushService = createPushNotificationService(pool, {
      apns: apnsConfig,
    });

    const result = await pushService.sendToUser(userUuid, {
      title,
      body,
      data,
      category,
      threadId,
      priority,
      sound: sound || 'default',
    });

    console.log(`[Notifications/send] Sent to ${result.sent} devices, ${result.failed} failed`);

    return res.status(200).json({
      success: true,
      sent: result.sent,
      failed: result.failed,
    });
  } catch (error) {
    console.error('[Notifications/send] Error:', error);
    return res.status(500).json({ error: 'Failed to send notification' });
  }
}
