import type { NextApiRequest, NextApiResponse } from 'next';

const OPENCLAW_GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://100.108.41.22:18789';
const OPENCLAW_AUTH_TOKEN = process.env.OPENCLAW_AUTH_TOKEN || '';

interface BudgetStatus {
  enabled: boolean;
  config: {
    maxTokensPerSession: number;
    maxTokensPerHour: number;
    maxTokensPerDay: number;
    maxCostPerHour: number;
    maxCostPerDay: number;
    maxToolCallsPerSession: number;
    maxConsecutiveToolCalls: number;
  };
  hourlyUsage: {
    tokens: number;
    cost: number;
    resetAt: number;
  };
  dailyUsage: {
    tokens: number;
    cost: number;
    resetAt: number;
  };
  activeSessions: number;
  blockedSessions: number;
}

interface BudgetEvent {
  type: 'budget_warning' | 'budget_exceeded' | 'loop_detected' | 'session_blocked';
  sessionId: string;
  userId: string;
  details: Record<string, unknown>;
  timestamp: number;
}

interface SessionDetails {
  sessionId: string;
  userId: string;
  startedAt: number;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
  toolCalls: Record<string, number>;
  blocked: boolean;
  blockReason?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET': {
        const { action, sessionId } = req.query;

        if (action === 'status') {
          const response = await fetch(`${OPENCLAW_GATEWAY_URL}/api/budget/status`, {
            headers: {
              'Authorization': `Bearer ${OPENCLAW_AUTH_TOKEN}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`OpenClaw returned ${response.status}`);
          }

          const status: BudgetStatus = await response.json();
          return res.status(200).json(status);
        }

        if (action === 'sessions') {
          const response = await fetch(`${OPENCLAW_GATEWAY_URL}/api/budget/sessions`, {
            headers: {
              'Authorization': `Bearer ${OPENCLAW_AUTH_TOKEN}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`OpenClaw returned ${response.status}`);
          }

          const sessions: SessionDetails[] = await response.json();
          return res.status(200).json(sessions);
        }

        if (action === 'session' && sessionId) {
          const response = await fetch(`${OPENCLAW_GATEWAY_URL}/api/budget/session/${sessionId}`, {
            headers: {
              'Authorization': `Bearer ${OPENCLAW_AUTH_TOKEN}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`OpenClaw returned ${response.status}`);
          }

          const session: SessionDetails = await response.json();
          return res.status(200).json(session);
        }

        if (action === 'events') {
          const response = await fetch(`${OPENCLAW_GATEWAY_URL}/api/budget/events`, {
            headers: {
              'Authorization': `Bearer ${OPENCLAW_AUTH_TOKEN}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`OpenClaw returned ${response.status}`);
          }

          const events: BudgetEvent[] = await response.json();
          return res.status(200).json(events);
        }

        return res.status(400).json({ error: 'Invalid action. Use: status, sessions, session, events' });
      }

      case 'POST': {
        const { action } = req.query;
        const body = req.body;

        if (action === 'update-config') {
          const response = await fetch(`${OPENCLAW_GATEWAY_URL}/api/budget/config`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENCLAW_AUTH_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            throw new Error(`OpenClaw returned ${response.status}`);
          }

          const result = await response.json();
          return res.status(200).json(result);
        }

        if (action === 'unblock-session') {
          const { sessionId } = body;
          if (!sessionId) {
            return res.status(400).json({ error: 'sessionId is required' });
          }

          const response = await fetch(`${OPENCLAW_GATEWAY_URL}/api/budget/unblock/${sessionId}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENCLAW_AUTH_TOKEN}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`OpenClaw returned ${response.status}`);
          }

          const result = await response.json();
          return res.status(200).json(result);
        }

        return res.status(400).json({ error: 'Invalid action. Use: update-config, unblock-session' });
      }

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error) {
    console.error('Budget API error:', error);
    return res.status(500).json({
      error: 'Failed to communicate with OpenClaw Gateway',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
