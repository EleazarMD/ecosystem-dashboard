/**
 * Unified Auth Token Schema
 * ============================================================================
 * Shared JWT payload contract for all homelab services and clients.
 *
 * Every auth token — whether issued by NextAuth, mobile-login, CIG, or a
 * service-to-service call — MUST include these fields so that any backend
 * service can identify the user, tenant, client platform, and subscription
 * tier without making additional DB queries.
 *
 * This file is the single source of truth. Python services consume the
 * same schema via `services/cig/unified_token.py` (auto-generated mirror).
 *
 * Token Types:
 *   - access: Short-lived (1h) token for API calls
 *   - refresh: Long-lived (30d) token used to obtain new access tokens
 *   - service: Service-to-service token (no user context, has service_id)
 */

// ============================================================================
// Client Types & Platforms
// ============================================================================

export type ClientType =
  | 'ios'         // Hyperspace iOS app
  | 'dashboard'   // Ecosystem Dashboard (Next.js web)
  | 'atlas'       // Atlas IDE (VS Code / PiCode extension)
  | 'cli'         // Command-line tool
  | 'service'     // Backend service (service-to-service)
  | 'android'     // Android app (future)
  | 'macos'       // macOS app (future)
  | 'unknown';

export type Platform =
  | 'ios'
  | 'android'
  | 'web'
  | 'macos'
  | 'linux'
  | 'windows'
  | 'service';

export type AuthMethod =
  | 'jwt'              // Standard JWT Bearer
  | 'nextauth-session' // NextAuth session cookie (JWE)
  | 'api-key'          // X-API-Key header
  | 'mobile-header'    // X-Client + X-User-ID trusted headers
  | 'device-pairing';  // OpenClaw device pairing

export type TokenType = 'access' | 'refresh' | 'service';

// ============================================================================
// Unified Token Payload
// ============================================================================

/**
 * The canonical JWT payload for all homelab services.
 *
 * Fields are grouped:
 *   - Identity: sub, userId, email, name
 *   - Tenant: tenantId, tenantSlug, tenantRole
 *   - Subscription: subscriptionTier, features
 *   - Client: clientType, platform, clientId, authMethod
 *   - Token: type, iat, exp, iss, jti
 */
export interface UnifiedTokenPayload {
  // --- Identity ---
  sub: string;           // User UUID (same as userId, JWT standard)
  userId: string;        // User UUID (redundant for safety)
  email: string;
  name: string;
  platformRole?: string; // 'platform-admin' | 'user' | 'child'
  accountType?: string;  // 'admin' | 'standard' | 'child'

  // --- Tenant ---
  tenantId?: string;     // Active tenant UUID
  tenantSlug?: string;   // Tenant slug for routing
  tenantRole?: string;   // 'tenant-admin' | 'tenant-member' | 'child-user'

  // --- Subscription ---
  subscriptionTier?: string; // 'free' | 'basic' | 'pro' | 'family' | 'enterprise' | 'admin'
  features?: string[];       // Resolved feature flags for this user

  // --- Client ---
  clientType: ClientType;    // What kind of client is making the request
  platform: Platform;        // What OS/runtime the client runs on
  clientId?: string;         // Stable client identifier (bundle ID, hostname, service name)
  authMethod: AuthMethod;    // How the token was obtained

  // --- Token metadata ---
  type: TokenType;           // 'access' | 'refresh' | 'service'
  iat: number;               // Issued at (unix timestamp)
  exp: number;               // Expiry (unix timestamp)
  iss: string;               // Issuer (e.g. 'ecosystem-dashboard', 'mobile-login', 'cig')
  jti?: string;              // Unique token ID (for revocation)

  // --- Service-to-service only ---
  serviceId?: string;        // Service name (e.g. 'cig', 'nova-agent') when type='service'
  scopes?: string[];         // Permission scopes for service tokens
}

// ============================================================================
// Token Issuer Config
// ============================================================================

export interface TokenIssuerConfig {
  issuer: string;
  secret: string;       // HS256 signing secret
  accessTokenTTL: number;  // seconds (default: 3600 = 1h)
  refreshTokenTTL: number; // seconds (default: 2592000 = 30d)
}

export const DEFAULT_ISSUER_CONFIG: Partial<TokenIssuerConfig> = {
  issuer: 'ecosystem-dashboard',
  accessTokenTTL: 3600,
  refreshTokenTTL: 30 * 24 * 60 * 60,
};

// ============================================================================
// Token Builder
// ============================================================================

import jwt from 'jsonwebtoken';

/**
 * Issue a unified access token.
 * Uses HS256 with the shared NEXTAUTH_SECRET (or CIG_JWT_SECRET).
 */
