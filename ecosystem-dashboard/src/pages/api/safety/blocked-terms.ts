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
  try {
    switch (req.method) {
      case 'GET':
        return await getBlockedTerms(req, res);
      case 'POST':
        return await addBlockedTerm(req, res);
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

async function getBlockedTerms(req: NextApiRequest, res: NextApiResponse) {
  const { category, active } = req.query;
  
  let query = 'SELECT * FROM image_safety_blocked_terms';
  const params: any[] = [];
  const conditions: string[] = [];
  
  if (category) {
    conditions.push(`category = $${params.length + 1}`);
    params.push(category);
  }
  
  if (active !== undefined) {
    conditions.push(`is_active = $${params.length + 1}`);
    params.push(active === 'true');
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ' ORDER BY category, term';
  
  const result = await pool.query(query, params);
  
  return res.status(200).json({
    terms: result.rows,
    total: result.rowCount,
  });
}

async function addBlockedTerm(req: NextApiRequest, res: NextApiResponse) {
  const { term, category = 'other' } = req.body;
  
  if (!term || typeof term !== 'string') {
    return res.status(400).json({ error: 'Term is required' });
  }
  
  const normalizedTerm = term.trim().toLowerCase();
  
  if (normalizedTerm.length < 2) {
    return res.status(400).json({ error: 'Term must be at least 2 characters' });
  }
  
  // Check if term already exists
  const existing = await pool.query(
    'SELECT id FROM image_safety_blocked_terms WHERE term = $1',
    [normalizedTerm]
  );
  
  if (existing.rowCount && existing.rowCount > 0) {
    return res.status(409).json({ 
      error: 'Term already exists',
      message: `"${normalizedTerm}" is already in the blocked terms list`
    });
  }
  
  const result = await pool.query(
    `INSERT INTO image_safety_blocked_terms (term, category, is_active, created_at)
     VALUES ($1, $2, true, NOW())
     RETURNING *`,
    [normalizedTerm, category]
  );
  
  return res.status(201).json({
    success: true,
    term: result.rows[0],
  });
}
