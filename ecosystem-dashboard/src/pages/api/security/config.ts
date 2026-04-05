/**
 * Security Configuration API
 * 
 * GET /api/security/config - Get current security configuration
 * PUT /api/security/config - Update security configuration
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  database: process.env.DATABASE_NAME || 'ecosystem_unified',
  user: process.env.DATABASE_USER || 'eleazar',
  password: process.env.DATABASE_PASSWORD || '',
});

interface SecurityConfig {
  contentFilter: {
    enabled: boolean;
    strictMode: boolean;
    blockThreshold: number;
    logAllAttempts: boolean;
  };
  toolPolicy: {
    enabled: boolean;
    defaultRequiresApproval: boolean;
    sandboxByDefault: boolean;
    blockedPatterns: string[];
  };
  rateLimiting: {
    enabled: boolean;
    requestsPerMinute: number;
    burstLimit: number;
    perUserLimits: boolean;
  };
  anomalyDetection: {
    enabled: boolean;
    sensitivityLevel: 'low' | 'medium' | 'high';
    alertThreshold: number;
    learningMode: boolean;
  };
  alerting: {
    enabled: boolean;
    emailNotifications: boolean;
    pushNotifications: boolean;
    webhookEnabled: boolean;
    webhookUrl: string;
  };
  mfa: {
    required: boolean;
    allowedMethods: string[];
    sessionDuration: number;
  };
}

const defaultConfig: SecurityConfig = {
  contentFilter: {
    enabled: true,
    strictMode: false,
    blockThreshold: 0.7,
    logAllAttempts: true,
  },
  toolPolicy: {
    enabled: true,
    defaultRequiresApproval: false,
    sandboxByDefault: true,
    blockedPatterns: ['rm -rf', 'sudo', 'chmod 777', 'mkfs', 'dd if='],
  },
  rateLimiting: {
    enabled: true,
    requestsPerMinute: 60,
    burstLimit: 10,
    perUserLimits: true,
  },
  anomalyDetection: {
    enabled: true,
    sensitivityLevel: 'medium',
    alertThreshold: 0.7,
    learningMode: false,
  },
  alerting: {
    enabled: true,
    emailNotifications: true,
    pushNotifications: true,
    webhookEnabled: false,
    webhookUrl: '',
  },
  mfa: {
    required: false,
    allowedMethods: ['totp', 'email'],
    sessionDuration: 30,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const userId = session.user.id;

  if (req.method === 'GET') {
    return getConfig(userId, res);
  } else if (req.method === 'PUT') {
    return updateConfig(userId, req.body, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getConfig(userId: string, res: NextApiResponse) {
  try {
    const result = await pool.query(
      `SELECT config FROM user_security_config WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Return default config if none exists
      return res.json(defaultConfig);
    }

    return res.json(result.rows[0].config);
  } catch (error) {
    // Table might not exist yet, return defaults
    console.error('[SecurityConfig] Error fetching config:', error);
    return res.json(defaultConfig);
  }
}

async function updateConfig(userId: string, config: SecurityConfig, res: NextApiResponse) {
  try {
    // Validate config structure
    if (!config || typeof config !== 'object') {
      return res.status(400).json({ error: 'Invalid configuration' });
    }

    // Upsert config
    await pool.query(
      `INSERT INTO user_security_config (user_id, config, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) 
       DO UPDATE SET config = $2, updated_at = NOW()`,
      [userId, JSON.stringify(config)]
    );

    // Log the config change
    await pool.query(
      `INSERT INTO security_audit_log (user_id, event_type, action, outcome, metadata, timestamp)
       VALUES ($1, 'config_change', 'security_config_update', 'success', $2, NOW())`,
      [userId, JSON.stringify({ sections: Object.keys(config) })]
    );

    return res.json({ success: true, config });
  } catch (error) {
    console.error('[SecurityConfig] Error updating config:', error);
    return res.status(500).json({ error: 'Failed to update configuration' });
  }
}
