import type { NextApiRequest, NextApiResponse } from 'next';

const NOVA_MIRROR_URL = process.env.NOVA_MIRROR_URL || 'http://localhost:18804';

/**
 * GET /api/nova/mirror/active-sessions
 *
 * Proxies to the upstream Nova mirror service's /mirror/active-sessions
 * endpoint. The dashboard uses this to auto-discover which iOS user_id is
 * currently active so it can subscribe to the right SSE channel (the iOS app
 * publishes events keyed by the auth UUID, not a friendly name).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey =
    (req.headers['x-api-key'] as string) ||
    process.env.NOVA_MIRROR_API_KEY ||
    'ai-gateway-api-key-2024';

  try {
    const upstream = await fetch(`${NOVA_MIRROR_URL}/mirror/active-sessions`, {
      headers: { 'X-API-Key': apiKey },
    });
    const body = await upstream.text();
    res.setHeader('Content-Type', 'application/json');
    res.status(upstream.status).send(body);
  } catch (err: any) {
    console.error('[Mirror active-sessions] proxy error:', err);
    res.status(502).json({ error: 'Failed to reach mirror service', sessions: {} });
  }
}
