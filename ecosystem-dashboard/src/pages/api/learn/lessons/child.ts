/**
 * Child Lesson API — fetch a published lesson for a child player.
 *
 * GET /api/learn/lessons/child?id=X  → { lesson, steps, assets }
 *
 * Only returns published lessons. Steps are sorted by stepNumber.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { LessonLifecycleService } from '@/lib/kids-pic/LessonLifecycleService';
import { lessonAuth } from '@/lib/platform/lesson-access';
import dbPool from '@/lib/db/client';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const service = new LessonLifecycleService(pool);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Lesson id is required' });
  }

  try {
    const auth = await lessonAuth(req, res);
    if (!auth) return;

    let full;
    try {
      full = await service.getFullLesson(id);
    } catch (err: any) {
      // Non-uuid ids fail the Postgres uuid cast (22P02) — a missing lesson,
      // not a server error.
      if (err?.code === '22P02') {
        return res.status(404).json({ error: 'Lesson not found' });
      }
      throw err;
    }
    if (!full.lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // Children see only published lessons assigned to them (404, not 403 —
    // no catalog probing); adults (curators) may preview any state.
    if (auth.accountType === 'child') {
      const assigned = full.lesson.lifecycleState === 'published'
        ? await dbPool.query(
            'SELECT 1 FROM lesson_assignments WHERE lesson_id = $1 AND child_user_id = $2',
            [id, auth.userId])
        : { rows: [] as unknown[] };
      if (assigned.rows.length === 0) {
        return res.status(404).json({ error: 'Lesson not found' });
      }
    }

    // Sort steps by stepNumber
    const steps = [...(full.steps || [])].sort((a, b) => a.stepNumber - b.stepNumber);

    // Map assets by stepId for easy lookup
    const assets = full.assets || [];

    return res.status(200).json({
      lesson: {
        id: full.lesson.id,
        title: full.lesson.title,
        description: full.lesson.description,
        subject: full.lesson.subject,
        ageBand: full.lesson.ageBand,
        difficulty: full.lesson.difficulty,
        estimatedMinutes: full.lesson.estimatedMinutes,
        skillCodes: full.lesson.skillCodes,
        lessonEmoji: full.lesson.lessonEmoji,
        designSpec: full.lesson.designSpec,
      },
      steps: steps.map((s) => ({
        id: s.id,
        stepNumber: s.stepNumber,
        stepType: s.stepType,
        title: s.title,
        description: s.description,
        stepEmoji: s.stepEmoji,
        content: s.content,
        visualSpec: s.visualSpec,
        assetIds: s.assetIds,
      })),
      assets: assets.map((a) => ({
        id: a.id,
        stepId: a.stepId,
        assetType: a.assetType,
        assetUrl: a.assetUrl,
        thumbnailUrl: a.thumbnailUrl,
        altText: a.altText,
        mimeType: a.mimeType,
      })),
    });
  } catch (error: any) {
    console.error('[child-lesson-api]', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
