/**
 * ExoMind Jobs API - Long-running task management and delegation
 * 
 * ExoMind is the specialist agent that handles:
 * - Long-running background tasks
 * - Scheduled reminders and follow-ups
 * - Action item tracking from notes
 * - Research and monitoring jobs
 * - Notification orchestration (iOS push + Hyperspace cards)
 * 
 * POST /api/exomind/jobs - Create a new job
 * GET /api/exomind/jobs - List jobs (with filters)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db/client';

const DEFAULT_USER_ID = 'eleazar';

interface CreateJobRequest {
  title: string;
  description?: string;
  job_type?: 'task' | 'research' | 'monitor' | 'reminder' | 'followup';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  reminder_at?: string;
  recurrence?: string;
  source_note_id?: string;
  source_conversation_id?: string;
  context?: Record<string, any>;
  delegated_to?: string;
  notify_on_complete?: boolean;
  notify_channel?: 'push' | 'email' | 'both';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const userId = (req.headers['x-user-id'] as string) || DEFAULT_USER_ID;

  // GET: List jobs with filters
  if (req.method === 'GET') {
    try {
      const {
        status,
        job_type,
        priority,
        due_before,
        include_completed,
        limit = '20',
        offset = '0',
      } = req.query;

      const limitNum = Math.min(parseInt(limit as string, 10), 100);
      const offsetNum = parseInt(offset as string, 10);

      let whereClause = `user_id = $1`;
      const params: any[] = [userId];
      let paramIndex = 2;

      // Filter by status
      if (status) {
        whereClause += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      } else if (include_completed !== 'true') {
        // By default, exclude completed/cancelled jobs
        whereClause += ` AND status NOT IN ('completed', 'cancelled')`;
      }

      // Filter by job type
      if (job_type) {
        whereClause += ` AND job_type = $${paramIndex}`;
        params.push(job_type);
        paramIndex++;
      }

      // Filter by priority
      if (priority) {
        whereClause += ` AND priority = $${paramIndex}`;
        params.push(priority);
        paramIndex++;
      }

      // Filter by due date
      if (due_before) {
        whereClause += ` AND due_date <= $${paramIndex}`;
        params.push(due_before);
        paramIndex++;
      }

      // Get total count
      const countResult = await query(
        `SELECT COUNT(*) as total FROM exomind_jobs WHERE ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0]?.total || '0', 10);

      // Get jobs with pagination
      params.push(limitNum, offsetNum);
      const result = await query(
        `SELECT * FROM exomind_jobs 
         WHERE ${whereClause}
         ORDER BY 
           CASE priority 
             WHEN 'urgent' THEN 1 
             WHEN 'high' THEN 2 
             WHEN 'medium' THEN 3 
             ELSE 4 
           END,
           due_date ASC NULLS LAST,
           created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        params
      );

      const jobs = result.rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        job_type: row.job_type,
        priority: row.priority,
        status: row.status,
        progress: row.progress,
        status_message: row.status_message,
        due_date: row.due_date,
        reminder_at: row.reminder_at,
        reminder_sent: row.reminder_sent,
        recurrence: row.recurrence,
        source_note_id: row.source_note_id,
        context: row.context,
        delegated_to: row.delegated_to,
        delegation_status: row.delegation_status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        completed_at: row.completed_at,
      }));

      // Get summary stats
      const statsResult = await query(
        `SELECT 
           COUNT(*) FILTER (WHERE status = 'pending') as pending,
           COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
           COUNT(*) FILTER (WHERE status = 'waiting_input') as waiting_input,
           COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('completed', 'cancelled')) as overdue
         FROM exomind_jobs WHERE user_id = $1`,
        [userId]
      );
      const stats = statsResult.rows[0] || {};

      return res.status(200).json({
        jobs,
        pagination: {
          total,
          limit: limitNum,
          offset: offsetNum,
          has_more: offsetNum + jobs.length < total,
        },
        stats: {
          pending: parseInt(stats.pending || '0', 10),
          in_progress: parseInt(stats.in_progress || '0', 10),
          waiting_input: parseInt(stats.waiting_input || '0', 10),
          overdue: parseInt(stats.overdue || '0', 10),
        },
      });
    } catch (error) {
      console.error('Error listing ExoMind jobs:', error);
      return res.status(500).json({
        error: 'Failed to list jobs',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // POST: Create a new job
  if (req.method === 'POST') {
    try {
      const body: CreateJobRequest = req.body;
      const {
        title,
        description,
        job_type = 'task',
        priority = 'medium',
        due_date,
        reminder_at,
        recurrence,
        source_note_id,
        source_conversation_id,
        context = {},
        delegated_to,
        notify_on_complete = true,
        notify_channel = 'push',
      } = body;

      if (!title) {
        return res.status(400).json({ error: 'title is required' });
      }

      const result = await query(
        `INSERT INTO exomind_jobs (
           user_id, title, description, job_type, priority,
           due_date, reminder_at, recurrence,
           source_note_id, source_conversation_id, context,
           delegated_to, notify_on_complete, notify_channel
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING *`,
        [
          userId, title, description, job_type, priority,
          due_date || null, reminder_at || null, recurrence || null,
          source_note_id || null, source_conversation_id || null, JSON.stringify(context),
          delegated_to || null, notify_on_complete, notify_channel,
        ]
      );

      const job = result.rows[0];

      return res.status(201).json({
        id: job.id,
        title: job.title,
        description: job.description,
        job_type: job.job_type,
        priority: job.priority,
        status: job.status,
        due_date: job.due_date,
        reminder_at: job.reminder_at,
        delegated_to: job.delegated_to,
        created_at: job.created_at,
      });
    } catch (error) {
      console.error('Error creating ExoMind job:', error);
      return res.status(500).json({
        error: 'Failed to create job',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
