/**
 * CIG Email API — Recent Emails (canonical, replaces /api/hermes/emails/recent)
 *
 * GET /api/cig/emails/recent?limit=10&folder=inbox&exclude_body=true
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { cigFetch } from '../../../../lib/cig-client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const limit = (req.query.limit as string) || '10';
  const folder = (req.query.folder as string) || 'inbox';
  const excludeBody = (req.query.exclude_body as string) ?? 'true';

  try {
    const r = await cigFetch(
      `/v1/emails/recent?limit=${encodeURIComponent(limit)}&folder=${encodeURIComponent(folder)}&exclude_body=${encodeURIComponent(excludeBody)}`,
    );
    if (!r.ok) {
      const t = await r.text();
      console.error('[CIG emails.recent] HTTP', r.status, t.slice(0, 200));
      return res.status(r.status).json({ error: 'Failed to fetch emails' });
    }
    const data = await r.json();
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res.status(200).json(data);
  } catch (e: any) {
    console.error('[CIG emails.recent] error:', e?.message);
    return res.status(500).json({ error: e?.message || 'Internal error' });
  }
}
