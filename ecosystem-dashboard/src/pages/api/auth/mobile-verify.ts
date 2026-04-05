/**
 * Mobile Token Verification API
 * 
 * Verifies JWT tokens for iOS/mobile apps and returns refreshed user data.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import * as jwt from 'jsonwebtoken';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-development-secret-change-in-production';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);

    let decoded: { userId: string; email: string; platformRole: string };
    try {
      decoded = jwt.verify(token, JWT_SECRET) as typeof decoded;
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const userResult = await pool.query(
      'SELECT id, email, name, platform_role, account_type, status FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    if (user.status !== 'active') {
      return res.status(401).json({ error: 'Account is not active' });
    }

    const tenantsResult = await pool.query(
      'SELECT tm.tenant_id as tenantId, t.slug as tenantSlug, t.name as tenantName, tm.role_id as roleId FROM tenant_memberships tm JOIN tenants t ON tm.tenant_id = t.id WHERE tm.user_id = $1 AND tm.status = \'active\' AND t.status = \'active\'',
      [user.id]
    );

    const subscriptionResult = await pool.query(
      'SELECT subscription_tier FROM user_feature_access WHERE user_id = $1',
      [user.id]
    );

    return res.status(200).json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        platformRole: user.platform_role || 'user',
        accountType: user.account_type || 'standard',
        subscriptionTier: subscriptionResult.rows[0]?.subscription_tier || 'free',
        tenants: tenantsResult.rows,
      },
    });
  } catch (error) {
    console.error('[Mobile Auth] Verify error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
