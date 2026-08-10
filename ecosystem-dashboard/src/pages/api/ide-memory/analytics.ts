import { NextApiRequest, NextApiResponse } from 'next';
import { getPreferences, getRecentInsights, getObservations, KNOWN_USERS } from '../../../lib/pcg-client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = (req.query.userId as string) || KNOWN_USERS[0].id;

  try {
    const [prefsResult, insights, observations] = await Promise.all([
      getPreferences(userId),
      getRecentInsights(50, userId),
      getObservations(userId),
    ]);

    const preferences: any[] = Array.isArray(prefsResult)
      ? prefsResult
      : (prefsResult?.preferences ?? []);

    // preferences_by_category
    const preferencesByCategory: Record<string, number> = {};
    preferences.forEach((p: any) => {
      const cat = p.category || 'uncategorized';
      preferencesByCategory[cat] = (preferencesByCategory[cat] || 0) + 1;
    });

    // insights_by_status
    const insightsByStatus: Record<string, number> = {};
    insights.forEach((i: any) => {
      const s = i.status || 'unknown';
      insightsByStatus[s] = (insightsByStatus[s] || 0) + 1;
    });

    res.status(200).json({
      total_preferences: preferences.length,
      total_insights: insights.length,
      total_observations: observations.length,
      preferences_by_category: preferencesByCategory,
      insights_by_status: insightsByStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[ide-memory/analytics] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
}
