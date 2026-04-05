/**
 * OpenClaw Gateway RPC Proxy
 *
 * Wraps the OpenClaw WebSocket RPC protocol into a simple HTTP endpoint.
 * Sends a single request frame to the gateway and returns the response.
 *
 * Methods exposed:
 *   - agents.list          → list configured agents
 *   - sessions.list        → list sessions for an agent
 *   - chat.history         → get chat history for a session
 *   - health               → gateway health check
 *   - status               → system-presence info
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'crypto';
import WebSocket from 'ws';

const OPENCLAW_WS_URL = process.env.OPENCLAW_WS_URL || 'ws://127.0.0.1:18793';
const RPC_TIMEOUT_MS = 10_000;

// Allowed methods — read, write, and admin operations the dashboard needs
const ALLOWED_METHODS = new Set([
  'health',
  'status',
  'system-presence',
  'last-heartbeat',
  'agents.list',
  'agent.identity.get',
  'agents.files.list',
  'agents.files.get',
  'agents.files.set',
  'sessions.list',
  'sessions.preview',
  'sessions.patch',
  'sessions.delete',
  'sessions.compact',
  'sessions.usage',
  'sessions.resolve',
  'chat.history',
  'chat.send',
  'chat.abort',
  'models.list',
  'usage.status',
  'usage.cost',
  'channels.status',
  'logs.tail',
  'cron.list',
  'cron.status',
  'cron.runs',
  'cron.add',
  'cron.update',
  'cron.remove',
  'cron.run',
  'node.list',
  'node.describe',
  'tts.status',
  'tts.providers',
  'voicewake.get',
  'voicewake.set',
  'config.get',
  'talk.config',
  'browser.request',
]);

type RpcFrame =
  | { type: 'req'; id: string; method: string; params?: unknown }
  | { type: 'res'; id: string; ok: boolean; payload?: unknown; error?: { message: string } }
  | { type: 'event'; event: string; payload?: unknown; seq?: number };

async function gatewayRpc(method: string, params?: unknown): Promise<unknown> {
  // Read token at runtime to avoid Next.js module cache issues
  const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN || '';
  
  return new Promise((resolve, reject) => {
    const wsOpts: WebSocket.ClientOptions = {
      maxPayload: 25 * 1024 * 1024,
      rejectUnauthorized: false, // Tailscale self-signed cert
      headers: {
        Origin: 'http://127.0.0.1:8404',
      },
    };
    const ws = new WebSocket(OPENCLAW_WS_URL, wsOpts);
    const id = randomUUID();
    let connectSent = false;
    let timer: NodeJS.Timeout;
    let nonce: string | null = null;

    const cleanup = () => {
      clearTimeout(timer);
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };

    timer = setTimeout(() => {
      cleanup();
      reject(new Error('Gateway RPC timeout'));
    }, RPC_TIMEOUT_MS);

    ws.on('error', (err) => {
      cleanup();
      reject(err);
    });

    ws.on('message', (raw) => {
      try {
        const frame = JSON.parse(raw.toString()) as RpcFrame;

        // Handle connect challenge
        if (frame.type === 'event' && frame.event === 'connect.challenge') {
          const challengePayload = frame.payload as { nonce?: string } | undefined;
          nonce = challengePayload?.nonce ?? null;
          if (!connectSent) {
            connectSent = true;
            const connectId = randomUUID();
            const connectFrame = {
              type: 'req',
              id: connectId,
              method: 'connect',
              params: {
                minProtocol: 3,
                maxProtocol: 3,
                client: {
                  id: 'openclaw-control-ui',
                  displayName: 'AI Homelab Dashboard',
                  version: '1.0.0',
                  platform: 'web',
                  mode: 'webchat',
                },
                caps: [],
                role: 'operator',
                scopes: ['operator.read', 'operator.write', 'operator.admin'],
                auth: OPENCLAW_TOKEN ? { token: OPENCLAW_TOKEN } : undefined,
              },
            };
            ws.send(JSON.stringify(connectFrame));
          }
          return;
        }

        // Handle tick events (ignore)
        if (frame.type === 'event' && frame.event === 'tick') return;

        // Handle response frames
        if (frame.type === 'res') {
          const res = frame as { type: 'res'; id: string; ok: boolean; payload?: unknown; error?: { message: string } };

          // If this is the connect response, now send the actual request
          if (res.ok && !ws.readyState) return;

          if (res.id !== id) {
            // Could be the connect response — now send the actual RPC call
            if (res.ok) {
              const reqFrame = { type: 'req', id, method, params };
              ws.send(JSON.stringify(reqFrame));
            } else {
              cleanup();
              reject(new Error(res.error?.message ?? 'Connect failed'));
            }
            return;
          }

          // This is our method response
          cleanup();
          if (res.ok) {
            resolve(res.payload);
          } else {
            reject(new Error(res.error?.message ?? 'RPC error'));
          }
        }
      } catch {
        // ignore parse errors
      }
    });

    ws.on('open', () => {
      // Wait for connect.challenge event before sending connect
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { method, params } = req.body as { method?: string; params?: unknown };

  if (!method) {
    return res.status(400).json({ error: 'method is required' });
  }

  if (!ALLOWED_METHODS.has(method)) {
    return res.status(403).json({ error: `method "${method}" not allowed` });
  }

  try {
    const result = await gatewayRpc(method, params);
    return res.status(200).json({ ok: true, result });
  } catch (err: any) {
    const isOffline =
      err.message?.includes('ECONNREFUSED') ||
      err.message?.includes('timeout') ||
      err.message?.includes('ENOENT');
    return res.status(isOffline ? 503 : 500).json({
      ok: false,
      error: err.message ?? 'Gateway RPC failed',
      offline: isOffline,
    });
  }
}
