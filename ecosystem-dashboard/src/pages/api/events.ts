/**
 * /api/events — Server-Sent Events endpoint for real-time task status
 *
 * The iOS Hyperspace app (IosEventsService) connects here to receive
 * live updates about what the OpenClaw agent is doing:
 *   - task_started / task_progress / task_complete / task_error
 *   - tool_start / tool_end (email_search, browser, calendar, etc.)
 *   - approval_required (agent needs user confirmation)
 *   - heartbeat (keepalive every 15s)
 *
 * Authentication: Bearer token or NextAuth session cookie.
 * The endpoint proxies/aggregates events from the OpenClaw gateway
 * and internal dashboard services.
 *
 * Protocol: SSE (text/event-stream)
 *   event: <type>\ndata: <json>\n\n
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';

// OpenClaw gateway internal URL (container port mapped to host)
const OPENCLAW_GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18793';

// Connected SSE clients keyed by a synthetic client ID
type SseClient = {
  res: NextApiResponse;
  userId: string;
  tenantId: string | null;
  connectedAt: number;
};

const clients = new Map<string, SseClient>();

/**
 * Broadcast an event to all connected clients (optionally filtered by userId).
 * Called internally when we receive events from the gateway or other services.
 */
export function broadcastEvent(
  eventType: string,
  data: Record<string, unknown>,
  userId?: string
) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const [id, client] of clients) {
    if (userId && client.userId !== userId) continue;
    try {
      client.res.write(payload);
    } catch {
      clients.delete(id);
    }
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // ── Auth ────────────────────────────────────────────────────────────────────
  // Accept either NextAuth session cookie or Bearer token (for iOS)
  let userId: string | null = null;
  let tenantId: string | null = null;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    // iOS sends X-User-Id header alongside the Bearer token
    userId = (req.headers['x-user-id'] as string) || null;
    tenantId = (req.headers['x-tenant-id'] as string) || null;
  }

  if (!userId) {
    // Fall back to NextAuth session
    const session = await getServerSession(req, res, authOptions);
    if (session?.user) {
      const user = session.user as any;
      userId = user.id;
      tenantId = user.defaultTenantId || null;
    }
  }

  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // ── SSE setup ──────────────────────────────────────────────────────────────
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx/cloudflare buffering
  });

  // Immediate keepalive so iOS receives first byte instantly
  res.write(': connected\n\n');

  // Send a welcome event with server state
  const welcome = {
    type: 'connected',
    userId,
    tenantId,
    serverTime: new Date().toISOString(),
    gatewayUrl: OPENCLAW_GATEWAY_URL,
  };
  res.write(`event: connected\ndata: ${JSON.stringify(welcome)}\n\n`);

  // Register this client
  const clientId = `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  clients.set(clientId, { res, userId, tenantId, connectedAt: Date.now() });

  // ── Heartbeat ──────────────────────────────────────────────────────────────
  const heartbeatInterval = setInterval(() => {
    try {
      const hb = {
        type: 'heartbeat',
        timestamp: new Date().toISOString(),
        clients: clients.size,
      };
      res.write(`event: heartbeat\ndata: ${JSON.stringify(hb)}\n\n`);
    } catch {
      clearInterval(heartbeatInterval);
      clients.delete(clientId);
    }
  }, 15_000);

  // ── Gateway event proxy ────────────────────────────────────────────────────
  // Poll the OpenClaw gateway for active task status and relay to the client.
  // This is a lightweight polling approach; a WebSocket bridge can replace it later.
  let lastGatewayPoll = 0;
  const gatewayPollInterval = setInterval(async () => {
    const now = Date.now();
    if (now - lastGatewayPoll < 5000) return; // Throttle to every 5s
    lastGatewayPoll = now;

    try {
      // Check gateway health
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const resp = await fetch(`${OPENCLAW_GATEWAY_URL}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const gatewayAlive = resp.ok || resp.status === 200;
      if (gatewayAlive) {
        // Emit a status event so iOS knows the agent is reachable
        res.write(`event: gateway_status\ndata: ${JSON.stringify({
          type: 'gateway_status',
          status: 'online',
          timestamp: new Date().toISOString(),
        })}\n\n`);
      }
    } catch {
      res.write(`event: gateway_status\ndata: ${JSON.stringify({
        type: 'gateway_status',
        status: 'offline',
        timestamp: new Date().toISOString(),
      })}\n\n`);
    }
  }, 30_000); // Every 30s

  // ── Cleanup on disconnect ──────────────────────────────────────────────────
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    clearInterval(gatewayPollInterval);
    clients.delete(clientId);
  });
}

// Disable Next.js body parsing for SSE
export const config = {
  api: {
    bodyParser: false,
  },
};
