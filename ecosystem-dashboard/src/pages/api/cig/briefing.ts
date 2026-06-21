/**
 * CIG Daily Briefing (single paragraph summary).
 *
 * GET /api/cig/briefing
 *
 * Response: { date: "YYYY-MM-DD", briefing: "Markdown text..." }
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { cigFetch } from '../../../lib/cig-client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const r = await cigFetch('/v1/briefing');
    if (!r.ok) {
      const t = await r.text();
      console.error('[CIG briefing] HTTP', r.status, t.slice(0, 200));
      return res.status(r.status).json({ error: 'Failed to fetch briefing' });
    }
    return res.status(200).json(await r.json());
  } catch (e: any) {
    console.error('[CIG briefing] error:', e?.message);
    return res.status(500).json({ error: e?.message || 'Internal error' });
  }
}
