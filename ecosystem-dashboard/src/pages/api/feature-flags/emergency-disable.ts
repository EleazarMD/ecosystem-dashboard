/**
 * Emergency Feature Flag Disable
 * 
 * POST /api/feature-flags/emergency-disable
 * 
 * CRITICAL: Instantly disables ALL new features
 * Use when new features are causing production issues
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }
  
  try {
    const changedBy = req.headers['x-user-id'] || 'emergency';
    const reason = req.body.reason || 'EMERGENCY DISABLE - Production Issues';
    
    console.error('[EMERGENCY] Disabling all features:', { changedBy, reason });
    
    // Use the emergency disable function
    await pool.query(
      'SELECT emergency_disable_all_features($1)',
      [changedBy]
    );
    
    // Get updated flags to confirm
    const result = await pool.query(
      'SELECT flags, last_updated, version FROM feature_flags WHERE id = $1',
      ['production']
    );
    
    // Log to feature flag history
    await pool.query(
      `INSERT INTO feature_flag_history (flag_id, flag_path, new_value, changed_by, reason)
       VALUES ('production', 'emergencyDisableAll', 'true'::jsonb, $1, $2)`,
      [changedBy, reason]
    );
    
    console.log('[EMERGENCY] All features disabled successfully');
    
    return res.status(200).json({
      success: true,
      message: 'All features disabled successfully',
      flags: result.rows[0].flags,
      lastUpdated: result.rows[0].last_updated,
      version: result.rows[0].version,
    });
  } catch (error) {
    console.error('[EMERGENCY] Failed to disable features:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
