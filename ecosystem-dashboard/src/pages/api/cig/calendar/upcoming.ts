/**
 * CIG Calendar API — Upcoming Events (canonical, replaces /api/hermes/calendar/upcoming)
 *
 * GET /api/cig/calendar/upcoming?days=7
 *
 * Returns: { date_range, days, count, events: [{ event_id, title, start_time, end_time,
 *   location, meeting_type, ai_importance, preparation_needed, attendee_count, ... }] }
 *
 * NOTE: CIG returns Central Time ISO-8601 with offset (e.g. "2026-05-15T18:00:00-05:00").
 * Do NOT re-parse as UTC. Pass strings straight to a date formatter.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { cigFetch } from '../../../../lib/cig-client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const days = (req.query.days as string) || '7';
  // back-compat: if caller passes ?limit=N (old Hermes shape), map to days capped at 14
  const limit = req.query.limit as string | undefined;
  let effectiveDays = days;
  if (limit && !req.query.days) {
    const n = parseInt(limit, 10);
    if (Number.isFinite(n) && n > 0) {
      effectiveDays = String(Math.min(14, Math.max(1, Math.ceil(n / 3))));
    }
  }

  try {
    const r = await cigFetch(`/v1/calendar/upcoming?days=${encodeURIComponent(effectiveDays)}`);
    if (!r.ok) {
      const t = await r.text();
      console.error('[CIG calendar.upcoming] HTTP', r.status, t.slice(0, 200));
      return res.status(r.status).json({ error: 'Failed to fetch calendar events' });
    }
    const data = await r.json();
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res.status(200).json(data);
  } catch (e: any) {
    console.error('[CIG calendar.upcoming] error:', e?.message);
    return res.status(500).json({ error: e?.message || 'Internal error' });
  }
}
