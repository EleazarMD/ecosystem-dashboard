/**
 * Token Refresh API
 *
 * Exchanges a valid refresh token for a new access token.
 * Used by iOS/mobile clients when the 1-hour access token expires.
 *
 * POST /api/auth/refresh
 * Body: { refreshToken: string }
 * Response: { token: string, refreshToken: string, expiresIn: number, tokenType: 'unified' }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import {
  verifyToken,
  issueAccessToken,
  issueRefreshToken,
  DEFAULT_ISSUER_CONFIG,
  UnifiedTokenPayload,
} from '../../../lib/platform/unified-token';
import { checkRateLimit, getIP, RATE_LIMITS } from '../../../lib/platform/rate-limiter';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-development-secret-change-in-production';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // P2.11: Tighten CORS — only allow known client origins, not wildcard.
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  // Dev fallback: localhost origins
  const devOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8404',
    'http://127.0.0.1:8404',
  ];
  const allAllowed = [...allowedOrigins, ...devOrigins];

  const origin = req.headers.origin;
  if (origin && allAllowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Vary', 'Origin');
  } else if (process.env.NODE_ENV !== 'production') {
    // Dev: allow without origin header (e.g. curl)
    res.setHeader('Access-Control-Allow-Origin', origin || 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  // In production with no matching origin: no CORS headers → browser blocks

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // P2.10: Rate limit — 30 refreshes per IP per 15 minutes
  const ip = getIP(req);
  if (!checkRateLimit(`refresh:ip:${ip}`, RATE_LIMITS.refresh.maxRequests, RATE_LIMITS.refresh.windowMs)) {
    return res.status(429).json({ error: 'Too many refresh attempts. Please try again later.' });
  }

  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'refreshToken is required' });
    }

    // Verify the refresh token
    let payload: UnifiedTokenPayload;
    try {
      payload = verifyToken(refreshToken, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Ensure it's actually a refresh token
    if (payload.type !== 'refresh') {
      return res.status(401).json({ error: 'Token is not a refresh token' });
    }

    // Verify user still exists and is active
    const userResult = await pool.query(
      'SELECT id, email, name, platform_role, account_type, status FROM users WHERE id = $1',
      [payload.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    if (user.status !== 'active') {
      return res.status(401).json({ error: 'Account is not active' });
    }

    // Revocation enforcement: if the refresh token is bound to a client, that
    // client registration must still be active. Deactivating a device
    // (DELETE /api/onboarding/clients) therefore stops further refreshes,
    // even though the previously-issued access token may live out its 1h TTL.
    if (payload.clientId) {
      const clientResult = await pool.query(
        `SELECT 1 FROM client_registrations
         WHERE user_id = $1 AND client_id = $2 AND is_active = true
         LIMIT 1`,
        [user.id, payload.clientId]
      );
      if (clientResult.rows.length === 0) {
        return res.status(401).json({ error: 'Client revoked or not registered' });
      }
    }

    // Fetch fresh tenant + subscription data
    const tenantsResult = await pool.query(
      `SELECT tm.tenant_id as tenantId, t.slug as tenantSlug, t.name as tenantName,
              tm.role_id as roleId
       FROM tenant_memberships tm
       JOIN tenants t ON tm.tenant_id = t.id
       WHERE tm.user_id = $1 AND tm.status = 'active' AND t.status = 'active'`,
      [user.id]
    );

    const subscriptionResult = await pool.query(
      'SELECT subscription_tier FROM user_feature_access WHERE user_id = $1',
      [user.id]
    );

    const subscriptionTier = subscriptionResult.rows[0]?.subscription_tier || 'free';

    // Resolve features from tier
    const { getTierFeatures } = require('../../../lib/subscription-tiers');
    const features = getTierFeatures(subscriptionTier) as string[];

    const tenantId = tenantsResult.rows[0]?.tenantId;
    const tenantSlug = tenantsResult.rows[0]?.tenantSlug;
    const tenantRole = tenantsResult.rows[0]?.roleId;

    // Issue new access token
    const newAccessToken = issueAccessToken(
      {
        sub: user.id,
        userId: user.id,
        email: user.email,
        name: user.name,
        platformRole: user.platform_role || 'user',
        accountType: user.account_type || 'standard',
        tenantId,
        tenantSlug,
        tenantRole,
        subscriptionTier,
        features,
        clientType: payload.clientType,
        platform: payload.platform,
        clientId: payload.clientId,
        authMethod: 'jwt',
      },
      {
        issuer: 'refresh',
        secret: JWT_SECRET,
        accessTokenTTL: DEFAULT_ISSUER_CONFIG.accessTokenTTL!,
        refreshTokenTTL: DEFAULT_ISSUER_CONFIG.refreshTokenTTL!,
      }
    );

    // Issue new refresh token (rotated)
    const newRefreshToken = issueRefreshToken(
      {
        sub: user.id,
        userId: user.id,
        email: user.email,
        name: user.name,
        platformRole: user.platform_role || 'user',
        accountType: user.account_type || 'standard',
        subscriptionTier,
        features,
        clientType: payload.clientType,
        platform: payload.platform,
        clientId: payload.clientId,
        authMethod: 'jwt',
      },
      {
        issuer: 'refresh',
        secret: JWT_SECRET,
        accessTokenTTL: DEFAULT_ISSUER_CONFIG.accessTokenTTL!,
        refreshTokenTTL: DEFAULT_ISSUER_CONFIG.refreshTokenTTL!,
      }
    );

    // Update client last_seen_at
    if (payload.clientId) {
      try {
        await pool.query(
          `UPDATE client_registrations SET last_seen_at = NOW()
           WHERE user_id = $1 AND client_id = $2 AND is_active = true`,
          [user.id, payload.clientId]
        );
      } catch { /* non-fatal */ }
    }

    return res.status(200).json({
      token: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: DEFAULT_ISSUER_CONFIG.accessTokenTTL,
      tokenType: 'unified',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        platformRole: user.platform_role || 'user',
        accountType: user.account_type || 'standard',
        subscriptionTier,
        tenants: tenantsResult.rows,
      },
    });
  } catch (error) {
    console.error('[Auth Refresh] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
