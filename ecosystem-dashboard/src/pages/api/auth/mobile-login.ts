/**
 * Mobile Login API
 * 
 * Provides JWT-based authentication for iOS/mobile apps.
 * Delegates credential verification to the same logic used by NextAuth.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import { issueAccessToken, issueRefreshToken, DEFAULT_ISSUER_CONFIG } from '../../../lib/platform/unified-token';
import { checkRateLimit, getIP, RATE_LIMITS } from '../../../lib/platform/rate-limiter';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-development-secret-change-in-production';

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
  // P2.11: Tighten CORS — only allow known client origins
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const devOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
  const allAllowed = [...allowedOrigins, ...devOrigins];
  const origin = req.headers.origin;
  if (origin && allAllowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Vary', 'Origin');
  } else if (process.env.NODE_ENV !== 'production') {
    res.setHeader('Access-Control-Allow-Origin', origin || 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // P2.10: Rate limit — 10 login attempts per IP per 15 minutes
  const ip = getIP(req);
  if (!checkRateLimit(`mobileLogin:ip:${ip}`, RATE_LIMITS.mobileLogin.maxRequests, RATE_LIMITS.mobileLogin.windowMs)) {
    return res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
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

    // Determine client type and platform from request headers
    const xClient = (req.headers['x-client'] as string) || '';
    const clientType = xClient.includes('macOS') ? 'macos' : 'ios';
    const platform = xClient.includes('macOS') ? 'macos' : 'ios';
    const clientId = xClient || 'Hyperspace-iOS';

    // Resolve features from subscription tier
    const { getTierFeatures } = require('../../../lib/subscription-tiers');
    const features = getTierFeatures(userData.subscriptionTier) as string[];

    // Issue unified access token
    const accessToken = issueAccessToken(
      {
        sub: userData.id,
        userId: userData.id,
        email: userData.email,
        name: userData.name,
        platformRole: userData.platformRole,
        accountType: userData.accountType,
        tenantId: userData.tenants[0]?.tenantId,
        tenantSlug: userData.tenants[0]?.tenantSlug,
        tenantRole: userData.tenants[0]?.roleId,
        subscriptionTier: userData.subscriptionTier,
        features,
        clientType: clientType as any,
        platform: platform as any,
        clientId,
        authMethod: 'jwt',
      },
      {
        issuer: 'mobile-login',
        secret: JWT_SECRET,
        accessTokenTTL: DEFAULT_ISSUER_CONFIG.accessTokenTTL!,
        refreshTokenTTL: DEFAULT_ISSUER_CONFIG.refreshTokenTTL!,
      }
    );

    // Issue unified refresh token (30d)
    const refreshToken = issueRefreshToken(
      {
        sub: userData.id,
        userId: userData.id,
        email: userData.email,
        name: userData.name,
        platformRole: userData.platformRole,
        accountType: userData.accountType,
        subscriptionTier: userData.subscriptionTier,
        features,
        clientType: clientType as any,
        platform: platform as any,
        clientId,
        authMethod: 'jwt',
      },
      {
        issuer: 'mobile-login',
        secret: JWT_SECRET,
        accessTokenTTL: DEFAULT_ISSUER_CONFIG.accessTokenTTL!,
        refreshTokenTTL: DEFAULT_ISSUER_CONFIG.refreshTokenTTL!,
      }
    );

    // Register/update client in client_registrations
    try {
      await pool.query(
        `INSERT INTO client_registrations
           (user_id, tenant_id, client_type, client_id, client_name, platform,
            auth_method, capabilities, is_active, last_seen_at, registered_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'jwt', '[]'::jsonb, true, now(), now())
         ON CONFLICT (user_id, client_id) WHERE is_active = true DO UPDATE SET
           last_seen_at = now(), is_active = true`,
        [userData.id, userData.tenants[0]?.tenantId || null, clientType, clientId,
         req.body.deviceName || clientId, platform]
      );
    } catch { /* non-fatal */ }

    console.log('[Mobile Auth] User logged in:', userData.email, 'client:', clientType);

    return res.status(200).json({
      token: accessToken,
      refreshToken,
      user: userData,
      expiresIn: DEFAULT_ISSUER_CONFIG.accessTokenTTL,
      tokenType: 'unified',
      clientType,
      platform,
    });
  } catch (error) {
    console.error('[Mobile Auth] Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
