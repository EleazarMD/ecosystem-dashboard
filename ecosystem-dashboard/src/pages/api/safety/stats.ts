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
    // Get action counts
    const actionCounts = await pool.query(`
      SELECT action, COUNT(*) as count
      FROM image_generation_audit_log
      GROUP BY action
    `);
    
    const counts = {
      totalBlocked: 0,
      totalGenerated: 0,
      totalFailed: 0,
    };
    
    actionCounts.rows.forEach(row => {
      switch (row.action) {
        case 'blocked':
          counts.totalBlocked = parseInt(row.count);
          break;
        case 'generated':
          counts.totalGenerated = parseInt(row.count);
          break;
        case 'failed':
          counts.totalFailed = parseInt(row.count);
          break;
      }
    });
    
    // Get blocked terms count
    const termsCount = await pool.query(`
      SELECT COUNT(*) as count
      FROM image_safety_blocked_terms
      WHERE is_active = true
    `);
    
    // Get top violations (from blocked requests)
    const topViolations = await pool.query(`
      SELECT 
        jsonb_array_elements_text(violations) as term,
        COUNT(*) as count
      FROM image_generation_audit_log
      WHERE action = 'blocked' AND violations IS NOT NULL
      GROUP BY term
      ORDER BY count DESC
      LIMIT 10
    `);
    
    // Get recent activity
    const recentActivity = await pool.query(`
      SELECT *
      FROM image_generation_audit_log
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    return res.status(200).json({
      ...counts,
      blockedTermsCount: parseInt(termsCount.rows[0]?.count || '0'),
      topViolations: topViolations.rows.map(row => ({
        term: row.term,
        count: parseInt(row.count),
      })),
      recentActivity: recentActivity.rows.map(row => ({
        ...row,
        violations: typeof row.violations === 'string' 
          ? JSON.parse(row.violations) 
          : row.violations
      })),
    });
  } catch (error) {
    console.error('[Safety API] Stats error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
