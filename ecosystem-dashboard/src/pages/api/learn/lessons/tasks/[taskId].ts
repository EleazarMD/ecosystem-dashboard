/**
 * Agent Task Execution API — start, complete, or fail a task.
 *
 * POST /api/learn/lessons/tasks/:taskId/start    → mark task in_progress
 * POST /api/learn/lessons/tasks/:taskId/complete → complete with output payload
 * POST /api/learn/lessons/tasks/:taskId/fail     → fail with error message
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
  const taskId = query.taskId as string;

  if (!taskId) {
    return res.status(400).json({ error: 'taskId is required' });
  }

  if (method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const action = query.action as string;

  try {
    if (action === 'start') {
      const task = await service.startTask(taskId);
      if (!task) return res.status(404).json({ error: 'Task not found or not pending' });
      return res.status(200).json(task);
    }

    if (action === 'complete') {
      if (!body.outputPayload) {
        return res.status(400).json({ error: 'outputPayload is required' });
      }
      const task = await service.completeTask(taskId, body.outputPayload, body.qualityScore);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      return res.status(200).json(task);
    }

    if (action === 'fail') {
      if (!body.errorMessage) {
        return res.status(400).json({ error: 'errorMessage is required' });
      }
      const task = await service.failTask(taskId, body.errorMessage);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      return res.status(200).json(task);
    }

    return res.status(400).json({ error: 'Unknown action. Use start, complete, or fail.' });
  } catch (error: any) {
    console.error('[agent-task-api]', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
