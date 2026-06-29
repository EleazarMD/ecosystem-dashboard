/**
 * Client Registry API
 * ============================================================================
 * POST   /api/onboarding/clients          — Register a client
 * GET    /api/onboarding/clients          — List clients for the user
 * DELETE /api/onboarding/clients?id=...   — Deactivate a client
 *
 * Any client (iOS, Dashboard, Atlas, CLI, service) can register itself.
 * Auth: NextAuth session, API key, or trusted mobile headers.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Pool } from 'pg';
import { verifyToken, decodeToken } from '../../../lib/platform/unified-token';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-development-secret-change-in-production';

const TRUSTED_MOBILE_CLIENTS = new Set([
  'Hyperspace-iOS', 'Hyperspace-iPadOS', 'Hyperspace-macOS', 'CompanionAI-iOS',
]);

const VALID_CLIENT_TYPES = new Set(['ios', 'dashboard', 'atlas', 'cli', 'service', 'android', 'macos']);
const VALID_PLATFORMS = new Set(['ios', 'android', 'web', 'macos', 'linux', 'windows', 'service']);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Auth: NextAuth session, unified JWT, API key, or trusted mobile headers.
  const session = await getServerSession(req, res, authOptions);
  let userId: string | null = null;
  let callerClientType = 'dashboard';
  let callerPlatform = 'web';
  let callerClientId: string | undefined;

  if (session?.user?.id) {
    userId = session.user.id;
  } else {
    // 2. Unified JWT Bearer token (iOS, Atlas, CLI)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const payload = verifyToken(token, JWT_SECRET);
        if (payload.type === 'access' && payload.userId) {
          userId = payload.userId;
          callerClientType = payload.clientType || callerClientType;
          callerPlatform = payload.platform || callerPlatform;
          callerClientId = payload.clientId;
        }
      } catch { /* invalid token, fall through */ }
    }

    // 3. API key / trusted mobile headers (legacy fallback)
    const apiKey = req.headers['x-api-key'] as string;
    const expectedKey = process.env.AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024';
    const xClient = req.headers['x-client'] as string;

    if (!userId && (apiKey === expectedKey || (xClient && TRUSTED_MOBILE_CLIENTS.has(xClient)))) {
      const userIdHeader = (req.headers['x-user-id'] as string) || '';
      if (userIdHeader) {
        const userResult = await pool.query(
          'SELECT id FROM users WHERE id::text = $1 OR email ILIKE $1 LIMIT 1',
          [userIdHeader]
        );
        userId = userResult.rows[0]?.id ?? null;
      }
      if (xClient && TRUSTED_MOBILE_CLIENTS.has(xClient)) {
        callerClientType = xClient.includes('macOS') ? 'macos' : 'ios';
        callerPlatform = xClient.includes('macOS') ? 'macos' : 'ios';
        callerClientId = xClient;
      } else {
        callerClientType = 'service';
        callerPlatform = 'service';
      }
    }
  }

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  switch (req.method) {
    case 'POST':
      return handleRegisterClient(req, res, userId!);
    case 'GET':
      return handleListClients(req, res, userId!);
    case 'DELETE':
      return handleDeactivateClient(req, res, userId!);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// ============================================================================
// POST — Register a client
// ============================================================================

async function handleRegisterClient(req: NextApiRequest, res: NextApiResponse, userId: string) {
  const body = req.body;

  if (!body.clientType || !body.platform) {
    return res.status(400).json({ error: 'clientType and platform are required' });
  }

  if (!VALID_CLIENT_TYPES.has(body.clientType)) {
    return res.status(400).json({
      error: `Invalid clientType. Must be one of: ${Array.from(VALID_CLIENT_TYPES).join(', ')}`,
    });
  }

  if (!VALID_PLATFORMS.has(body.platform)) {
    return res.status(400).json({
      error: `Invalid platform. Must be one of: ${Array.from(VALID_PLATFORMS).join(', ')}`,
    });
  }

  const clientId = body.clientId || `${body.clientType}-${body.platform}-${Date.now()}`;
  const pushToken = body.pushToken || null;
  const pushTokenType = body.pushTokenType || (
    body.platform === 'ios' ? 'apns' :
    body.platform === 'android' ? 'fcm' :
    body.platform === 'web' ? 'web-push' : null
  );

  // Resolve tenant_id
  const tenantResult = await pool.query(
    `SELECT t.id FROM tenant_memberships tm
     JOIN tenants t ON tm.tenant_id = t.id
     WHERE tm.user_id = $1 AND tm.status = 'active' AND t.status = 'active'
     LIMIT 1`,
    [userId]
  );
  const tenantId = tenantResult.rows[0]?.id || null;

  const result = await pool.query(
    `INSERT INTO client_registrations
       (user_id, tenant_id, client_type, client_id, client_name, platform,
        platform_version, app_version, auth_method, capabilities, push_token,
        push_token_type, device_model, device_family, metadata, is_active,
        last_seen_at, registered_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, true, now(), now())
     ON CONFLICT (user_id, client_id) WHERE is_active = true DO UPDATE SET
       client_name = EXCLUDED.client_name,
       platform = EXCLUDED.platform,
       platform_version = EXCLUDED.platform_version,
       app_version = EXCLUDED.app_version,
       capabilities = EXCLUDED.capabilities,
       push_token = EXCLUDED.push_token,
       push_token_type = EXCLUDED.push_token_type,
       device_model = EXCLUDED.device_model,
       device_family = EXCLUDED.device_family,
       metadata = EXCLUDED.metadata,
       last_seen_at = now(),
       is_active = true,
       deactivated_at = NULL,
       deactivation_reason = NULL
     RETURNING id, client_type, client_id, client_name, platform, app_version,
              capabilities, is_active, registered_at, last_seen_at`,
    [
      userId, tenantId, body.clientType, clientId,
      body.clientName || null, body.platform,
      body.platformVersion || null, body.appVersion || null,
      body.authMethod || 'jwt',
      JSON.stringify(body.capabilities || []),
      pushToken, pushTokenType,
      body.deviceModel || null, body.deviceFamily || null,
      JSON.stringify(body.metadata || {}),
    ]
  );

  const client = result.rows[0];

  // Sync push token to mobile_devices for backward compat with push service
  if (pushToken && (body.platform === 'ios' || body.platform === 'android')) {
    await pool.query(
      `INSERT INTO mobile_devices
         (user_id, device_token, device_type, device_name, app_version, bundle_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       ON CONFLICT (device_token) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         device_name = EXCLUDED.device_name,
         app_version = EXCLUDED.app_version,
         is_active = true,
         last_seen_at = now()`,
      [userId, pushToken, body.platform, body.clientName || null,
       body.appVersion || null, body.bundleId || null]
    );
  }

  // Audit log
  try {
    await pool.query(
      `INSERT INTO audit_log (action, user_id, metadata, created_at)
       VALUES ('client:registered', $1, $2, now())`,
      [userId, JSON.stringify({ clientType: body.clientType, clientId, platform: body.platform })]
    );
  } catch { /* non-fatal */ }

  return res.status(201).json({ success: true, client });
}

// ============================================================================
// GET — List clients for user
// ============================================================================

async function handleListClients(req: NextApiRequest, res: NextApiResponse, userId: string) {
  const activeOnly = req.query.active !== 'false';
  const query = activeOnly
    ? `SELECT * FROM client_registrations WHERE user_id = $1 AND is_active = true ORDER BY last_seen_at DESC`
    : `SELECT * FROM client_registrations WHERE user_id = $1 ORDER BY last_seen_at DESC`;

  const result = await pool.query(query, [userId]);
  return res.status(200).json({ clients: result.rows });
}

// ============================================================================
// DELETE — Deactivate a client
// ============================================================================

async function handleDeactivateClient(req: NextApiRequest, res: NextApiResponse, userId: string) {
  const clientId = req.query.id as string;
  if (!clientId) {
    return res.status(400).json({ error: 'id (client registration id) is required' });
  }

  const result = await pool.query(
    `UPDATE client_registrations
     SET is_active = false, deactivated_at = now(), deactivation_reason = $1
     WHERE id = $2 AND user_id = $3 AND is_active = true
     RETURNING id, client_type, client_id`,
    [req.body?.reason || 'user_revoked', clientId, userId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Client not found or already inactive' });
  }

  // P1.4: Revoke all active access tokens for this client by inserting into
  // the revoked_tokens deny-list. Any access token with this client_id will
  // be rejected at verification time via verifyTokenWithRevocation().
  const deactivatedClient = result.rows[0];
  try {
    // Revoke by client_id — we insert a wildcard entry per-client that
    // blocks all tokens with this client_id. We also try to extract the
    // jti from the caller's current Bearer token for immediate revocation.
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = decodeToken(token);
      if (decoded?.jti) {
        await pool.query(
          `INSERT INTO revoked_tokens (jti, user_id, client_id, exp, reason)
           VALUES ($1, $2, $3, $4, 'client_deactivated')
           ON CONFLICT (jti) DO NOTHING`,
          [decoded.jti, userId, deactivatedClient.client_id,
           new Date(decoded.exp * 1000).toISOString()]
        );
      }
    }

    // Also insert a client-level revocation marker so future tokens for
    // this client_id are caught. We use a synthetic jti pattern.
    await pool.query(
      `INSERT INTO revoked_tokens (jti, user_id, client_id, exp, reason)
       VALUES ($1, $2, $3, now() + interval '1 hour', 'client_deactivated')
       ON CONFLICT (jti) DO NOTHING`,
      [`client:${deactivatedClient.client_id}`, userId, deactivatedClient.client_id]
    );
  } catch { /* revocation is best-effort; client is already deactivated */ }

  return res.status(200).json({ success: true, deactivated: deactivatedClient });
}
