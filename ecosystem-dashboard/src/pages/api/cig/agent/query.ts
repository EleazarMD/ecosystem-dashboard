/**
 * Canonical CIG agent-query proxy.
 *
 * POST /api/cig/agent/query
 * body: { domain, query?, item_id?, user_id?, kwargs?, render?, token_budget? }
 *
 * Mirrors POST /v1/agent/query on CIG :8780.
 * See services/cig/agent_query.py for the domain alias table.
 *
 * Domain examples: email, calendar, contacts, briefing, search, topology,
 *   needs_reply, event_materials, morning-brief, alerts
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { cigFetch } from '../../../../lib/cig-client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const r = await cigFetch('/v1/agent/query', {
      method: 'POST',
      body: JSON.stringify(req.body || {}),
    });
    const data = await r.json().catch(() => ({}));
    return res.status(r.status).json(data);
  } catch (e: any) {
    console.error('[CIG agent.query] error:', e?.message);
    return res.status(500).json({ error: e?.message || 'Internal error' });
  }
}
