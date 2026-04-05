/**
 * News Source Detail API Endpoint
 * GET /api/news/sources/[id] - Get a specific source
 * PATCH /api/news/sources/[id] - Update a source
 * DELETE /api/news/sources/[id] - Delete a source
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME || 'ecosystem_unified',
  user: process.env.DATABASE_USER || 'eleazar',
  password: process.env.DATABASE_PASSWORD || '',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Source ID required' });
  }

  switch (req.method) {
    case 'GET':
      return getSource(id, res);
    case 'PATCH':
      return updateSource(id, req, res);
    case 'DELETE':
      return deleteSource(id, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getSource(id: string, res: NextApiResponse) {
  try {
    const result = await pool.query(
      `SELECT * FROM news.sources WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Source not found' });
    }

    return res.status(200).json({
      success: true,
      source: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching source:', error);
    return res.status(500).json({
      error: 'Failed to fetch source',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function updateSource(id: string, req: NextApiRequest, res: NextApiResponse) {
  try {
    const { enabled, name, url, category, credibility_score, priority } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (enabled !== undefined) {
      updates.push(`enabled = $${paramIndex}`);
      values.push(enabled);
      paramIndex++;
    }
    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }
    if (url !== undefined) {
      updates.push(`url = $${paramIndex}`);
      values.push(url);
      paramIndex++;
    }
    if (category !== undefined) {
      updates.push(`category = $${paramIndex}`);
      values.push(category);
      paramIndex++;
    }
    if (credibility_score !== undefined) {
      updates.push(`credibility_score = $${paramIndex}`);
      values.push(credibility_score);
      paramIndex++;
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramIndex}`);
      values.push(priority);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const query = `
      UPDATE news.sources 
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Source not found' });
    }

    return res.status(200).json({
      success: true,
      source: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating source:', error);
    return res.status(500).json({
      error: 'Failed to update source',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function deleteSource(id: string, res: NextApiResponse) {
  try {
    const result = await pool.query(
      `DELETE FROM news.sources WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Source not found' });
    }

    return res.status(200).json({
      success: true,
      deleted: id,
    });
  } catch (error) {
    console.error('Error deleting source:', error);
    return res.status(500).json({
      error: 'Failed to delete source',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
