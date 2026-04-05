import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: 'ai_inferencing_db',
  user: process.env.POSTGRES_USER || 'eleazar',
  password: process.env.POSTGRES_PASSWORD || '',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  try {
    switch (req.method) {
      case 'PATCH':
        return await updateBlockedTerm(id, req, res);
      case 'DELETE':
        return await deleteBlockedTerm(id, req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('[Safety API] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function updateBlockedTerm(id: string, req: NextApiRequest, res: NextApiResponse) {
  const { is_active, category } = req.body;
  
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;
  
  if (is_active !== undefined) {
    updates.push(`is_active = $${paramIndex++}`);
    params.push(is_active);
  }
  
  if (category !== undefined) {
    updates.push(`category = $${paramIndex++}`);
    params.push(category);
  }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }
  
  params.push(id);
  
  const result = await pool.query(
    `UPDATE image_safety_blocked_terms 
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    params
  );
  
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Term not found' });
  }
  
  return res.status(200).json({
    success: true,
    term: result.rows[0],
  });
}

async function deleteBlockedTerm(id: string, req: NextApiRequest, res: NextApiResponse) {
  const result = await pool.query(
    'DELETE FROM image_safety_blocked_terms WHERE id = $1 RETURNING *',
    [id]
  );
  
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Term not found' });
  }
  
  return res.status(200).json({
    success: true,
    deleted: result.rows[0],
  });
}
