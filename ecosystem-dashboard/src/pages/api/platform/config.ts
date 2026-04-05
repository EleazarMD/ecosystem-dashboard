/**
 * Platform Configuration API
 * 
 * GET - Retrieve current platform configuration
 * PUT - Update platform configuration
 * POST - Reset to defaults
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import {
  PlatformConfig,
  createDefaultPlatformConfig,
} from '@/lib/platform/types';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'GET':
        return await getConfig(req, res);
      case 'PUT':
        return await updateConfig(req, res);
      case 'POST':
        return await resetConfig(req, res);
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('[Platform Config API] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function getConfig(req: NextApiRequest, res: NextApiResponse) {
  const environment = (req.query.environment as string) || 'development';
  
  try {
    // Try to get from database
    const result = await pool.query(
      `SELECT config, last_updated, updated_by 
       FROM platform_config 
       WHERE environment = $1`,
      [environment]
    );
    
    if (result.rows.length > 0) {
      const row = result.rows[0];
      return res.status(200).json({
        success: true,
        config: row.config as PlatformConfig,
        lastUpdated: row.last_updated,
        updatedBy: row.updated_by,
      });
    }
    
    // No config found, return defaults
    const defaultConfig = createDefaultPlatformConfig();
    defaultConfig.environment = environment as any;
    
    return res.status(200).json({
      success: true,
      config: defaultConfig,
      isDefault: true,
    });
  } catch (dbError) {
    // Database not available, return defaults
    console.warn('[Platform Config] Database unavailable, using defaults');
    const defaultConfig = createDefaultPlatformConfig();
    
    return res.status(200).json({
      success: true,
      config: defaultConfig,
      isDefault: true,
      warning: 'Using default configuration (database unavailable)',
    });
  }
}

async function updateConfig(req: NextApiRequest, res: NextApiResponse) {
  const { config, updatedBy = 'api' } = req.body;
  
  if (!config) {
    return res.status(400).json({
      success: false,
      error: 'Configuration data required',
    });
  }
  
  const environment = config.environment || 'development';
  
  try {
    // Upsert configuration
    const result = await pool.query(
      `INSERT INTO platform_config (environment, config, last_updated, updated_by)
       VALUES ($1, $2, NOW(), $3)
       ON CONFLICT (environment)
       DO UPDATE SET 
         config = $2,
         last_updated = NOW(),
         updated_by = $3
       RETURNING id, last_updated`,
      [environment, JSON.stringify(config), updatedBy]
    );
    
    return res.status(200).json({
      success: true,
      message: 'Configuration updated',
      lastUpdated: result.rows[0].last_updated,
    });
  } catch (dbError) {
    console.error('[Platform Config] Database error:', dbError);
    return res.status(500).json({
      success: false,
      error: 'Failed to save configuration',
    });
  }
}

async function resetConfig(req: NextApiRequest, res: NextApiResponse) {
  const { environment = 'development' } = req.body;
  
  const defaultConfig = createDefaultPlatformConfig();
  defaultConfig.environment = environment;
  
  try {
    await pool.query(
      `INSERT INTO platform_config (environment, config, last_updated, updated_by)
       VALUES ($1, $2, NOW(), 'system_reset')
       ON CONFLICT (environment)
       DO UPDATE SET 
         config = $2,
         last_updated = NOW(),
         updated_by = 'system_reset'`,
      [environment, JSON.stringify(defaultConfig)]
    );
    
    return res.status(200).json({
      success: true,
      message: 'Configuration reset to defaults',
      config: defaultConfig,
    });
  } catch (dbError) {
    return res.status(200).json({
      success: true,
      message: 'Reset to defaults (in-memory only)',
      config: defaultConfig,
      warning: 'Database unavailable',
    });
  }
}
