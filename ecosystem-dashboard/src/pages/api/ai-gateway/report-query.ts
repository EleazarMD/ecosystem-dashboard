import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Dedicated endpoint for querying research report content via Qwen3 32B.
 * Calls the AI Gateway directly (bypasses the generic chat proxy).
 */

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY || process.env.NEXT_PUBLIC_AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, max_tokens, temperature } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  try {
    console.log('[Report Query] Sending to Qwen3 32B via AI Gateway, messages:', messages.length);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000); // 2 min timeout

    const response = await fetch(`${AI_GATEWAY_URL}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_GATEWAY_API_KEY}`,
        'X-Source': 'dashboard-report-query',
      },
      body: JSON.stringify({
        model: 'qwen3-32b',
        messages,
        max_tokens: max_tokens || 4096,
        temperature: temperature ?? 0.7,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Report Query] AI Gateway error:', response.status, errorText);
      return res.status(response.status).json({
        error: `AI Gateway error: ${response.status}`,
        detail: errorText,
      });
    }

    const data = await response.json();

    // AI Gateway returns OpenAI-compatible format — pass through directly
    return res.status(200).json({
      choices: data.choices,
      usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      model: data.model || 'qwen3-32b',
    });
  } catch (error: any) {
    console.error('[Report Query] Error:', error);

    const isTimeout = error.name === 'AbortError';
    const isConnection = error.message?.includes('ECONNREFUSED') || error.message?.includes('fetch failed');

    return res.status(isTimeout ? 504 : isConnection ? 503 : 500).json({
      error: isTimeout
        ? 'Request timed out — Qwen3 took too long to respond'
        : isConnection
        ? 'Cannot connect to AI Gateway. Is it running?'
        : `Report query failed: ${error.message}`,
    });
  }
}
