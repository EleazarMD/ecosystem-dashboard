/**
 * ExoMind Reminder Processor
 * 
 * Called by cron/systemd timer to:
 * 1. Send notifications for jobs with reminder_at <= NOW
 * 2. Mark overdue jobs
 * 3. Handle recurring jobs
 * 
 * POST /api/exomind/jobs/process-reminders
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth: internal API key
  const apiKey = req.headers['x-api-key'] as string;
  const expectedKey = process.env.AI_GATEWAY_API_KEY || process.env.INTERNAL_API_KEY || 'ai-gateway-api-key-2024';
  if (apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const results = {
    reminders_sent: 0,
    overdue_marked: 0,
    recurring_created: 0,
    errors: [] as string[],
  };

  try {
    // 1. Process pending reminders
    const pendingReminders = await query(
      `SELECT * FROM exomind_jobs 
       WHERE reminder_at <= NOW() 
         AND reminder_sent = FALSE 
         AND status NOT IN ('completed', 'cancelled')
       ORDER BY reminder_at ASC
       LIMIT 50`
    );

    for (const job of pendingReminders.rows) {
      try {
        await sendNotification(job, 'reminder');
        await query(
          `UPDATE exomind_jobs SET reminder_sent = TRUE WHERE id = $1`,
          [job.id]
        );
        results.reminders_sent++;
      } catch (e) {
        results.errors.push(`Reminder ${job.id}: ${e}`);
      }
    }

    // 2. Mark overdue jobs (due_date passed, not completed)
    const overdueResult = await query(
      `UPDATE exomind_jobs 
       SET status_message = 'Overdue - due date has passed'
       WHERE due_date < NOW() 
         AND status NOT IN ('completed', 'cancelled', 'failed')
         AND (status_message IS NULL OR status_message NOT LIKE 'Overdue%')
       RETURNING id, user_id, title`
    );

    for (const job of overdueResult.rows) {
      try {
        await sendNotification(job, 'overdue');
        results.overdue_marked++;
      } catch (e) {
        results.errors.push(`Overdue ${job.id}: ${e}`);
      }
    }

    // 3. Handle recurring jobs that completed
    const completedRecurring = await query(
      `SELECT * FROM exomind_jobs 
       WHERE status = 'completed' 
         AND recurrence IS NOT NULL
         AND completed_at >= NOW() - INTERVAL '1 day'`
    );

    for (const job of completedRecurring.rows) {
      try {
        const nextDue = calculateNextDue(job.due_date, job.recurrence);
        const nextReminder = job.reminder_at ? calculateNextDue(job.reminder_at, job.recurrence) : null;

        await query(
          `INSERT INTO exomind_jobs (
             user_id, title, description, job_type, priority,
             due_date, reminder_at, recurrence,
             source_note_id, context, notify_on_complete, notify_channel
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            job.user_id, job.title, job.description, job.job_type, job.priority,
            nextDue, nextReminder, job.recurrence,
            job.source_note_id, JSON.stringify(job.context || {}),
            job.notify_on_complete, job.notify_channel,
          ]
        );
        results.recurring_created++;
      } catch (e) {
        results.errors.push(`Recurring ${job.id}: ${e}`);
      }
    }

    return res.status(200).json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error('Error processing ExoMind reminders:', error);
    return res.status(500).json({
      error: 'Failed to process reminders',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

function calculateNextDue(currentDate: string | Date, recurrence: string): Date {
  const date = new Date(currentDate);
  
  switch (recurrence) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'biweekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      // Assume it's days if numeric
      const days = parseInt(recurrence, 10);
      if (!isNaN(days)) {
        date.setDate(date.getDate() + days);
      }
  }
  
  return date;
}

async function sendNotification(job: any, eventType: 'reminder' | 'overdue') {
  const notifyUrl = process.env.DASHBOARD_URL || 'http://localhost:8404';
  const apiKey = process.env.AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024';

  const config: Record<string, { title: string; body: string; category: string }> = {
    reminder: {
      title: '⏰ Reminder',
      body: job.title,
      category: 'CALENDAR_REMINDER',
    },
    overdue: {
      title: '⚠️ Overdue Task',
      body: `${job.title} is past due`,
      category: 'SYSTEM_ALERT',
    },
  };

  const { title, body, category } = config[eventType];

  await fetch(`${notifyUrl}/api/notifications/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify({
      userId: job.user_id,
      title,
      body,
      category,
      threadId: `exomind-job-${job.id}`,
      priority: eventType === 'overdue' ? 'high' : 'normal',
      data: {
        route: 'exomind/job',
        resourceId: job.id,
        url: `/exomind/jobs/${job.id}`,
        source: 'exomind',
        job_type: job.job_type,
      },
    }),
  });

  console.log(`[ExoMind] Sent ${eventType} notification for job ${job.id}: ${job.title}`);
}
