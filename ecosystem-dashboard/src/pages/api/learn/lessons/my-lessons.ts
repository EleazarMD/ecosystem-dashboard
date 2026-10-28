/**
 * A child's assigned published lessons — the Learn page's lesson row.
 *
 * GET /api/learn/lessons/my-lessons[?childId=X] → assigned published lessons
 * with their assignment progress. A child sees their own; an adult may pass
 * childId (their own child or any, for admins).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { lessonAuth, canAssignChild } from '@/lib/platform/lesson-access';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await lessonAuth(req, res);
  if (!auth) return;

  const asked = typeof req.query.childId === 'string' ? req.query.childId : '';
  let childId = auth.userId;
  if (asked && asked !== auth.userId) {
    if (auth.accountType === 'child' || !(await canAssignChild(auth, asked))) {
      // A child may only ever see their own list; adults need the same
      // relationship the assign gate requires.
      return res.status(404).json({ error: 'Not found' });
    }
    childId = asked;
  }

  try {
    const r = await pool.query(
      `SELECT l.id, l.title, l.lesson_emoji, l.subject, l.estimated_minutes,
              a.status AS assignment_status, a.current_step, a.score, a.due_date
         FROM public.lesson_assignments la
         JOIN public.lessons l ON l.id = la.lesson_id
        WHERE la.child_user_id = $1
          AND l.lifecycle_state = 'published'
          AND COALESCE(la.status, 'assigned') NOT IN ('completed', 'skipped')
        ORDER BY la.due_date ASC NULLS LAST, la.created_at ASC
        LIMIT 12`,
      [childId],
    );
    return res.status(200).json({
      lessons: r.rows.map(row => ({
        id: row.id,
        title: row.title,
        emoji: row.lesson_emoji,
        subject: row.subject,
        estimatedMinutes: row.estimated_minutes,
        status: row.assignment_status ?? 'assigned',
        currentStep: row.current_step,
        score: row.score,
        dueDate: row.due_date,
      })),
    });
  } catch (error: any) {
    console.error('[my-lessons-api]', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
