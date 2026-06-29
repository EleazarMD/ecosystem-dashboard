/**
 * Agent Dispatch Orchestrator API — pipeline control endpoints.
 *
 * POST   /api/learn/lessons/orchestrate?action=start       → start pipeline for a draft lesson
 * POST   /api/learn/lessons/orchestrate?action=dispatch     → dispatch ready tasks
 * POST   /api/learn/lessons/orchestrate?action=complete     → complete a task (triggers pipeline advance)
 * POST   /api/learn/lessons/orchestrate?action=review       → submit a review
 * POST   /api/learn/lessons/orchestrate?action=publish      → publish an approved lesson
 * GET    /api/learn/lessons/orchestrate?action=status&id=X  → get pipeline status
 * GET    /api/learn/lessons/orchestrate?action=plan&id=X    → get pipeline plan
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { AgentDispatchOrchestrator } from '@/lib/kids-pic/AgentDispatchOrchestrator';
import type { LessonDesignSpec } from '@/lib/kids-pic/LessonLifecycleService';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const orchestrator = new AgentDispatchOrchestrator(pool);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method, query, body } = req;
  const action = query.action as string;

  try {
    // ── GET routes ─────────────────────────────────────────────────────────

    if (method === 'GET') {
      const lessonId = (query.id as string) || (body.lessonId as string);

      if (action === 'status') {
        if (!lessonId) return res.status(400).json({ error: 'id is required' });
        const status = await orchestrator.getPipelineStatus(lessonId);
        return res.status(200).json(status);
      }

      if (action === 'plan') {
        if (!lessonId) return res.status(400).json({ error: 'id is required' });
        const plan = await orchestrator.planPipeline(lessonId);
        return res.status(200).json(plan);
      }

      return res.status(400).json({ error: 'Unknown GET action. Use status or plan.' });
    }

    // ── POST routes ────────────────────────────────────────────────────────

    if (method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    if (action === 'start') {
      if (!body.lessonId) return res.status(400).json({ error: 'lessonId is required' });
      const result = await orchestrator.startPipeline(body.lessonId);
      return res.status(200).json(result);
    }

    if (action === 'dispatch') {
      if (!body.lessonId) return res.status(400).json({ error: 'lessonId is required' });
      const result = await orchestrator.dispatchReadyTasks(body.lessonId);
      return res.status(200).json(result);
    }

    if (action === 'complete') {
      if (!body.taskId) return res.status(400).json({ error: 'taskId is required' });
      if (!body.outputPayload) return res.status(400).json({ error: 'outputPayload is required' });
      const result = await orchestrator.onTaskComplete(
        body.taskId,
        body.outputPayload,
        body.qualityScore
      );
      return res.status(200).json(result);
    }

    if (action === 'review') {
      if (!body.lessonId) return res.status(400).json({ error: 'lessonId is required' });
      if (!body.reviewerId) return res.status(400).json({ error: 'reviewerId is required' });
      if (!body.verdict) return res.status(400).json({ error: 'verdict is required' });
      const result = await orchestrator.submitReview(body.lessonId, {
        reviewerType: body.reviewerType || 'human',
        reviewerId: body.reviewerId,
        reviewerName: body.reviewerName,
        reviewKind: body.reviewKind || 'pedagogical',
        verdict: body.verdict,
        score: body.score,
        notes: body.notes,
        stepId: body.stepId,
        assetId: body.assetId,
      });
      return res.status(200).json(result);
    }

    if (action === 'publish') {
      if (!body.lessonId) return res.status(400).json({ error: 'lessonId is required' });
      if (!body.publishedBy) return res.status(400).json({ error: 'publishedBy is required' });
      const lesson = await orchestrator.publishLesson(body.lessonId, body.publishedBy);
      if (!lesson) return res.status(400).json({ error: 'Failed to publish lesson' });
      return res.status(200).json(lesson);
    }

    return res.status(400).json({
      error: 'Unknown action. Use start, dispatch, complete, review, publish, status, or plan.',
    });
  } catch (error: any) {
    console.error('[orchestrator-api]', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
