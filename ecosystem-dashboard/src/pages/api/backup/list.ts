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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const serviceKey = req.headers['x-internal-service-key'] as string;
  if (!serviceKey || serviceKey !== INTERNAL_SERVICE_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { target, status, limit = '50', offset = '0' } = req.query;
    
    let query = 'SELECT * FROM homelab_backups WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;
    
    if (target) {
      query += ` AND target = $${paramIndex}`;
      params.push(target);
      paramIndex++;
    }
    
    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    query += ' ORDER BY created_at DESC';
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string, 10), parseInt(offset as string, 10));
    
    const result = await pool.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM homelab_backups WHERE 1=1';
    const countParams: any[] = [];
    let countIndex = 1;
    
    if (target) {
      countQuery += ` AND target = $${countIndex}`;
      countParams.push(target);
      countIndex++;
    }
    
    if (status) {
      countQuery += ` AND status = $${countIndex}`;
      countParams.push(status);
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count, 10);
    
    return res.status(200).json({
      backups: result.rows,
      count: result.rows.length,
      total: totalCount,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    });
    
  } catch (error) {
    console.error('[Backup API] List error:', error);
    return res.status(500).json({
      error: 'Failed to list backups',
      message: (error as Error).message,
    });
  }
}
