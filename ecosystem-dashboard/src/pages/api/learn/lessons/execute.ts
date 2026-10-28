/**
 * Agent Execution API — executes a single agent task through the AI Gateway.
 *
 * POST /api/learn/lessons/execute
 *   body: { taskId: string }
 *
 * Picks up a pending/in_progress task, calls the appropriate AI model,
 * writes the output back to the lesson, and advances the pipeline if needed.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import { LessonLifecycleService } from '@/lib/kids-pic/LessonLifecycleService';
import { AgentDispatchOrchestrator } from '@/lib/kids-pic/AgentDispatchOrchestrator';
import { executeTask } from '@/lib/kids-pic/AgentExecutionAdapters';

import { requireLessonAdult } from '@/lib/platform/lesson-access';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const service = new LessonLifecycleService(pool);
const orchestrator = new AgentDispatchOrchestrator(pool);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await requireLessonAdult(req, res);
  if (!auth) return;

  const { taskId } = req.body;
  if (!taskId) {
    return res.status(400).json({ error: 'taskId is required' });
  }

  try {
    // Find the task by ID directly (getTasks needs a lesson id; we don't
    // have one yet — the task row carries it).
    const taskResult = await pool.query(
      'SELECT * FROM lesson_agent_tasks WHERE id = $1',
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const taskRow = taskResult.rows[0];
    const taskStatus = taskRow.status;

    if (taskStatus === 'completed') {
      return res.status(400).json({ error: 'Task already completed' });
    }

    if (taskStatus === 'failed') {
      return res.status(400).json({ error: 'Task previously failed' });
    }

    // Start the task if pending
    if (taskStatus === 'pending') {
      await service.startTask(taskId);
    }

    // Execute through the adapter
    const result = await executeTask(
      taskRow.task_type,
      taskRow.agent_id,
      {
        stepId: taskRow.step_id || undefined,
        ...(taskRow.input_payload || {}),
      }
    );

    if (!result.success) {
      await service.failTask(taskId, result.error || 'Execution failed');
      return res.status(500).json({
        success: false,
        error: result.error,
        durationMs: result.durationMs,
      });
    }

    // Blueprint practice bank (ADR-0010 P2): the task's items land in
    // learning_content_items so the session loop can draw on them.
    let itemIds: string[] = [];
    if (Array.isArray(result.output.items) && result.output.items.length) {
      try {
        itemIds = await insertPracticeBank(pool, taskRow, result.output.items);
        result.output.items = itemIds.map(id => ({ id }));
      } catch (err: any) {
        console.error('[lesson-execute] practice bank insert failed:', err?.message);
      }
    }

    // Complete the task via the orchestrator (which handles pipeline advancement)
    const completion = await orchestrator.onTaskComplete(
      taskId,
      result.output,
      // Quality score from review tasks
      result.output.stepContent?.score
    );

    return res.status(200).json({
      success: true,
      task: completion.task,
      pipelineAdvanced: completion.pipelineAdvanced,
      message: completion.message + (itemIds.length ? ` ${itemIds.length} practice item(s) banked.` : ''),
      itemIds,
      model: result.output.model,
      tokensUsed: result.output.tokensUsed,
      durationMs: result.durationMs,
    });
  } catch (error: any) {
    console.error('[execute-api]', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}


/** Insert the generated practice bank into learning_content_items (draft
 *  review status; safety screened best-effort) and link the ids on the
 *  lesson. Items are child-agnostic catalog material (ADR-0010). */
async function insertPracticeBank(
  pool: Pool,
  taskRow: { lesson_id: string; input_payload: Record<string, any> | null },
  items: Record<string, any>[],
): Promise<string[]> {
  const { getAIChildSafetyMonitor } = await import('@/domains/learning/features/safety-monitor');
  const monitor = getAIChildSafetyMonitor(pool);
  const input = taskRow.input_payload || {};
  const skillCode = Array.isArray(input.skillCodes) && input.skillCodes.length ? String(input.skillCodes[0]) : 'math.general';
  const ageBand = typeof input.lessonAgeBand === 'string' ? input.lessonAgeBand : 'middle';
  const gradeMin = ageBand === 'early' ? 'K' : ageBand === 'middle' ? '2' : '4';
  const gradeMax = ageBand === 'early' ? '2' : ageBand === 'middle' ? '5' : '7';
  const ids: string[] = [];
  for (const it of items.slice(0, 50)) {
    const prompt = typeof it.prompt === 'string' ? it.prompt.trim() : '';
    const ak = it.answerKey && typeof it.answerKey === 'object' ? it.answerKey : null;
    if (!prompt || !ak || (ak.kind !== 'number' && ak.kind !== 'exact_text')) continue;
    let safetyStatus = 'pending';
    try {
      const analysis = await monitor.analyzeMessage({
        childId: 'content-generation',
        sessionId: 'lesson-practice-bank',
        childMessage: 'Generate a learning activity.',
        aiResponse: prompt,
        timestamp: new Date(),
      });
      safetyStatus = analysis.safe && !analysis.shouldBlock ? 'passed' : 'failed';
    } catch { safetyStatus = 'pending'; }
    const id = `gen.${randomUUID().slice(0, 8)}`;
    await pool.query(
      `INSERT INTO learning_content_items
       (id, version, subject, skill_code, analytical_tags, content_type, age_band,
        min_grade, max_grade, difficulty, prompt, answer_key, hint_set,
        provenance, review_status, safety_status, low_stakes_only)
       VALUES ($1,1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'ai_generated','draft',$13,true)`,
      [id,
       typeof input.lessonSubject === 'string' ? input.lessonSubject : 'math',
       skillCode,
       JSON.stringify(Array.isArray(it.analyticalTags) ? it.analyticalTags.map(String).slice(0, 6) : []),
       ak.kind === 'number' ? 'problem' : 'question',
       ageBand, gradeMin, gradeMax,
       Math.min(Math.max(Number(it.difficulty) || 2, 1), 5),
       prompt,
       JSON.stringify(ak),
       JSON.stringify(Array.isArray(it.hintSet) ? it.hintSet.map(String).slice(0, 4) : []),
       safetyStatus]);
    ids.push(id);
  }
  if (ids.length) {
    await pool.query(
      `UPDATE lessons SET content_item_ids = (
         SELECT jsonb_agg(x) FROM (
           SELECT jsonb_array_elements_text(COALESCE(content_item_ids, '[]'::jsonb)) AS x
           UNION ALL SELECT unnest($2::text[])
         ) t) WHERE id = $1`,
      [taskRow.lesson_id, ids]);
  }
  return ids;
}
