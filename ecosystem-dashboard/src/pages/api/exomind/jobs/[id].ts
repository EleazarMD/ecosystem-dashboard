/**
 * ExoMind Jobs API - Single job operations
 * 
 * GET /api/exomind/jobs/[id] - Get job details
 * PATCH /api/exomind/jobs/[id] - Update job status/details
 * DELETE /api/exomind/jobs/[id] - Cancel a job
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db/client';

const DEFAULT_USER_ID = 'eleazar';

interface UpdateJobRequest {
  title?: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'waiting_input' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  status_message?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  reminder_at?: string;
  result?: Record<string, any>;
  context?: Record<string, any>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const userId = (req.headers['x-user-id'] as string) || DEFAULT_USER_ID;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Job ID is required' });
  }

  // GET: Fetch job details
  if (req.method === 'GET') {
    try {
      const result = await query(
        `SELECT * FROM exomind_jobs WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const job = result.rows[0];
      return res.status(200).json({
        id: job.id,
        title: job.title,
        description: job.description,
        job_type: job.job_type,
        priority: job.priority,
        status: job.status,
        progress: job.progress,
        status_message: job.status_message,
        due_date: job.due_date,
        reminder_at: job.reminder_at,
        reminder_sent: job.reminder_sent,
        recurrence: job.recurrence,
        source_note_id: job.source_note_id,
        source_conversation_id: job.source_conversation_id,
        context: job.context,
        result: job.result,
        delegated_to: job.delegated_to,
        delegation_status: job.delegation_status,
        notify_on_complete: job.notify_on_complete,
        notify_channel: job.notify_channel,
        created_at: job.created_at,
        updated_at: job.updated_at,
        completed_at: job.completed_at,
      });
    } catch (error) {
      console.error('Error fetching ExoMind job:', error);
      return res.status(500).json({ error: 'Failed to fetch job' });
    }
  }

  // PATCH: Update job
  if (req.method === 'PATCH') {
    try {
      const body: UpdateJobRequest = req.body;
      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (body.title !== undefined) {
        updates.push(`title = $${paramIndex++}`);
        params.push(body.title);
      }
      if (body.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        params.push(body.description);
      }
      if (body.status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        params.push(body.status);
        
        // Set completed_at when status becomes completed
        if (body.status === 'completed') {
          updates.push(`completed_at = NOW()`);
        }
      }
      if (body.progress !== undefined) {
        updates.push(`progress = $${paramIndex++}`);
        params.push(Math.min(100, Math.max(0, body.progress)));
      }
      if (body.status_message !== undefined) {
        updates.push(`status_message = $${paramIndex++}`);
        params.push(body.status_message);
      }
      if (body.priority !== undefined) {
        updates.push(`priority = $${paramIndex++}`);
        params.push(body.priority);
      }
      if (body.due_date !== undefined) {
        updates.push(`due_date = $${paramIndex++}`);
        params.push(body.due_date || null);
      }
      if (body.reminder_at !== undefined) {
        updates.push(`reminder_at = $${paramIndex++}`);
        params.push(body.reminder_at || null);
        updates.push(`reminder_sent = FALSE`);
      }
      if (body.result !== undefined) {
        updates.push(`result = $${paramIndex++}`);
        params.push(JSON.stringify(body.result));
      }
      if (body.context !== undefined) {
        updates.push(`context = $${paramIndex++}`);
        params.push(JSON.stringify(body.context));
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      params.push(id, userId);
      const result = await query(
        `UPDATE exomind_jobs 
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
         RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const job = result.rows[0];

      // Send notification if job completed and notify_on_complete is true
      if (body.status === 'completed' && job.notify_on_complete) {
        try {
          await sendJobNotification(job, 'completed');
        } catch (e) {
          console.error('Failed to send completion notification:', e);
        }
      }

      return res.status(200).json({
        id: job.id,
        title: job.title,
        status: job.status,
        progress: job.progress,
        updated_at: job.updated_at,
        completed_at: job.completed_at,
      });
    } catch (error) {
      console.error('Error updating ExoMind job:', error);
      return res.status(500).json({ error: 'Failed to update job' });
    }
  }

  // DELETE: Cancel job
  if (req.method === 'DELETE') {
    try {
      const result = await query(
        `UPDATE exomind_jobs 
         SET status = 'cancelled', status_message = 'Cancelled by user'
         WHERE id = $1 AND user_id = $2
         RETURNING id`,
        [id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Job not found' });
      }

      return res.status(200).json({ success: true, id });
    } catch (error) {
      console.error('Error cancelling ExoMind job:', error);
      return res.status(500).json({ error: 'Failed to cancel job' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function sendJobNotification(job: any, eventType: 'completed' | 'reminder' | 'overdue') {
  const notifyUrl = process.env.DASHBOARD_URL || 'http://localhost:8404';
  const apiKey = process.env.AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024';

  const titles: Record<string, string> = {
    completed: '✅ Task Complete',
    reminder: '⏰ Reminder',
    overdue: '⚠️ Overdue Task',
  };

  const bodies: Record<string, string> = {
    completed: job.title,
    reminder: `Reminder: ${job.title}`,
    overdue: `Overdue: ${job.title}`,
  };

  await fetch(`${notifyUrl}/api/notifications/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify({
      userId: job.user_id,
      title: titles[eventType],
      body: bodies[eventType],
      category: 'AGENT_STATUS',
      threadId: `exomind-job-${job.id}`,
      data: {
        route: 'exomind/job',
        resourceId: job.id,
        url: `/exomind/jobs/${job.id}`,
        source: 'exomind',
        job_type: job.job_type,
      },
    }),
  });
}
