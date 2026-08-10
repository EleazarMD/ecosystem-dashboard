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

    // Group by created_at date
    const byDate: Record<string, number> = {};
    preferences.forEach((p: any) => {
      const raw = p.created_at || p.createdAt || p.created;
      if (!raw) return;
      const date = new Date(raw).toISOString().split('T')[0];
      byDate[date] = (byDate[date] || 0) + 1;
    });

    const dailyGrowth = Object.entries(byDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.status(200).json({
      daily_growth: dailyGrowth,
      total: preferences.length,
    });
  } catch (error: any) {
    console.error('[ide-memory/growth-analytics] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
}
