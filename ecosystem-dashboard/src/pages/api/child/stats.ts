/**
 * Child Stats API
 *
 * GET /api/child/stats
 *
 * Returns real platform stats for the authenticated child:
 * - skillMastery: in-process EMA-based mastery scores per skill
 * - usage: today's time spent + daily limit
 * - streak: consecutive days with learning activity
 * - level/xp: derived from total activities completed
 * - dailyGoal: activities completed today vs. target
 * - focusSkills: top skills with mastery percentages
 *
 * Data sources (best-effort, degrades gracefully):
 * - MasteryCalculator (in-process EMA, always available)
 * - LearnerProfileService (in-process profile)
 * - getTodayUsage (DB-backed usage tracker)
 * - child_activity_log (DB-backed activity history)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getMasteryCalculator } from '@/domains/learning/learner/mastery-calculator';
import { getLearnerProfileService } from '@/domains/learning/learner/learner-profile';
import { getTodayUsage } from '@/lib/parental-controls/usageTracker';
import dbPool from '@/lib/db/client';

interface ChildStatsResponse {
  skillMastery: Record<string, number>;
  focusSkills: Array<{ name: string; mastery: number }>;
  usage: {
    todayMinutes: number;
    limitMinutes: number;
    remainingMinutes: number;
  };
  streak: { days: number };
  level: { level: number; xp: number; xpToNext: number };
  dailyGoal: { completed: number; target: number };
  recentStrengths: string[];
  recentStruggles: string[];
}

function readUserId(session: { user?: unknown } | null): string {
  const user = session?.user as { id?: unknown } | undefined;
  return typeof user?.id === 'string' ? user.id : '';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const childId = readUserId(session);
  if (!childId) {
    return res.status(400).json({ error: 'Child ID not found in session' });
  }

  try {
    // 1. In-process mastery (EMA-based, always available)
    const masteryScores = getMasteryCalculator().getAll(childId);
    const profile = getLearnerProfileService().get(childId);

    // 2. Build focus skills from mastery scores
    const focusSkills = Object.entries(masteryScores)
      .map(([skill, mastery]) => ({
        name: skill.split('.').pop() || skill,
        mastery: Math.round(mastery * 100),
      }))
      .sort((a, b) => b.mastery - a.mastery)
      .slice(0, 6);

    // If no in-process mastery, try DB-backed skill progress (best-effort)
    if (focusSkills.length === 0) {
      try {
        const result = await dbPool.query(
          `SELECT s.code, s.name,
             COALESCE(ssp.current_score, 0) as score
           FROM skills s
           LEFT JOIN student_skill_progress ssp ON ssp.skill_id = s.id AND ssp.child_id = $1
           WHERE ssp.child_id = $1
           ORDER BY ssp.current_score DESC NULLS LAST
           LIMIT 6`,
          [childId],
        );
        for (const row of result.rows) {
          focusSkills.push({
            name: row.name || row.code,
            mastery: Math.round(parseFloat(row.score || 0) * 100),
          });
        }
      } catch {
        // DB not available — focusSkills stays empty
      }
    }

    // 3. Usage stats
    let usage = { todayMinutes: 0, limitMinutes: 0, remainingMinutes: 999999 };
    try {
      const todayUsage = await getTodayUsage(childId);
      usage = {
        todayMinutes: todayUsage.todayMinutes || 0,
        limitMinutes: todayUsage.limitMinutes || 0,
        remainingMinutes: todayUsage.remainingMinutes || 0,
      };
    } catch {
      // best-effort
    }

    // 4. Streak — count consecutive days with activity (best-effort)
    let streakDays = 0;
    try {
      const streakResult = await dbPool.query(
        `WITH dates AS (
           SELECT DISTINCT DATE(created_at) as d
           FROM child_activity_log
           WHERE child_id = $1
           ORDER BY d DESC
         )
         SELECT COUNT(*) as streak
         FROM (
           SELECT d,
                  d - (ROW_NUMBER() OVER (ORDER BY d))::int as gap
           FROM dates
         ) gaps
         WHERE gap = 0
         LIMIT 1`,
        [childId],
      );
      streakDays = parseInt(streakResult.rows[0]?.streak || '0', 10);
    } catch {
      // DB not available or table missing — streak stays 0
    }

    // 5. Level / XP — derived from total completed activities
    let totalActivities = 0;
    try {
      const countResult = await dbPool.query(
        `SELECT COUNT(*) as total
         FROM child_activity_log
         WHERE child_id = $1 AND activity_type LIKE '%complete%'`,
        [childId],
      );
      totalActivities = parseInt(countResult.rows[0]?.total || '0', 10);
    } catch {
      // best-effort
    }

    // Also count completed path steps
    try {
      const pathResult = await dbPool.query(
        `SELECT COUNT(*) as total
         FROM child_learning_path_steps
         WHERE path_id IN (SELECT id FROM child_learning_paths WHERE child_user_id = $1)
         AND is_completed = true`,
        [childId],
      );
      totalActivities += parseInt(pathResult.rows[0]?.total || '0', 10);
    } catch {
      // best-effort
    }

    // Level curve: level = floor(sqrt(totalActivities / 3)) + 1
    // XP within level: (totalActivities % 3) * 50
    const level = Math.floor(Math.sqrt(totalActivities / 3)) + 1;
    const xpInLevel = (totalActivities % 3) * 50;
    const xpToNext = 150;

    // 6. Daily goal — activities completed today vs. target (3)
    let dailyCompleted = 0;
    try {
      const todayResult = await dbPool.query(
        `SELECT COUNT(*) as total
         FROM child_activity_log
         WHERE child_id = $1
         AND DATE(created_at) = CURRENT_DATE
         AND activity_type LIKE '%complete%'`,
        [childId],
      );
      dailyCompleted = parseInt(todayResult.rows[0]?.total || '0', 10);
    } catch {
      // best-effort
    }

    const response: ChildStatsResponse = {
      skillMastery: masteryScores,
      focusSkills: focusSkills.length > 0 ? focusSkills : [
        { name: 'Reading', mastery: 0 },
        { name: 'Math', mastery: 0 },
        { name: 'Thinking', mastery: 0 },
      ],
      usage,
      streak: { days: streakDays },
      level: { level, xp: xpInLevel, xpToNext },
      dailyGoal: { completed: dailyCompleted, target: 3 },
      recentStrengths: profile?.recentStrengths || [],
      recentStruggles: profile?.recentStruggles || [],
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('[api/child/stats] failed:', error);
    return res.status(500).json({ error: 'Failed to fetch child stats' });
  }
}
