import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  database: process.env.DATABASE_NAME || 'ecosystem_unified',
  user: process.env.DATABASE_USER || 'eleazar',
  password: process.env.DATABASE_PASSWORD || '',
});

const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || '';

function parseNextRun(schedule: string): Date {
  // Simple cron parser for common patterns
  const now = new Date();
  
  if (schedule === '@hourly') {
    return new Date(now.getTime() + 60 * 60 * 1000);
  } else if (schedule === '@daily') {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  } else if (schedule === '@weekly') {
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(0, 0, 0, 0);
    return nextWeek;
  } else if (schedule === '@monthly') {
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);
    return nextMonth;
  }
  
  // For specific cron patterns, calculate next run
  // This is a simplified version - production should use a proper cron parser
  const parts = schedule.split(' ');
  if (parts.length === 5) {
    const [minute, hour] = parts;
    const nextRun = new Date(now);
    
    if (hour !== '*') {
      nextRun.setHours(parseInt(hour), parseInt(minute || '0'), 0, 0);
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
    } else {
      nextRun.setMinutes(parseInt(minute || '0'), 0, 0);
      if (nextRun <= now) {
        nextRun.setHours(nextRun.getHours() + 1);
      }
    }
    
    return nextRun;
  }
  
  // Default to 1 hour from now
  return new Date(now.getTime() + 60 * 60 * 1000);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const serviceKey = req.headers['x-internal-service-key'] as string;
  if (!serviceKey || serviceKey !== INTERNAL_SERVICE_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const { enabled } = req.query;
      
      let query = 'SELECT * FROM homelab_backup_schedules';
      const params: any[] = [];
      
      if (enabled !== undefined) {
        query += ' WHERE enabled = $1';
        params.push(enabled === 'true');
      }
      
      query += ' ORDER BY created_at DESC';
      
      const result = await pool.query(query, params);
      
      return res.status(200).json({
        schedules: result.rows,
        count: result.rows.length,
      });
      
    } catch (error) {
      console.error('[Backup API] List schedules error:', error);
      return res.status(500).json({
        error: 'Failed to list schedules',
        message: (error as Error).message,
      });
    }
  }
  
  if (req.method === 'POST') {
    try {
      const {
        name,
        target,
        schedule,
        retention = 30,
        compression = true,
        enabled = true,
      } = req.body;
      
      if (!name || !target || !schedule) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['name', 'target', 'schedule'],
        });
      }
      
      const nextRun = parseNextRun(schedule);
      
      const result = await pool.query(
        `INSERT INTO homelab_backup_schedules 
         (name, backup_type, target, schedule, enabled, retention_days, compression, next_run)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        ['scheduled', target, schedule, enabled, retention, compression, nextRun, name]
      );
      
      return res.status(201).json({
        schedule: result.rows[0],
        message: 'Backup schedule created',
      });
      
    } catch (error) {
      console.error('[Backup API] Create schedule error:', error);
      return res.status(500).json({
        error: 'Failed to create schedule',
        message: (error as Error).message,
      });
    }
  }
  
  if (req.method === 'PATCH') {
    try {
      const { id, enabled } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'Schedule ID is required' });
      }
      
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      if (enabled !== undefined) {
        updates.push(`enabled = $${paramIndex}`);
        values.push(enabled);
        paramIndex++;
      }
      
      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }
      
      updates.push('updated_at = NOW()');
      
      const query = `
        UPDATE homelab_backup_schedules 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      values.push(id);
      
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Schedule not found' });
      }
      
      return res.status(200).json({
        schedule: result.rows[0],
        message: 'Schedule updated',
      });
      
    } catch (error) {
      console.error('[Backup API] Update schedule error:', error);
      return res.status(500).json({
        error: 'Failed to update schedule',
        message: (error as Error).message,
      });
    }
  }
  
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ error: 'Schedule ID is required' });
      }
      
      const result = await pool.query(
        'DELETE FROM homelab_backup_schedules WHERE id = $1 RETURNING *',
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Schedule not found' });
      }
      
      return res.status(200).json({
        message: 'Schedule deleted',
        schedule: result.rows[0],
      });
      
    } catch (error) {
      console.error('[Backup API] Delete schedule error:', error);
      return res.status(500).json({
        error: 'Failed to delete schedule',
        message: (error as Error).message,
      });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
