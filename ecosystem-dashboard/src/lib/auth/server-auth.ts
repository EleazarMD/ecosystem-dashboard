/**
 * Server-side authentication utilities for API routes
 * 
 * This module provides JWT validation and user context for API routes
 * that need to authenticate requests from external services (OpenClaw, mobile apps, etc.)
 */

import jwt from 'jsonwebtoken';
import { Pool } from 'pg';

// Types
export interface UserToken {
  sub: string;              // User ID (UUID)
  exp: number;              // Expiration timestamp
  iat: number;              // Issued at
  email?: string;
  name?: string;
  roles?: string[];
  permissions?: string[];
  tenant_id?: string;
  device_id?: string;
  jti?: string;             // Token ID for revocation
  // Dashboard mobile-login compatibility
  userId?: string;
  platformRole?: string;
}

export interface UserContext {
  userId: string;
  email: string;
  name?: string;
  roles: string[];
  permissions: string[];
  tenantId?: string;
  deviceId?: string;
  tokenId?: string;
  dataDir: string;
  openclawDir: string;
  hermesDir: string;
}

// Errors
export class AuthError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, code: string, statusCode: number = 401) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
const USER_DATA_ROOT = process.env.USER_DATA_ROOT || '/data/users';

/**
 * Sanitize user ID to prevent directory traversal
 */
function sanitizeUserId(userId: string): string {
  if (!userId) {
    throw new AuthError('User ID is required', 'INVALID_TOKEN');
  }
  return userId
    .replace(/\.\./g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 64);
}

/**
 * Validate a JWT token and return user context
 */
export function validateToken(token: string): UserContext {
  if (!token) {
    throw new AuthError('Authentication token is required', 'MISSING_TOKEN');
  }

  if (!JWT_SECRET) {
    throw new AuthError('JWT_SECRET not configured', 'SERVER_ERROR', 500);
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    }) as UserToken;

    // Support both 'sub' (standard) and 'userId' (dashboard mobile-login)
    const userId = decoded.sub || decoded.userId;
    if (!userId) {
      throw new AuthError('Token missing user identifier', 'INVALID_TOKEN');
    }

    const safeUserId = sanitizeUserId(userId);

    // Build roles from either 'roles' array or 'platformRole' string
    let roles = decoded.roles || [];
    if (decoded.platformRole && !roles.includes(decoded.platformRole)) {
      roles = [...roles, decoded.platformRole];
    }
    if (roles.length === 0) {
      roles = ['user'];
    }

    return {
      userId: safeUserId,
      email: decoded.email || '',
      name: decoded.name,
      roles,
      permissions: decoded.permissions || [],
      tenantId: decoded.tenant_id,
      deviceId: decoded.device_id,
      tokenId: decoded.jti,
      dataDir: `${USER_DATA_ROOT}/${safeUserId}`,
      openclawDir: `${USER_DATA_ROOT}/${safeUserId}/openclaw`,
      hermesDir: `${USER_DATA_ROOT}/${safeUserId}/hermes`,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthError('Token has expired', 'EXPIRED_TOKEN');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthError('Invalid token', 'INVALID_TOKEN');
    }
    if (error instanceof AuthError) {
      throw error;
    }
    throw new AuthError('Token validation failed', 'INVALID_TOKEN');
  }
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
}

/**
 * Check if user has a specific role
 */
export function hasRole(user: UserContext, role: string): boolean {
  return user.roles.includes(role) || user.roles.includes('admin');
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(user: UserContext, permission: string): boolean {
  // Admins have all permissions
  if (user.roles.includes('admin')) return true;
  
  // Check explicit permission
  if (user.permissions.includes(permission)) return true;
  
  // Check wildcard permissions
  const [category] = permission.split(':');
  if (user.permissions.includes(`${category}:*`)) return true;
  if (user.permissions.includes('*')) return true;
  
  return false;
}

/**
 * Validate request and return user context
 * For use in API routes
 */
export function authenticateRequest(
  authHeader: string | undefined
): UserContext {
  const token = extractToken(authHeader);
  if (!token) {
    throw new AuthError('Authentication required', 'MISSING_TOKEN');
  }
  return validateToken(token);
}

/**
 * Optional authentication - returns null if no token provided
 */
export function authenticateRequestOptional(
  authHeader: string | undefined
): UserContext | null {
  const token = extractToken(authHeader);
  if (!token) return null;
  
  try {
    return validateToken(token);
  } catch {
    return null;
  }
}

// Database helpers for token revocation
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432', 10),
      database: process.env.DATABASE_NAME || 'ecosystem_unified',
      user: process.env.DATABASE_USER || 'eleazar',
      password: process.env.DATABASE_PASSWORD || '',
    });
  }
  return pool;
}

/**
 * Check if a token has been revoked
 */
export async function isTokenRevoked(tokenId: string): Promise<boolean> {
  if (!tokenId) return false;
  
  try {
    const result = await getPool().query(
      `SELECT 1 FROM revoked_tokens 
       WHERE token_id = $1 AND expires_at > NOW()
       LIMIT 1`,
      [tokenId]
    );
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('[Auth] Failed to check token revocation:', error);
    return false; // Fail open for availability
  }
}

/**
 * Revoke a token
 */
export async function revokeToken(
  tokenId: string,
  userId: string,
  expiresAt: Date,
  reason?: string
): Promise<void> {
  await getPool().query(
    `INSERT INTO revoked_tokens (token_id, user_id, revoked_at, reason, expires_at)
     VALUES ($1, $2, NOW(), $3, $4)
     ON CONFLICT (token_id) DO UPDATE SET
       revoked_at = NOW(),
       reason = EXCLUDED.reason`,
    [tokenId, userId, reason, expiresAt]
  );
}

/**
 * Revoke all tokens for a user (e.g., on password change)
 */
export async function revokeAllUserTokens(
  userId: string,
  reason?: string
): Promise<void> {
  // Mark all active sessions as revoked
  await getPool().query(
    `UPDATE user_sessions 
     SET revoked_at = NOW(), revoke_reason = $2
     WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId, reason || 'All tokens revoked']
  );
}

/**
 * Log a security event
 */
export async function logSecurityEvent(event: {
  eventType: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  userId?: string;
  agentId?: string;
  sessionId?: string;
  action: string;
  resource?: string;
  outcome: 'success' | 'failure' | 'blocked';
  reason?: string;
  metadata?: Record<string, unknown>;
  clientIp?: string;
  userAgent?: string;
}): Promise<void> {
  try {
    await getPool().query(
      `INSERT INTO security_audit_log 
       (event_type, severity, user_id, agent_id, session_id, 
        action, resource, outcome, reason, metadata, client_ip, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        event.eventType,
        event.severity,
        event.userId || null,
        event.agentId || null,
        event.sessionId || null,
        event.action,
        event.resource || null,
        event.outcome,
        event.reason || null,
        event.metadata ? JSON.stringify(event.metadata) : null,
        event.clientIp || null,
        event.userAgent || null,
      ]
    );
  } catch (error) {
    console.error('[Auth] Failed to log security event:', error);
  }
}
