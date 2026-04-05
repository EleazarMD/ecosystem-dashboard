/**
 * Children's Planner API
 * 
 * Manages planner items (homework, activities, reminders, notes) for child accounts
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

interface PlannerItem {
  id: string;
  type: 'activity' | 'homework' | 'reminder' | 'note';
  title: string;
  description?: string;
  date: string;
  time?: string;
  subject?: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  emoji?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = session.user as any;
  
  // Only allow child accounts
  if (user.accountType !== 'child') {
    return res.status(403).json({ error: 'This endpoint is for child accounts only' });
  }

  const userId = user.id;

  try {
    switch (req.method) {
      case 'GET':
        return handleGet(userId, res);
      case 'POST':
        return handlePost(userId, req.body, res);
      case 'PUT':
        return handlePut(userId, req.body, res);
      case 'DELETE':
        return handleDelete(userId, req.query.id as string, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Planner API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGet(userId: string, res: NextApiResponse) {
  try {
    // Try to get items from database
    const result = await pool.query(
      `SELECT id, type, title, description, date, time, subject, priority, completed, emoji
       FROM child_planner_items
       WHERE user_id = $1
       ORDER BY date ASC, time ASC NULLS LAST`,
      [userId]
    );

    return res.status(200).json({ items: result.rows });
  } catch (error: any) {
    // If table doesn't exist, return empty array
    if (error.code === '42P01') {
      return res.status(200).json({ items: [] });
    }
    throw error;
  }
}

async function handlePost(userId: string, body: PlannerItem, res: NextApiResponse) {
  const { id, type, title, description, date, time, subject, priority, completed, emoji } = body;

  // Ensure table exists
  await ensureTableExists();

  const result = await pool.query(
    `INSERT INTO child_planner_items (id, user_id, type, title, description, date, time, subject, priority, completed, emoji)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [id || Date.now().toString(), userId, type, title, description || null, date, time || null, subject || null, priority || 'medium', completed || false, emoji || null]
  );

  return res.status(201).json(result.rows[0]);
}

async function handlePut(userId: string, body: PlannerItem, res: NextApiResponse) {
  const { id, type, title, description, date, time, subject, priority, completed, emoji } = body;

  if (!id) {
    return res.status(400).json({ error: 'Item ID is required' });
  }

  const result = await pool.query(
    `UPDATE child_planner_items
     SET type = $3, title = $4, description = $5, date = $6, time = $7, subject = $8, priority = $9, completed = $10, emoji = $11, updated_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [id, userId, type, title, description || null, date, time || null, subject || null, priority, completed, emoji || null]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Item not found' });
  }

  return res.status(200).json(result.rows[0]);
}

async function handleDelete(userId: string, id: string, res: NextApiResponse) {
  if (!id) {
    return res.status(400).json({ error: 'Item ID is required' });
  }

  await pool.query(
    `DELETE FROM child_planner_items WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );

  return res.status(200).json({ success: true });
}

async function ensureTableExists() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS child_planner_items (
      id VARCHAR(255) PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL DEFAULT 'homework',
      title VARCHAR(500) NOT NULL,
      description TEXT,
      date DATE NOT NULL,
      time TIME,
      subject VARCHAR(100),
      priority VARCHAR(20) DEFAULT 'medium',
      completed BOOLEAN DEFAULT false,
      emoji VARCHAR(10),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_child_planner_user_id ON child_planner_items(user_id);
    CREATE INDEX IF NOT EXISTS idx_child_planner_date ON child_planner_items(date);
  `, []);
}
