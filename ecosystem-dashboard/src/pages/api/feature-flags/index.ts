/**
 * Feature Flags API
 * 
 * GET /api/feature-flags - Get current flags
 * POST /api/feature-flags - Update flags (admin only)
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
  try {
    if (req.method === 'GET') {
      // Get current feature flags
      const result = await pool.query(
        'SELECT flags, last_updated, version FROM feature_flags WHERE id = $1',
        ['production']
      );
      
      if (result.rows.length === 0) {
        // Initialize if not exists
        await pool.query(`
          INSERT INTO feature_flags (id, flags, updated_by)
          VALUES ('production', $1::jsonb, 'system')
          ON CONFLICT (id) DO NOTHING
        `, [JSON.stringify({
          enableNewLayouts: false,
          enableGlassmorphicDesign: true,
          enableThemeSystem: true,
          pages: {},
          userOverrides: {},
          emergencyDisableAll: false,
        })]);
        
        // Try again
        const retryResult = await pool.query(
          'SELECT flags, last_updated, version FROM feature_flags WHERE id = $1',
          ['production']
        );
        
        if (retryResult.rows.length > 0) {
          return res.status(200).json({
            success: true,
            flags: retryResult.rows[0].flags,
            lastUpdated: retryResult.rows[0].last_updated,
            version: retryResult.rows[0].version,
          });
        }
      }
      
      return res.status(200).json({
        success: true,
        flags: result.rows[0].flags,
        lastUpdated: result.rows[0].last_updated,
        version: result.rows[0].version,
      });
    }
    
    if (req.method === 'POST') {
      // Update feature flag
      const { flagPath, value, userId, reason } = req.body;
      
      if (!flagPath) {
        return res.status(400).json({
          success: false,
          error: 'flagPath is required',
        });
      }
      
      // TODO: Add authentication check here
      // For now, allow all updates (will add auth in production)
      
      const changedBy = req.headers['x-user-id'] || 'api';
      
      // Use the helper function to set flag
      const result = await pool.query(
        'SELECT set_feature_flag($1, $2, $3, $4) as success',
        [flagPath, JSON.stringify(value), changedBy, reason || null]
      );
      
      if (result.rows[0].success) {
        // Get updated flags
        const updated = await pool.query(
          'SELECT flags, last_updated, version FROM feature_flags WHERE id = $1',
          ['production']
        );
        
        return res.status(200).json({
          success: true,
          flags: updated.rows[0].flags,
          lastUpdated: updated.rows[0].last_updated,
          version: updated.rows[0].version,
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'Failed to update feature flag',
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
