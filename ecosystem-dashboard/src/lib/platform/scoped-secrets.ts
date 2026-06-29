/**
 * Scoped Secrets Service (P1.5)
 * ============================================================================
 * Replaces long-lived app passwords / API keys with short-lived, scoped
 * service tokens that are stored in Infisical with a TTL.
 *
 * Instead of persisting a raw IMAP app password or LLM API key, the
 * provisioning pipeline:
 *   1. Stores the real secret in Infisical under a scoped path.
 *   2. Issues a short-lived scoped service token (1h TTL, renewable).
 *   3. Returns only the scoped token reference to the client.
 *
 * Services (CIG, Nova, etc.) fetch the real secret from Infisical at
 * runtime using the scoped token — never from the dashboard DB.
 */

import jwt from 'jsonwebtoken';

export interface ScopedSecretToken {
  token: string;
  secretPath: string;     // Infisical path (e.g. /users/{email}/imap)
  scopes: string[];        // e.g. ['imap:read', 'imap:send']
  expiresAt: number;       // Unix timestamp
  issuedAt: number;        // Unix timestamp
}

export interface ScopedSecretConfig {
  secret: string;          // JWT signing secret (NEXTAUTH_SECRET)
  issuer: string;          // Token issuer
  ttlSeconds: number;      // Token TTL (default: 3600 = 1h)
}

const DEFAULT_CONFIG: Partial<ScopedSecretConfig> = {
  issuer: 'ecosystem-dashboard',
  ttlSeconds: 3600, // 1 hour — short-lived
};

/**
 * Issue a scoped service token for accessing a secret in Infisical.
 *
 * The token is a JWT with:
 *   - type: 'scoped_secret'
 *   - secretPath: the Infisical path to the secret
 *   - scopes: limited permissions (e.g. 'imap:read')
 *   - exp: 1 hour from issuance
 *
 * The token does NOT contain the secret itself — it's a reference
 * that services use to fetch the secret from Infisical at runtime.
 */
export function issueScopedSecretToken(params: {
  userId: string;
  tenantId?: string;
  secretPath: string;
  scopes: string[];
  clientId?: string;
  config?: Partial<ScopedSecretConfig>;
}): ScopedSecretToken {
  const config = { ...DEFAULT_CONFIG, ...params.config };
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    type: 'scoped_secret',
    sub: params.userId,
    userId: params.userId,
    tenantId: params.tenantId,
    secretPath: params.secretPath,
    scopes: params.scopes,
    clientId: params.clientId,
    iat: now,
    exp: now + config.ttlSeconds!,
    iss: config.issuer,
    jti: crypto.randomUUID(),
  };

  const token = jwt.sign(payload, config.secret!, { algorithm: 'HS256' });

  return {
    token,
    secretPath: params.secretPath,
    scopes: params.scopes,
    issuedAt: now,
    expiresAt: now + config.ttlSeconds!,
  };
}

/**
 * Verify a scoped secret token.
 * Throws if expired, signature invalid, or wrong token type.
 */
export function verifyScopedSecretToken(
  token: string,
  secret: string
): {
  userId: string;
  tenantId?: string;
  secretPath: string;
  scopes: string[];
  clientId?: string;
  jti: string;
  exp: number;
} {
  const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as any;
  if (decoded.type !== 'scoped_secret') {
    throw new Error('Token is not a scoped secret token');
  }
  return {
    userId: decoded.userId,
    tenantId: decoded.tenantId,
    secretPath: decoded.secretPath,
    scopes: decoded.scopes || [],
    clientId: decoded.clientId,
    jti: decoded.jti,
    exp: decoded.exp,
  };
}

/**
 * Check if a scoped token has a specific permission.
 */
export function hasScope(tokenScopes: string[], requiredScope: string): boolean {
  // Check for exact match or wildcard (e.g. 'imap:*' matches 'imap:read')
  return tokenScopes.some(s =>
    s === requiredScope ||
    s === '*' ||
    (s.endsWith(':*') && requiredScope.startsWith(s.slice(0, -1)))
  );
}

/**
 * Derive the Infisical secret path for a given service + user.
 *
 * Convention: /users/{email_prefix}/{service_type}
 * Examples:
 *   /users/johndoe/imap        — IMAP app password
 *   /users/johndoe/llm_openai  — OpenAI API key
 *   /users/johndoe/llm_anthropic — Anthropic API key
 */
export function deriveSecretPath(userEmail: string, serviceType: string): string {
  const prefix = userEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  return `/users/${prefix}/${serviceType}`;
}

/**
 * Derive scopes for a given service type.
 */
export function deriveScopes(serviceType: string): string[] {
  switch (serviceType) {
    case 'imap':
      return ['imap:read', 'imap:send'];
    case 'llm_openai':
      return ['llm:infer'];
    case 'llm_anthropic':
      return ['llm:infer'];
    case 'cloud_digitalocean':
      return ['cloud:read', 'cloud:deploy'];
    default:
      return [`${serviceType}:access`];
  }
}
