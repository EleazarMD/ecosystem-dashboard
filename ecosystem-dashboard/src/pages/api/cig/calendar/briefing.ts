/**
 * CIG Calendar Briefing — today's meetings with AI importance and prep flags.
 *
 * GET /api/cig/calendar/briefing?days=1
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { cigFetch } from '../../../../lib/cig-client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const days = (req.query.days as string) || '1';
  try {
    const r = await cigFetch(`/v1/calendar/briefing?days=${encodeURIComponent(days)}`);
    if (!r.ok) {
      const t = await r.text();
      console.error('[CIG calendar.briefing] HTTP', r.status, t.slice(0, 200));
      return res.status(r.status).json({ error: 'Failed to fetch calendar briefing' });
    }
    return res.status(200).json(await r.json());
  } catch (e: any) {
    console.error('[CIG calendar.briefing] error:', e?.message);
    return res.status(500).json({ error: e?.message || 'Internal error' });
  }
}
