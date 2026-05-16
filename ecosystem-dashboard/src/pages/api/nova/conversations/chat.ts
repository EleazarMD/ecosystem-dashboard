/**
 * Nova Text Chat API Proxy — with SSE streaming + mirror bus publish
 *
 * POST /api/nova/conversations/chat
 *
 * Body: { user_id, conversation_id?, message }
 *
 * If Accept: text/event-stream — streams SSE chunks as Nova replies.
 * Otherwise — returns JSON { response, conversation_id, ... }.
 *
 * After completion, publishes user_transcript + assistant_text to the
 * mirror bus so any SSE subscriber (future iOS, other dashboards) sees
 * the turn in real time.
 */
import type { NextApiRequest, NextApiResponse } from 'next';

const NOVA_TEXT_URL = process.env.NOVA_TEXT_URL || 'http://127.0.0.1:18803';
const NOVA_MIRROR_URL = process.env.NOVA_MIRROR_URL || 'http://localhost:18804';
const CANONICAL_USER_ID = process.env.ADMIN_USER_ID || 'dfd9379f-a9cd-4241-99e7e140f5e89e3cd';

export const config = { api: { responseLimit: false } };

async function publishToMirror(
  userId: string,
  eventType: string,
  data: Record<string, unknown>
) {
  try {
    await fetch(`${NOVA_MIRROR_URL}/mirror/${userId}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: eventType, data }),
    });
  } catch {
    // Mirror publish is best-effort — never block the chat response
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_id, conversation_id, message } = req.body ?? {};

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const userId = user_id || CANONICAL_USER_ID;
  const wantSSE = req.headers['accept']?.includes('text/event-stream');

  try {
    // ── SSE streaming path ──────────────────────────────────────────────
    if (wantSSE) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();

      const upstream = await fetch(`${NOVA_TEXT_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          conversation_id: conversation_id || undefined,
          message,
          stream: false, // nova text_chat stream mode is broken upstream; we fake SSE
        }),
      });

      if (!upstream.ok) {
        res.write(`event: error\ndata: ${JSON.stringify({ error: 'Nova agent error', status: upstream.status })}\n\n`);
        return res.end();
      }

      const data = await upstream.json();
      const responseText: string = data.response || '';
      const convId: string = data.conversation_id || conversation_id || '';

      // Simulate streaming by chunking the response into ~20-char pieces
      const CHUNK = 20;
      for (let i = 0; i < responseText.length; i += CHUNK) {
        const chunk = responseText.slice(i, i + CHUNK);
        res.write(`data: ${JSON.stringify({ chunk, conversation_id: convId })}\n\n`);
        // Small yield to let the browser receive chunks progressively
        await new Promise(r => setTimeout(r, 8));
      }
      res.write(`data: ${JSON.stringify({ done: true, full_text: responseText, conversation_id: convId, tool_calls: data.tool_calls || null })}\n\n`);
      res.end();

      // Publish to mirror bus (fire-and-forget)
      await publishToMirror(userId, 'user_transcript', { text: message, isFinal: true, source: 'tesla_dashboard' });
      await publishToMirror(userId, 'assistant_text', { text: responseText, isFinal: true });

      return;
    }

    // ── JSON path (fallback for non-SSE callers) ────────────────────────
    const upstream = await fetch(`${NOVA_TEXT_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        conversation_id: conversation_id || undefined,
        message,
        stream: false,
      }),
    });

    if (!upstream.ok) {
      const err = await upstream.text();
      console.error('[Nova Chat API] Error:', upstream.status, err);
      return res.status(502).json({ error: 'Nova agent error', detail: err });
    }

    const data = await upstream.json();

    // Mirror publish (fire-and-forget)
    await publishToMirror(userId, 'user_transcript', { text: message, isFinal: true, source: 'tesla_dashboard' });
    await publishToMirror(userId, 'assistant_text', { text: data.response || '', isFinal: true });

    return res.status(200).json(data);
  } catch (error: any) {
    console.error('[Nova Chat API] Error:', error.message);
    if (wantSSE && !res.writableEnded) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
      return res.end();
    }
    return res.status(500).json({ error: 'Failed to send message', details: error.message });
  }
}
