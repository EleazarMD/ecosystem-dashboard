/**
 * Tesla Relay — Charging Sessions history proxy.
 *
 * GET /api/tesla/charging/sessions?vin=...&limit=10
 */
import type { NextApiRequest, NextApiResponse } from 'next';

const TESLA_RELAY_URL =
  process.env.TESLA_RELAY_URL || 'http://localhost:18810';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const vin = (req.query.vin as string) || '';
  const limit = (req.query.limit as string) || '10';
  const qs = new URLSearchParams({ limit });
  if (vin) qs.set('vin', vin);

  try {
    const r = await fetch(`${TESLA_RELAY_URL}/api/charging/sessions?${qs.toString()}`);
    if (!r.ok) {
      const t = await r.text();
      console.error('[Tesla charging.sessions] HTTP', r.status, t.slice(0, 200));
      return res.status(r.status).json({ error: 'Failed to fetch charging sessions' });
    }
    return res.status(200).json(await r.json());
  } catch (e: any) {
    console.error('[Tesla charging.sessions] error:', e?.message);
    return res.status(500).json({ error: e?.message || 'Internal error' });
  }
}
