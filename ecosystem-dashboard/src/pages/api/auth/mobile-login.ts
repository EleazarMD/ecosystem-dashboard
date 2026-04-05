/**
 * Mobile Login API
 * 
 * Provides JWT-based authentication for iOS/mobile apps.
 * Delegates credential verification to the same logic used by NextAuth.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-development-secret-change-in-production';
const JWT_EXPIRY = '30d';

/**
 * Verify credentials - SAME LOGIC as NextAuth CredentialsProvider.authorize()
 */
async function verifyCredentials(email: string, password: string) {
  const result = await pool.query(
    'SELECT id, email, name, password_hash, status FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  if (result.rows.length === 0) return null;

  const user = result.rows[0];
  
  if (user.status !== 'active') return null;
  if (!user.password_hash) return null;

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) return null;

  await pool.query(
    'UPDATE users SET last_login_at = NOW() WHERE id = $1',
    [user.id]
  );

  return user;
}

/**
 * Get user with tenants and subscription - SAME LOGIC as NextAuth JWT callback
 */
async function getUserWithTenants(userId: string) {
  try {
    const userResult = await pool.query(
      'SELECT id, email, name, platform_role, account_type FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) return null;
    const user = userResult.rows[0];

    const tenantsResult = await pool.query(
      'SELECT tm.tenant_id as tenantId, t.slug as tenantSlug, t.name as tenantName, tm.role_id as roleId FROM tenant_memberships tm JOIN tenants t ON tm.tenant_id = t.id WHERE tm.user_id = $1 AND tm.status = \'active\' AND t.status = \'active\'',
      [userId]
    );

    const subscriptionResult = await pool.query(
      'SELECT subscription_tier FROM user_feature_access WHERE user_id = $1',
      [userId]
    );

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      platformRole: user.platform_role || 'user',
      accountType: user.account_type || 'standard',
      subscriptionTier: subscriptionResult.rows[0]?.subscription_tier || 'free',
      tenants: tenantsResult.rows,
    };
  } catch (error) {
    console.error('[Mobile Auth] Error fetching user data:', error);
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await verifyCredentials(email, password);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const userData = await getUserWithTenants(user.id);
    if (!userData) {
      return res.status(500).json({ error: 'Failed to load user data' });
    }

    const token = jwt.sign(
      {
        userId: userData.id,
        email: userData.email,
        platformRole: userData.platformRole,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    console.log('[Mobile Auth] User logged in:', userData.email);

    return res.status(200).json({
      token,
      user: userData,
      expiresIn: 30 * 24 * 60 * 60,
    });
  } catch (error) {
    console.error('[Mobile Auth] Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
