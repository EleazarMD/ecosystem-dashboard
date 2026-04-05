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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      action, 
      user_id, 
      limit = '100',
      offset = '0'
    } = req.query;
    
    let query = 'SELECT * FROM image_generation_audit_log';
    const params: any[] = [];
    const conditions: string[] = [];
    
    if (action) {
      conditions.push(`action = $${params.length + 1}`);
      params.push(action);
    }
    
    if (user_id) {
      conditions.push(`user_id ILIKE $${params.length + 1}`);
      params.push(`%${user_id}%`);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY created_at DESC';
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit as string), parseInt(offset as string));
    
    const result = await pool.query(query, params);
    
    // Parse violations JSON if stored as string
    const entries = result.rows.map(row => ({
      ...row,
      violations: typeof row.violations === 'string' 
        ? JSON.parse(row.violations) 
        : row.violations
    }));
    
    return res.status(200).json({
      entries,
      total: result.rowCount,
    });
  } catch (error) {
    console.error('[Safety API] Audit log error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
