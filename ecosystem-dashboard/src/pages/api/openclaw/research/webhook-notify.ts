/**
 * OpenClaw Research Webhook Notification Handler
 * POST /api/openclaw/research/webhook-notify
 * 
 * Internal endpoint called when async research completes.
 * Sends notifications to registered webhooks and OpenClaw channels.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME || 'ecosystem_unified',
  user: process.env.DATABASE_USER || 'eleazar',
  password: process.env.DATABASE_PASSWORD || '',
});

const GOOSE_BACKEND_URL = process.env.GOOSE_BACKEND_URL || 'http://localhost:8405';

interface WebhookNotifyRequest {
  sessionId: string;
  status: 'completed' | 'failed';
  report?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId, status, report, error } = req.body as WebhookNotifyRequest;

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  try {
    // Fetch webhook configuration for this session
    const configResult = await pool.query(`
      SELECT 
        webhook_url,
        notify_channel,
        include_report,
        question
      FROM research_session_webhooks
      WHERE session_id = $1
    `, [sessionId]);

    if (configResult.rows.length === 0) {
      // No webhook configured, nothing to do
      return res.status(200).json({ success: true, message: 'No webhook configured' });
    }

    const config = configResult.rows[0];
    const notifications: string[] = [];

    // Send to webhook URL if configured
    if (config.webhook_url) {
      try {
        const payload: Record<string, unknown> = {
          event: 'research.completed',
          sessionId,
          status,
          query: config.question,
          timestamp: new Date().toISOString(),
        };

        if (status === 'failed' && error) {
          payload.error = error;
        }

        if (status === 'completed' && config.include_report && report) {
          payload.report = report;
        } else if (status === 'completed' && report) {
          // Include summary only
          payload.reportSummary = report.substring(0, 500) + (report.length > 500 ? '...' : '');
          payload.wordCount = report.split(/\s+/).length;
        }

        const webhookResponse = await fetch(config.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000), // 10s timeout
        });

        if (webhookResponse.ok) {
          notifications.push(`Webhook sent to ${config.webhook_url}`);
        } else {
          notifications.push(`Webhook failed: ${webhookResponse.status}`);
        }
      } catch (webhookError) {
        console.error('[Webhook Notify] Webhook error:', webhookError);
        notifications.push(`Webhook error: ${webhookError instanceof Error ? webhookError.message : 'Unknown'}`);
      }
    }

    // Send to OpenClaw channel if configured
    if (config.notify_channel) {
      try {
        const message = status === 'completed'
          ? `✅ Research completed: "${config.question.substring(0, 50)}..."\n\nSession ID: ${sessionId}\nWord count: ${report?.split(/\s+/).length || 0}\n\nUse \`/research pickup ${sessionId}\` to view results.`
          : `❌ Research failed: "${config.question.substring(0, 50)}..."\n\nSession ID: ${sessionId}\nError: ${error || 'Unknown error'}`;

        // Send via Goose backend notification endpoint
        const notifyResponse = await fetch(`${GOOSE_BACKEND_URL}/api/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: config.notify_channel,
            message,
            type: 'research_complete',
            metadata: {
              sessionId,
              status,
            },
          }),
          signal: AbortSignal.timeout(5000),
        });

        if (notifyResponse.ok) {
          notifications.push(`Notified channel: ${config.notify_channel}`);
        } else {
          notifications.push(`Channel notification failed: ${notifyResponse.status}`);
        }
      } catch (notifyError) {
        console.error('[Webhook Notify] Channel notification error:', notifyError);
        notifications.push(`Channel notification error: ${notifyError instanceof Error ? notifyError.message : 'Unknown'}`);
      }
    }

    // Clean up webhook config after notification
    await pool.query(`
      DELETE FROM research_session_webhooks WHERE session_id = $1
    `, [sessionId]);

    console.log(`[Webhook Notify] Session ${sessionId}: ${notifications.join(', ')}`);

    return res.status(200).json({
      success: true,
      sessionId,
      notifications,
    });

  } catch (error) {
    console.error('[Webhook Notify] Error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Notification failed',
    });
  }
}

/**
 * Register a webhook for a research session
 * Called internally when creating a session with onComplete options
 */
export async function registerWebhook(
  sessionId: string,
  question: string,
  options: {
    webhook?: string;
    notifyChannel?: string;
    includeReport?: boolean;
  }
): Promise<void> {
  if (!options.webhook && !options.notifyChannel) {
    return; // Nothing to register
  }

  // Ensure table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS research_session_webhooks (
      session_id VARCHAR(255) PRIMARY KEY,
      webhook_url TEXT,
      notify_channel VARCHAR(100),
      include_report BOOLEAN DEFAULT FALSE,
      question TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `).catch(() => {});

  await pool.query(`
    INSERT INTO research_session_webhooks (session_id, webhook_url, notify_channel, include_report, question)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (session_id) DO UPDATE SET
      webhook_url = EXCLUDED.webhook_url,
      notify_channel = EXCLUDED.notify_channel,
      include_report = EXCLUDED.include_report
  `, [
    sessionId,
    options.webhook,
    options.notifyChannel,
    options.includeReport || false,
    question,
  ]);

  console.log(`[Webhook] Registered for session ${sessionId}:`, {
    webhook: options.webhook ? 'yes' : 'no',
    channel: options.notifyChannel || 'none',
  });
}
