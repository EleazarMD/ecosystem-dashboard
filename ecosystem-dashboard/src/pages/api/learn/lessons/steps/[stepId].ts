/**
 * Step Update API — update content or visual spec for a lesson step.
 *
 * PATCH /api/learn/lessons/steps/:stepId
 *   body: { content?: object, visualSpec?: object, contentAgent?: string, visualAgent?: string }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { requireLessonAdult } from '@/lib/platform/lesson-access';
import { LessonLifecycleService } from '@/lib/kids-pic/LessonLifecycleService';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const service = new LessonLifecycleService(pool);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method, query, body } = req;

  const auth = await requireLessonAdult(req, res);
  if (!auth) return;
  const stepId = query.stepId as string;

  if (!stepId) {
    return res.status(400).json({ error: 'stepId is required' });
  }

  if (method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (body.content) {
      const step = await service.updateStepContent(stepId, body.content, body.contentAgent);
      if (!step) return res.status(404).json({ error: 'Step not found' });
      return res.status(200).json(step);
    }

    if (body.visualSpec) {
      const step = await service.updateStepVisualSpec(stepId, body.visualSpec, body.visualAgent);
      if (!step) return res.status(404).json({ error: 'Step not found' });
      return res.status(200).json(step);
    }

    return res.status(400).json({ error: 'Provide content or visualSpec to update' });
  } catch (error: any) {
    console.error('[step-update-api]', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
