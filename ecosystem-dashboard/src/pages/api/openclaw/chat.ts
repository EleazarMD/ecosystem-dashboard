/**
 * OpenClaw Chat API Proxy
 * Routes dashboard chat through Nova Agent text chat API (port 18803).
 * Nova has proper tool integration (Hermes Core calendar/email, web search,
 * homelab ops) — identical to the iOS voice agent but via HTTP.
 *
 * Falls back to AI Gateway (raw LLM, no tools) if Nova is unavailable.
 *
 * Port layout:
 *   18800 — Nova WebRTC (iOS voice, DO NOT USE from dashboard)
 *   18801 — Nova Webhooks (event ingestion)
 *   18803 — Nova Text Chat (this proxy's upstream)
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

// Nova Agent text chat — same tools & LLM as iOS voice agent
const NOVA_TEXT_URL = process.env.NOVA_TEXT_URL || 'http://127.0.0.1:18803';
// AI Gateway fallback (raw LLM, no agent context/tools)
const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://127.0.0.1:8777';
const AI_GATEWAY_KEY = process.env.AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024';

export const config = {
  api: {
    bodyParser: true,
    responseLimit: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, sessionId: clientSessionId, agentId, stream = false } = req.body;

  if (!message?.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  // Stable session key for multi-turn context
  const sessionKey = clientSessionId || `dash_${crypto.randomUUID()}`;

  try {
    const t0 = performance.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60s for tool execution

    // Primary path: Nova text chat (has Hermes Core tools, memory, etc.)
    const upstream = await fetch(`${NOVA_TEXT_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message.trim(),
        user_id: 'dashboard',
        conversation_id: sessionKey,
        stream: false,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const latencyMs = Math.round(performance.now() - t0);

    if (upstream.ok) {
      const data = await upstream.json() as {
        response?: string;
        conversation_id?: string;
        model?: string;
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
        tool_calls?: string[];
        citations?: string[];
      };

      return res.status(200).json({
        response: data.response || '',
        sessionId: data.conversation_id || sessionKey,
        model: data.model || 'nova',
        usage: data.usage || null,
        toolsUsed: data.tool_calls || undefined,
        citations: data.citations || undefined,
        latencyMs,
      });
    }

    // Nova unavailable — fall back to AI Gateway (raw LLM, no tools)
    console.warn(`[OpenClaw proxy] Nova text chat returned ${upstream.status}, falling back to AI Gateway`);
    const fallbackT0 = performance.now();
    const fallbackRes = await fetch(`${AI_GATEWAY_URL}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_GATEWAY_KEY}`,
      },
      body: JSON.stringify({
        model: 'minimax-m2.5',
        messages: [
          { role: 'system', content: 'You are Nova, a personal AI assistant. Answer concisely.' },
          { role: 'user', content: message.trim() },
        ],
        max_tokens: 4096,
      }),
    });
    const fallbackLatency = Math.round(performance.now() - fallbackT0);

    if (fallbackRes.ok) {
      const fbData = await fallbackRes.json() as {
        choices?: Array<{ message?: { content?: string } }>;
        model?: string;
        usage?: any;
      };
      return res.status(200).json({
        response: fbData.choices?.[0]?.message?.content || '',
        sessionId: sessionKey,
        model: (fbData.model || 'minimax-m2.5') + ' (fallback — no tools)',
        usage: fbData.usage || null,
        latencyMs: fallbackLatency,
      });
    }

    return res.status(503).json({
      error: 'Both Nova and AI Gateway unavailable',
      detail: `Nova: ${upstream.status}, Gateway: ${fallbackRes.status}`,
    });
  } catch (err: any) {
    if (!res.headersSent) {
      return res.status(503).json({
        error: 'Nova text chat unavailable',
        detail: err.message,
      });
    }
  }
}
