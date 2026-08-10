import { NextApiRequest, NextApiResponse } from 'next';
import { getPreferences, KNOWN_USERS } from '../../../lib/pcg-client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = (req.query.userId as string) || KNOWN_USERS[0].id;

  try {
    const result = await getPreferences(userId);
    const preferences: any[] = Array.isArray(result)
      ? result
      : (result?.preferences ?? []);

    const byCategory: Record<string, number> = {};
    const byTier: Record<string, number> = {};
    const bySource: Record<string, number> = {};

    preferences.forEach((p: any) => {
      const cat = p.category || 'uncategorized';
      byCategory[cat] = (byCategory[cat] || 0) + 1;

      const tier = p.tier || 'unspecified';
      byTier[tier] = (byTier[tier] || 0) + 1;

      const source = p.source || 'unknown';
      bySource[source] = (bySource[source] || 0) + 1;
    });

    res.status(200).json({
      by_category: byCategory,
      by_tier: byTier,
      by_source: bySource,
      total: preferences.length,
    });
  } catch (error: any) {
    console.error('[ide-memory/distribution-analytics] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
}
