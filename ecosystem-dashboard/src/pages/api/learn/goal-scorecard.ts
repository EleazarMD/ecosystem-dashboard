/**
 * Goal Scorecard API — Phase 10.
 *
 * GET /api/learn/goal-scorecard?childId=...&ageBand=...
 *   Returns the per-child goal scorecard with age-based targets and current progress.
 *
 * POST /api/learn/goal-scorecard
 *   Refreshes the scorecard with latest mastery/streak/session data.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { getGoalScorecardService } from '@/domains/learning/parent/goal-scorecard-service';
import { getMasteryCalculator } from '@/domains/learning/learner/mastery-calculator';
import { getLearningStyleSignalCollector } from '@/domains/learning/analytics/learning-style-signals';
import { getAnalyticsCollector } from '@/domains/learning/analytics/analytics-collector';

interface ScorecardResponse {
  scorecard: ReturnType<typeof getGoalScorecardService>['get'] extends infer T ? NonNullable<T> : never;
  learningStyle?: ReturnType<typeof getLearningStyleSignalCollector>['get'] extends infer T ? NonNullable<T> : never;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const accountType = (session.user as { accountType?: string }).accountType;
  if (accountType === 'child') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (req.method === 'GET' || req.method === 'POST') {
    const childId = (req.query.childId as string || req.body?.childId || '').trim();
    if (!childId) {
      return res.status(400).json({ error: 'childId is required' });
    }

    const ageBand = (req.query.ageBand as string || req.body?.ageBand || 'middle').trim();

    // Gather current data
    const mastery = getMasteryCalculator().getAll(childId);
    const streak = 0; // TODO: wire from session tracker
    const sessionsThisWeek = 0; // TODO: wire from session service

    const scorecard = getGoalScorecardService().getOrCreate(
      childId,
      ageBand,
      mastery,
      streak,
      sessionsThisWeek,
    );

    // Also return learning style signals
    const snapshots = getAnalyticsCollector().getSnapshots(childId, 14);
    const styleSignals = getLearningStyleSignalCollector().analyze(childId, snapshots);

    const response: ScorecardResponse = {
      scorecard: scorecard as any,
      learningStyle: styleSignals as any,
    };

    return res.status(200).json(response);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}
