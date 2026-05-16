/**
 * POST /api/nova/webrtc-connect
 *
 * Server-side proxy for Nova WebRTC SDP signaling.
 *
 * The dashboard runs on HTTPS but Nova's /connect endpoint is HTTP-only on
 * the local network — this proxy bridges the SDP offer/answer exchange so
 * the browser doesn't hit Mixed Content errors. Once the answer is set as
 * the remote description, WebRTC media (data channel) flows peer-to-peer
 * over UDP, bypassing HTTPS entirely.
 *
 * Body: { sdp, type, pc_id?, request_data? }   — same shape iOS posts
 * Response: { sdp, type, pc_id, sessionId }    — Nova's answer, passed through
 */
import type { NextApiRequest, NextApiResponse } from 'next';

const NOVA_CONNECT_URL = process.env.NOVA_CONNECT_URL || 'http://127.0.0.1:18800/connect';
const NOVA_DISCONNECT_URL = process.env.NOVA_DISCONNECT_URL || 'http://127.0.0.1:18800/disconnect';

export const config = { api: { bodyParser: { sizeLimit: '2mb' } } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, ...payload } = req.body ?? {};
  const target = action === 'disconnect' ? NOVA_DISCONNECT_URL : NOVA_CONNECT_URL;

  try {
    const userId = (payload?.request_data?.user_id as string) || 'dashboard';
    const upstream = await fetch(target, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      },
      body: JSON.stringify(payload),
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    return res.send(text);
  } catch (error: any) {
    console.error('[Nova/webrtc-connect] proxy error:', error.message);
    return res.status(502).json({ error: 'Nova /connect unreachable', detail: error.message });
  }
}
