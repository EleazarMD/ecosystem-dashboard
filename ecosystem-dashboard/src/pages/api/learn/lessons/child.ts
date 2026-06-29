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
    const full = await service.getFullLesson(id);
    if (!full.lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // Only serve published lessons to children
    if (full.lesson.lifecycleState !== 'published') {
      return res.status(403).json({ error: 'Lesson is not yet available' });
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
