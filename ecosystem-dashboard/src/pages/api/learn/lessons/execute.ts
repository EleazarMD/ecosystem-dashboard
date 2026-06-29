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
import { Pool } from 'pg';
import { LessonLifecycleService } from '@/lib/kids-pic/LessonLifecycleService';
import { AgentDispatchOrchestrator } from '@/lib/kids-pic/AgentDispatchOrchestrator';
import { executeTask } from '@/lib/kids-pic/AgentExecutionAdapters';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const service = new LessonLifecycleService(pool);
const orchestrator = new AgentDispatchOrchestrator(pool);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { taskId } = req.body;
  if (!taskId) {
    return res.status(400).json({ error: 'taskId is required' });
  }

  try {
    // Get the task
    const tasks = await service.getTasks('');
    // We need to find the task by ID — getTasks returns all tasks for a lesson,
    // but we don't know the lesson ID yet. Query directly.
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
      message: completion.message,
      model: result.output.model,
      tokensUsed: result.output.tokensUsed,
      durationMs: result.durationMs,
    });
  } catch (error: any) {
    console.error('[execute-api]', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
