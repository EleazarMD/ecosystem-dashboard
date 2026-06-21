/**
 * Tesla Relay — Nearby Charging Stations proxy.
 *
 * GET /api/tesla/vehicles/[vin]/nearby_charging
 */
import type { NextApiRequest, NextApiResponse } from 'next';

const TESLA_RELAY_URL =
  process.env.TESLA_RELAY_URL || 'http://localhost:18810';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { vin } = req.query;
  if (!vin || typeof vin !== 'string') {
    return res.status(400).json({ error: 'vin is required' });
  }

  try {
    const r = await fetch(
      `${TESLA_RELAY_URL}/api/vehicles/${encodeURIComponent(vin)}/nearby_charging`,
    );
    if (!r.ok) {
      const t = await r.text();
      console.error('[Tesla nearby_charging] HTTP', r.status, t.slice(0, 200));
      return res.status(r.status).json({ error: 'Failed to fetch nearby charging' });
    }
    return res.status(200).json(await r.json());
  } catch (e: any) {
    console.error('[Tesla nearby_charging] error:', e?.message);
    return res.status(500).json({ error: e?.message || 'Internal error' });
  }
}
