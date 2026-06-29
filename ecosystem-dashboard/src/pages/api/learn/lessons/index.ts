/**
 * Lesson Lifecycle API — Create and manage lessons in the multi-agent pipeline.
 *
 * POST   /api/learn/lessons              → create a lesson
 * GET    /api/learn/lessons              → list lessons (filter by state, subject, agent)
 * GET    /api/learn/lessons/:id          → get full lesson (steps, assets, tasks, reviews)
 * PATCH  /api/learn/lessons/:id          → update lesson state / design spec
 * POST   /api/learn/lessons/:id/publish  → publish an approved lesson
 *
 * POST   /api/learn/lessons/:id/steps    → add a step
 * PATCH  /api/learn/lessons/steps/:stepId → update step content
 *
 * POST   /api/learn/lessons/:id/tasks    → create an agent task
 * POST   /api/learn/lessons/tasks/:taskId/start   → mark task in_progress
 * POST   /api/learn/lessons/tasks/:taskId/complete → complete task with output
 * POST   /api/learn/lessons/tasks/:taskId/fail     → fail task with error
 * GET    /api/learn/lessons/:id/tasks/ready → get ready-to-execute tasks
 *
 * POST   /api/learn/lessons/:id/reviews  → add a review
 * POST   /api/learn/lessons/:id/assets   → register a generated asset
 *
 * POST   /api/learn/lessons/:id/assign   → assign lesson to a child
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import {
  LessonLifecycleService,
  CreateLessonInput,
  LifecycleState,
  AgentId,
  type CreateStepInput,
  type CreateAgentTaskInput,
  type CreateReviewInput,
  type AssetType,
  type StepType,
  type TaskType,
} from '@/lib/kids-pic/LessonLifecycleService';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const service = new LessonLifecycleService(pool);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method, query, body } = req;

  try {
    // ── POST /api/learn/lessons → create lesson ──────────────────────────
    if (method === 'POST' && !query.id) {
      const input: CreateLessonInput = {
        lessonCode: body.lessonCode,
        title: body.title,
        description: body.description,
        subject: body.subject,
        ageBand: body.ageBand,
        skillCodes: body.skillCodes,
        curriculumStandards: body.curriculumStandards,
        difficulty: body.difficulty,
        estimatedMinutes: body.estimatedMinutes,
        courseCode: body.courseCode,
        unitCode: body.unitCode,
        minGrade: body.minGrade,
        maxGrade: body.maxGrade,
        assignedAgents: body.assignedAgents,
        createdBy: body.createdBy,
      };

      if (!input.lessonCode || !input.title || !input.subject || !input.ageBand) {
        return res.status(400).json({ error: 'lessonCode, title, subject, and ageBand are required' });
      }

      const lesson = await service.createLesson(input);
      return res.status(201).json(lesson);
    }

    // ── GET /api/learn/lessons → list lessons ────────────────────────────
    if (method === 'GET' && !query.id) {
      const lessons = await service.listLessons({
        lifecycleState: query.state as LifecycleState | undefined,
        subject: query.subject as string | undefined,
        ageBand: query.ageBand as string | undefined,
        assignedAgent: query.agent as AgentId | undefined,
      });
      return res.status(200).json(lessons);
    }

    // ── Routes requiring :id ──────────────────────────────────────────────
    const lessonId = query.id as string;
    if (!lessonId) {
      return res.status(404).json({ error: 'Lesson id required' });
    }

    // ── GET /api/learn/lessons/:id → full lesson ─────────────────────────
    if (method === 'GET') {
      const full = await service.getFullLesson(lessonId);
      if (!full.lesson) return res.status(404).json({ error: 'Lesson not found' });
      return res.status(200).json(full);
    }

    // ── PATCH /api/learn/lessons/:id → update state / spec ───────────────
    if (method === 'PATCH') {
      if (body.lifecycleState) {
        const updated = await service.updateLessonState(
          lessonId,
          body.lifecycleState as LifecycleState,
          body.triggeredBy,
          body.triggeredByType
        );
        if (!updated) return res.status(404).json({ error: 'Lesson not found' });
        return res.status(200).json(updated);
      }

      if (body.designSpec) {
        const updated = await service.updateLessonDesignSpec(lessonId, body.designSpec);
        if (!updated) return res.status(404).json({ error: 'Lesson not found' });
        return res.status(200).json(updated);
      }

      if (body.assignAgent) {
        await service.assignAgent(lessonId, body.assignAgent as AgentId, body.lead || false);
        const lesson = await service.getLesson(lessonId);
        return res.status(200).json(lesson);
      }

      return res.status(400).json({ error: 'No valid update field provided' });
    }

    // ── POST /api/learn/lessons/:id/publish ──────────────────────────────
    if (method === 'POST' && query.action === 'publish') {
      const published = await service.publishLesson(lessonId, body.publishedBy);
      if (!published) return res.status(400).json({ error: 'Lesson must be in approved state to publish' });
      return res.status(200).json(published);
    }

    // ── POST /api/learn/lessons/:id/steps → add step ─────────────────────
    if (method === 'POST' && query.action === 'steps') {
      const input: CreateStepInput = {
        lessonId,
        stepNumber: body.stepNumber,
        stepType: body.stepType as StepType,
        title: body.title,
        description: body.description,
        stepEmoji: body.stepEmoji,
        contentAgent: body.contentAgent,
        visualAgent: body.visualAgent,
      };

      if (input.stepNumber === undefined || !input.stepType || !input.title) {
        return res.status(400).json({ error: 'stepNumber, stepType, and title are required' });
      }

      const step = await service.createStep(input);
      return res.status(201).json(step);
    }

    // ── POST /api/learn/lessons/:id/tasks → create agent task ────────────
    if (method === 'POST' && query.action === 'tasks') {
      const input: CreateAgentTaskInput = {
        lessonId,
        stepId: body.stepId,
        agentId: body.agentId as AgentId,
        taskType: body.taskType as TaskType,
        inputPayload: body.inputPayload,
        dependsOn: body.dependsOn,
      };

      if (!input.agentId || !input.taskType) {
        return res.status(400).json({ error: 'agentId and taskType are required' });
      }

      const task = await service.createTask(input);
      return res.status(201).json(task);
    }

    // ── GET /api/learn/lessons/:id/tasks/ready → ready tasks ─────────────
    if (method === 'GET' && query.action === 'tasks' && query.sub === 'ready') {
      const tasks = await service.getReadyTasks(lessonId);
      return res.status(200).json(tasks);
    }

    // ── POST /api/learn/lessons/:id/reviews → add review ─────────────────
    if (method === 'POST' && query.action === 'reviews') {
      const input: CreateReviewInput = {
        lessonId,
        stepId: body.stepId,
        assetId: body.assetId,
        reviewerType: body.reviewerType,
        reviewerId: body.reviewerId,
        reviewerName: body.reviewerName,
        reviewKind: body.reviewKind,
        verdict: body.verdict,
        score: body.score,
        notes: body.notes,
        suggestedChanges: body.suggestedChanges,
      };

      if (!input.reviewerId || !input.reviewKind || !input.verdict) {
        return res.status(400).json({ error: 'reviewerId, reviewKind, and verdict are required' });
      }

      const review = await service.addReview(input);
      return res.status(201).json(review);
    }

    // ── POST /api/learn/lessons/:id/assets → register asset ──────────────
    if (method === 'POST' && query.action === 'assets') {
      const asset = await service.createAsset({
        lessonId,
        stepId: body.stepId,
        assetType: body.assetType as AssetType,
        generatingAgent: body.generatingAgent,
        generationPrompt: body.generationPrompt,
        generationParams: body.generationParams,
        assetUrl: body.assetUrl,
        assetData: body.assetData,
        thumbnailUrl: body.thumbnailUrl,
        fileSizeBytes: body.fileSizeBytes,
        mimeType: body.mimeType,
        altText: body.altText,
      });

      if (!asset.generatingAgent || !asset.assetType) {
        return res.status(400).json({ error: 'generatingAgent and assetType are required' });
      }

      return res.status(201).json(asset);
    }

    // ── POST /api/learn/lessons/:id/assign → assign to child ─────────────
    if (method === 'POST' && query.action === 'assign') {
      if (!body.childUserId || !body.assignedBy) {
        return res.status(400).json({ error: 'childUserId and assignedBy are required' });
      }

      const assignment = await service.assignLessonToChild(
        lessonId,
        body.childUserId,
        body.assignedBy,
        body.dueDate,
        body.priority
      );
      return res.status(201).json(assignment);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('[lesson-lifecycle-api]', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
