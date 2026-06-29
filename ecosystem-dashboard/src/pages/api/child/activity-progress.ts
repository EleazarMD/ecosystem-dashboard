/**
 * Activity Progress API
 *
 * GET  /api/child/activity-progress?activity=pokemon-lab  — load completed lesson IDs
 * POST /api/child/activity-progress                        — save a completed lesson
 *
 * Uses the child_activity_log table with activity_type `${activity}_lesson_complete`
 * and metadata.lessonId to persist per-child lesson completion.
 * Falls back gracefully when DB is unavailable.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { logChildActivity } from '@/lib/platform/content-filter-service';
import pool from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = session.user as any;

  // Determine the child user ID: child uses own session, parent passes childId param.
  let childUserId: string;

  if (user.accountType === 'child') {
    childUserId = user.id;
  } else if (user.accountType === 'parent' || user.accountType === 'adult') {
    const requestedChildId = (req.query.childId as string || '').trim();
    if (!requestedChildId) {
      return res.status(400).json({ error: 'childId is required for parent accounts' });
    }
    // Verify parent-child relationship
    const relCheck = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND parent_user_id = $2',
      [requestedChildId, user.id],
    );
    if (relCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not your child' });
    }
    childUserId = requestedChildId;
  } else {
    return res.status(403).json({ error: 'Only child or parent accounts' });
  }

  if (req.method === 'GET') {
    const activity = (req.query.activity as string) || 'pokemon-lab';
    const activityType = `${activity}_lesson_complete`;

    try {
      const result = await pool.query(
        `SELECT metadata->>'lessonId' as lesson_id
         FROM child_activity_log
         WHERE child_user_id = $1 AND activity_type = $2
           AND metadata->>'lessonId' IS NOT NULL
         ORDER BY created_at ASC`,
        [childUserId, activityType],
      );
      const completedLessons = result.rows
        .map((r) => r.lesson_id)
        .filter(Boolean);
      return res.status(200).json({ completedLessons });
    } catch (err) {
      console.error('[activity-progress] GET error:', err);
      return res.status(200).json({ completedLessons: [] });
    }
  }

  if (req.method === 'POST') {
    const { activity, lessonId } = req.body as {
      activity?: string;
      lessonId?: string;
    };

    if (!lessonId) {
      return res.status(400).json({ error: 'lessonId required' });
    }

    const activityName = activity || 'pokemon-lab';
    const activityType = `${activityName}_lesson_complete`;

    try {
      // Check if already saved (idempotent)
      const existing = await pool.query(
        `SELECT id FROM child_activity_log
         WHERE child_user_id = $1 AND activity_type = $2
           AND metadata->>'lessonId' = $3
         LIMIT 1`,
        [childUserId, activityType, lessonId],
      );

      if (existing.rows.length > 0) {
        return res.status(200).json({ ok: true, alreadySaved: true });
      }

      await logChildActivity(childUserId, activityType, {
        metadata: { lessonId },
      });

      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('[activity-progress] POST error:', err);
      return res.status(200).json({ ok: false, error: 'best-effort' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
