/**
 * API endpoint to unregister a device from push notifications
 * 
 * DELETE /api/notifications/unregister-device
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
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const userId = session.user.id;

  try {
    const { deviceToken } = req.body;

    if (!deviceToken) {
      return res.status(400).json({ error: 'deviceToken is required' });
    }

    // Only allow users to unregister their own devices
    const result = await pool.query(
      `DELETE FROM user_devices 
       WHERE device_token = $1 AND user_id = $2
       RETURNING id`,
      [deviceToken, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Log the unregistration
    await pool.query(
      `INSERT INTO security_audit_log 
       (event_type, severity, user_id, action, outcome)
       VALUES ($1, $2, $3, $4, $5)`,
      ['device_registration', 'info', userId, 'device:unregistered', 'success']
    );

    return res.json({ success: true });

  } catch (error) {
    console.error('[Notifications] Error unregistering device:', error);
    return res.status(500).json({ error: 'Failed to unregister device' });
  }
}
