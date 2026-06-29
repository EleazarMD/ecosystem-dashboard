/**
 * Sign Up API
 * 
 * Creates a new user account with email/password.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { issueAccessToken, issueRefreshToken, DEFAULT_ISSUER_CONFIG } from '../../../lib/platform/unified-token';
import { resolveGrantableTier } from '../../../lib/subscription-tiers';
import { checkRateLimit, getIP, RATE_LIMITS } from '../../../lib/platform/rate-limiter';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-development-secret-change-in-production';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // P2.10: Rate limit — 5 signups per IP per 15 minutes
  const ip = getIP(req);
  if (!checkRateLimit(`signup:ip:${ip}`, RATE_LIMITS.signup.maxRequests, RATE_LIMITS.signup.windowMs)) {
    return res.status(429).json({ error: 'Too many signup attempts. Please try again later.' });
  }

  const { name, email, password, targetTier, formData } = req.body;

  // Detect client type from headers
  const xClient = (req.headers['x-client'] as string) || '';
  const trustedMobileClients = ['Hyperspace-iOS', 'Hyperspace-iPadOS', 'Hyperspace-macOS', 'CompanionAI-iOS'];
  const isMobile = xClient && trustedMobileClients.includes(xClient);
  const clientType = isMobile ? (xClient.includes('macOS') ? 'macos' : 'ios') : 'dashboard';
  const platform = isMobile ? (xClient.includes('macOS') ? 'macos' : 'ios') : 'web';
  const clientId = xClient || 'dashboard';

  // Validation
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    // Check if user already exists
    const existingUser = await pool.query(
      `SELECT id FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, name, password_hash, status, created_at)
       VALUES ($1, $2, $3, 'active', NOW())
       RETURNING id, email, name`,
      [email.toLowerCase(), name, passwordHash]
    );

    const user = result.rows[0];

    // Create personal tenant for the new user
    const slug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-');
    const tenantResult = await pool.query(
      `INSERT INTO tenants (name, slug, status) VALUES ($1, $2, 'active') RETURNING id, slug`,
      [`${name}'s Workspace`, slug]
    );
    const tenantId = tenantResult.rows[0].id;
    const tenantSlug = tenantResult.rows[0].slug;

    // Create tenant membership as admin
    await pool.query(
      `INSERT INTO tenant_memberships (tenant_id, user_id, role_id, status)
       VALUES ($1, $2, 'tenant-admin', 'active')`,
      [tenantId, user.id]
    );

    // Assign subscription tier (default: free).
    // A self-service signup can never be a platform admin, so privileged tiers
    // (e.g. `admin`) are rejected rather than silently granted.
    const tierDecision = resolveGrantableTier(targetTier, false);
    if (!tierDecision.allowed) {
      return res.status(403).json({ error: 'Insufficient authority for tier', detail: tierDecision.reason });
    }
    const tier = tierDecision.tier;
    await pool.query(
      `INSERT INTO user_feature_access (user_id, subscription_tier, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())`,
      [user.id, tier]
    );

    // Register the calling client
    await pool.query(
      `INSERT INTO client_registrations
         (user_id, tenant_id, client_type, client_id, client_name, platform,
          auth_method, capabilities, is_active, last_seen_at, registered_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'jwt', '[]'::jsonb, true, NOW(), NOW())
       ON CONFLICT (user_id, client_id) WHERE is_active = true DO UPDATE SET
         last_seen_at = NOW(), is_active = true`,
      [user.id, tenantId, clientType, clientId, clientId, platform]
    );

    // Log audit event
    await pool.query(
      `INSERT INTO audit_log (action, user_id, metadata, created_at)
       VALUES ('user:signup', $1, $2, NOW())`,
      [user.id, JSON.stringify({ email: user.email, tenantId, tier, clientType })]
    );

    // Resolve features from tier
    const { getTierFeatures } = require('../../../lib/subscription-tiers');
    const features = getTierFeatures(tier) as string[];

    // Issue unified tokens
    const accessToken = issueAccessToken(
      {
        sub: user.id,
        userId: user.id,
        email: user.email,
        name: user.name,
        platformRole: 'user',
        accountType: 'standard',
        tenantId,
        tenantSlug,
        tenantRole: 'tenant-admin',
        subscriptionTier: tier,
        features,
        clientType: clientType as any,
        platform: platform as any,
        clientId,
        authMethod: 'jwt',
      },
      {
        issuer: 'signup',
        secret: JWT_SECRET,
        accessTokenTTL: DEFAULT_ISSUER_CONFIG.accessTokenTTL!,
        refreshTokenTTL: DEFAULT_ISSUER_CONFIG.refreshTokenTTL!,
      }
    );

    const refreshToken = issueRefreshToken(
      {
        sub: user.id,
        userId: user.id,
        email: user.email,
        name: user.name,
        platformRole: 'user',
        accountType: 'standard',
        subscriptionTier: tier,
        features,
        clientType: clientType as any,
        platform: platform as any,
        clientId,
        authMethod: 'jwt',
      },
      {
        issuer: 'signup',
        secret: JWT_SECRET,
        accessTokenTTL: DEFAULT_ISSUER_CONFIG.accessTokenTTL!,
        refreshTokenTTL: DEFAULT_ISSUER_CONFIG.refreshTokenTTL!,
      }
    );

    return res.status(201).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      tenant: {
        id: tenantId,
        slug: tenantSlug,
        role: 'tenant-admin',
      },
      subscription: {
        tier,
        features,
      },
      token: accessToken,
      refreshToken,
      tokenType: 'unified',
      clientType,
      platform,
      onboardingRequired: true,
    });

  } catch (error) {
    console.error('[Signup API] Error:', error);
    return res.status(500).json({ error: 'Failed to create account' });
  }
}