export function issueAccessToken(
  payload: Omit<UnifiedTokenPayload, 'type' | 'iat' | 'exp' | 'iss'>,
  config: TokenIssuerConfig
): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: UnifiedTokenPayload = {
    ...payload,
    type: 'access',
    iat: now,
    exp: now + config.accessTokenTTL,
    iss: config.issuer,
    jti: crypto.randomUUID(),
  };
  return jwt.sign(fullPayload as any, config.secret, { algorithm: 'HS256' });
}

/**
 * Issue a unified refresh token.
 */
export function issueRefreshToken(
  payload: Omit<UnifiedTokenPayload, 'type' | 'iat' | 'exp' | 'iss'>,
  config: TokenIssuerConfig
): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: UnifiedTokenPayload = {
    ...payload,
    type: 'refresh',
    iat: now,
    exp: now + config.refreshTokenTTL,
    iss: config.issuer,
    jti: crypto.randomUUID(),
  };
  return jwt.sign(fullPayload as any, config.secret, { algorithm: 'HS256' });
}

/**
 * Verify and decode a unified token.
 * Throws if expired or signature invalid.
 */
export function verifyToken(token: string, secret: string): UnifiedTokenPayload {
  const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as any;
  return decoded as UnifiedTokenPayload;
}

/**
 * Revocation check callback — returns true if the jti is revoked.
 * Implementations query the `revoked_tokens` table (or Redis set).
 */
export type RevocationChecker = (jti: string) => Promise<boolean>;

/**
 * Verify and decode a unified token, then check the revocation deny-list.
 * Throws if expired, signature invalid, or jti is revoked.
 */
export async function verifyTokenWithRevocation(
  token: string,
  secret: string,
  isRevoked: RevocationChecker
): Promise<UnifiedTokenPayload> {
  const payload = verifyToken(token, secret);
  if (payload.jti && await isRevoked(payload.jti)) {
    throw new TokenRevokedError(payload.jti);
  }
  return payload;
}

/**
 * Error thrown when a token's jti is on the revocation deny-list.
 */
export class TokenRevokedError extends Error {
  jti: string;
  constructor(jti: string) {
    super('Token has been revoked');
    this.name = 'TokenRevokedError';
    this.jti = jti;
  }
}

/**
 * Decode a token without verification (for inspection/logging).
 */
export function decodeToken(token: string): UnifiedTokenPayload | null {
  try {
    return jwt.decode(token) as UnifiedTokenPayload;
  } catch {
    return null;
  }
}

// ============================================================================
// Auth Context (derived from token)
// ============================================================================

/**
 * Resolved auth context that backend services work with.
 * This is what middleware/dependencies produce after verifying the token.
 */
export interface UnifiedAuthContext {
  userId: string;
  email: string;
  name: string;
  platformRole?: string;
  accountType?: string;
  tenantId?: string;
  tenantSlug?: string;
  tenantRole?: string;
  subscriptionTier?: string;
  features?: string[];
  clientType: ClientType;
  platform: Platform;
  clientId?: string;
  authMethod: AuthMethod;
  tokenType: TokenType;
  issuer: string;
}

/**
 * Convert a verified token payload into an AuthContext.
 */
export function payloadToContext(payload: UnifiedTokenPayload): UnifiedAuthContext {
  return {
    userId: payload.userId,
    email: payload.email,
    name: payload.name,
    platformRole: payload.platformRole,
    accountType: payload.accountType,
    tenantId: payload.tenantId,
    tenantSlug: payload.tenantSlug,
    tenantRole: payload.tenantRole,
    subscriptionTier: payload.subscriptionTier,
    features: payload.features,
    clientType: payload.clientType,
    platform: payload.platform,
    clientId: payload.clientId,
    authMethod: payload.authMethod,
    tokenType: payload.type,
    issuer: payload.iss,
  };
}

// ============================================================================
// Feature Access Check
// ============================================================================

/**
 * Check if the auth context has a specific feature flag.
 */
export function hasFeature(ctx: UnifiedAuthContext, feature: string): boolean {
  if (!ctx.features) return false;
  return ctx.features.includes(feature);
}

/**
 * Check if the auth context has any of the specified features.
 */
export function hasAnyFeature(ctx: UnifiedAuthContext, features: string[]): boolean {
  if (!ctx.features) return false;
  return features.some(f => ctx.features!.includes(f));
}

/**
 * Check if the auth context is from a specific client type.
 */
export function isClientType(ctx: UnifiedAuthContext, ...types: ClientType[]): boolean {
  return types.includes(ctx.clientType);
}

/**
 * Check if the auth context is a service-to-service call.
 */
export function isServiceCall(ctx: UnifiedAuthContext): boolean {
  return ctx.clientType === 'service' || ctx.tokenType === 'service';
}

/**
 * Check if the auth context is from a mobile client (iOS, Android, macOS).
 */
export function isMobileClient(ctx: UnifiedAuthContext): boolean {
  return ctx.clientType === 'ios' || ctx.clientType === 'android' || ctx.clientType === 'macos';
}
