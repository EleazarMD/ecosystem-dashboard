/**
 * Assign a lesson to a child.
 *
 * POST /api/learn/lessons/:id/assign  body: { childUserId, dueDate?, priority? }
 *
 * The Lesson Studio Students tab calls this path form. `assignedBy` is
 * always the signed-in user (server-derived — the body value is ignored).
 * Admins may assign to any child; a parent only to their own.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { LessonLifecycleService } from '@/lib/kids-pic/LessonLifecycleService';
import { requireLessonAdult, canAssignChild } from '@/lib/platform/lesson-access';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const service = new LessonLifecycleService(pool);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await requireLessonAdult(req, res);
  if (!auth) return;

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Lesson id is required' });
  }

  const { childUserId, dueDate, priority } = req.body || {};
  if (!childUserId || typeof childUserId !== 'string') {
    return res.status(400).json({ error: 'childUserId is required' });
  }
  if (!(await canAssignChild(auth, childUserId))) {
    return res.status(403).json({ error: 'Not allowed to assign to this child' });
  }

  try {
    const assignment = await service.assignLessonToChild(
      id,
      childUserId,
      auth.userId,
      typeof dueDate === 'string' ? dueDate : null,
      typeof priority === 'number' ? priority : undefined,
    );
    return res.status(201).json(assignment);
  } catch (error: any) {
    console.error('[lesson-assign-api]', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
