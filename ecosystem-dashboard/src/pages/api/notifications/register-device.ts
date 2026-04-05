/**
 * API endpoint to register a device for push notifications
 * 
 * POST /api/notifications/register-device
 * 
 * Auth: next-auth session OR X-API-Key header (for iOS app direct calls)
 * When using API key auth, X-User-ID header is resolved to a UUID.
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth: try next-auth session first, then API key + X-User-ID
  let userUuid: string | null = null;

  const session = await getServerSession(req, res, authOptions);
  if (session?.user?.id) {
    userUuid = session.user.id;
  } else {
    // Fall back to API key auth (for iOS app)
    const apiKey = req.headers['x-api-key'] as string;
    const expectedKey = process.env.AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024';
    if (apiKey === expectedKey) {
      const userIdHeader = (req.headers['x-user-id'] as string) || 'eleazar';
      const userResult = await pool.query(
        `SELECT id FROM users WHERE id::text = $1 OR name ILIKE $1 OR email ILIKE $1 LIMIT 1`,
        [userIdHeader]
      );
      userUuid = userResult.rows[0]?.id ?? null;
    }
  }

  if (!userUuid) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const { deviceToken, platform, deviceName, appVersion } = req.body;

    if (!deviceToken || !platform) {
      return res.status(400).json({ error: 'deviceToken and platform are required' });
    }

    if (!['ios', 'android', 'web'].includes(platform)) {
      return res.status(400).json({ error: 'Invalid platform. Must be ios, android, or web' });
    }

    const deviceId = `${platform}-${deviceToken.slice(0, 16)}`;
    const tokenType = platform === 'ios' ? 'apns' : platform === 'web' ? 'web-push' : 'fcm';

    const result = await pool.query(
      `INSERT INTO user_devices (user_id, device_id, push_token, push_token_type, platform, device_name, app_version, last_seen, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), true)
       ON CONFLICT (user_id, device_id) DO UPDATE SET
         push_token = EXCLUDED.push_token,
         device_name = EXCLUDED.device_name,
         app_version = EXCLUDED.app_version,
         last_seen = NOW(),
         is_active = true
       RETURNING id, created_at`,
      [userUuid, deviceId, deviceToken, tokenType, platform, deviceName, appVersion]
    );

    const device = result.rows[0];

    // Also upsert into mobile_devices (primary table for iOS/Android push)
    if (platform === 'ios' || platform === 'android') {
      const bundleId = req.body.bundleId || (platform === 'ios' ? 'com.hyperspace.app' : undefined);
      await pool.query(
        `INSERT INTO mobile_devices (user_id, device_token, device_type, device_name, app_version, bundle_id, is_active, registered_at, last_seen_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
         ON CONFLICT (device_token) DO UPDATE SET
           user_id = EXCLUDED.user_id,
           device_name = EXCLUDED.device_name,
           app_version = EXCLUDED.app_version,
           bundle_id = EXCLUDED.bundle_id,
           is_active = true,
           last_seen_at = NOW()`,
        [userUuid, deviceToken, platform, deviceName, appVersion, bundleId]
      );
    }

    // Log the registration (best-effort, don't fail if audit table is missing)
    try {
      await pool.query(
        `INSERT INTO security_audit_log 
         (event_type, severity, user_id, action, outcome, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          'device_registration',
          'info',
          userUuid,
          'device:registered',
          'success',
          JSON.stringify({ platform, deviceName, deviceId }),
        ]
      );
    } catch (auditErr) {
      console.warn('[Notifications] Audit log write failed (non-fatal):', auditErr);
    }

    return res.status(201).json({
      success: true,
      deviceId: device.id,
      createdAt: device.created_at,
    });

  } catch (error) {
    console.error('[Notifications] Error registering device:', error);
    return res.status(500).json({ error: 'Failed to register device' });
  }
}
