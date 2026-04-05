import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === 'GET') {
      const result = await pool.query(
        'SELECT flags, last_updated, version FROM feature_flags WHERE id = $1',
        ['production']
      );
      
      if (result.rows.length > 0) {
        return res.status(200).json({
          success: true,
          flags: result.rows[0].flags,
          lastUpdated: result.rows[0].last_updated,
          version: result.rows[0].version,
        });
      }
      
      return res.status(404).json({
        success: false,
        error: 'Feature flags not found',
      });
    }
    
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  } catch (error) {
    console.error('[FeatureFlags API] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
