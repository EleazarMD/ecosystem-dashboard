/**
 * Auth Middleware for Multi-Tenant Platform
 * 
 * Provides authentication and authorization helpers for API routes.
 * Handles tenant context, permission checks, and user sessions.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { User, Tenant, Permission, hasPermission, SYSTEM_ROLES } from './tenant-types';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

// ============================================================
// Types
// ============================================================

export interface AuthContext {
  user: User;
  tenant?: Tenant;
  tenantId?: string;
  isPlatformAdmin: boolean;
  isTenantAdmin: boolean;
}

export type ProtectedApiHandler = (
  req: NextApiRequest,
  res: NextApiResponse,
  ctx: AuthContext
) => Promise<void> | void;

// ============================================================
// User Session Helpers
// ============================================================

/**
 * Get current user from request headers or session
 * Identity routing must use stable user ID, not email
 */
export async function getCurrentUser(req: NextApiRequest): Promise<User | null> {
  // Check for user ID in header (for development/testing)
  const userId = req.headers['x-user-id'] as string;
  const userEmail = req.headers['x-user-email'] as string;

  if (!userId) {
    if (userEmail) {
      console.warn('[Auth] X-User-Email provided without X-User-Id; refusing email-based identity');
    }
    return null;
  }

  return getUserById(userId);
}

export async function getUserById(userId: string): Promise<User | null> {
  try {
    const result = await pool.query(
      `SELECT u.*, 
        COALESCE(
          json_agg(
            json_build_object(
              'tenantId', tm.tenant_id,
              'tenantSlug', t.slug,
              'tenantName', t.name,
              'roleId', tm.role_id,
              'roleName', r.name,
              'joinedAt', tm.joined_at
            )
          ) FILTER (WHERE tm.id IS NOT NULL),
          '[]'
        ) as tenants
       FROM users u
       LEFT JOIN tenant_memberships tm ON u.id = tm.user_id
       LEFT JOIN tenants t ON tm.tenant_id = t.id
       LEFT JOIN roles r ON tm.role_id = r.id
       WHERE u.id = $1
       GROUP BY u.id`,
      [userId]
    );
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      avatarUrl: row.avatar_url,
      status: row.status,
      platformRole: row.platform_role,
      tenants: row.tenants,
      preferences: row.preferences || {},
      lastLoginAt: row.last_login_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    console.error('[Auth] Error fetching user:', error);
    return null;
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const result = await pool.query(
      `SELECT u.*, 
        COALESCE(
          json_agg(
            json_build_object(
              'tenantId', tm.tenant_id,
              'tenantSlug', t.slug,
              'tenantName', t.name,
              'roleId', tm.role_id,
              'roleName', r.name,
              'joinedAt', tm.joined_at
            )
          ) FILTER (WHERE tm.id IS NOT NULL),
          '[]'
        ) as tenants
       FROM users u
       LEFT JOIN tenant_memberships tm ON u.id = tm.user_id
       LEFT JOIN tenants t ON tm.tenant_id = t.id
       LEFT JOIN roles r ON tm.role_id = r.id
       WHERE u.email = $1
       GROUP BY u.id`,
      [email]
    );
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      avatarUrl: row.avatar_url,
      status: row.status,
      platformRole: row.platform_role,
      tenants: row.tenants,
      preferences: row.preferences || {},
      lastLoginAt: row.last_login_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    console.error('[Auth] Error fetching user by email:', error);
    return null;
  }
}

// ============================================================
// Tenant Helpers
// ============================================================

export async function getTenantById(tenantId: string): Promise<Tenant | null> {
  try {
    const result = await pool.query(
      `SELECT * FROM tenants WHERE id = $1`,
      [tenantId]
    );
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      status: row.status,
      tier: row.tier,
      ownerId: row.owner_id,
      ownerEmail: row.owner_email,
      limits: row.limits,
      usage: row.usage,
      config: row.config,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastActiveAt: row.last_active_at,
    };
  } catch (error) {
    console.error('[Auth] Error fetching tenant:', error);
    return null;
  }
}

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  try {
    const result = await pool.query(
      `SELECT * FROM tenants WHERE slug = $1`,
      [slug]
    );
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      status: row.status,
      tier: row.tier,
      ownerId: row.owner_id,
      ownerEmail: row.owner_email,
      limits: row.limits,
      usage: row.usage,
      config: row.config,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastActiveAt: row.last_active_at,
    };
  } catch (error) {
    console.error('[Auth] Error fetching tenant by slug:', error);
    return null;
  }
}

// ============================================================
// Auth Middleware
// ============================================================

/**
 * Protect an API route with authentication
 */
export function withAuth(handler: ProtectedApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const user = await getCurrentUser(req);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }
    
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'User account is not active',
      });
    }
    
    // Get tenant context from header or query
    const tenantId = (req.headers['x-tenant-id'] as string) || (req.query.tenantId as string);
    let tenant: Tenant | undefined;
    
    if (tenantId) {
      tenant = await getTenantById(tenantId) || undefined;
    }
    
    const ctx: AuthContext = {
      user,
      tenant,
      tenantId,
      isPlatformAdmin: user.platformRole === 'platform-admin',
      isTenantAdmin: tenant ? user.tenants.some(
        t => t.tenantId === tenant!.id && t.roleId === 'tenant-admin'
      ) : false,
    };
    
    return handler(req, res, ctx);
  };
}

/**
 * Require platform admin role
 */
export function withPlatformAdmin(handler: ProtectedApiHandler) {
  return withAuth(async (req, res, ctx) => {
    if (!ctx.isPlatformAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Platform administrator access required',
      });
    }
    
    return handler(req, res, ctx);
  });
}

/**
 * Require tenant admin role (or platform admin)
 */
export function withTenantAdmin(handler: ProtectedApiHandler) {
  return withAuth(async (req, res, ctx) => {
    if (!ctx.isPlatformAdmin && !ctx.isTenantAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Tenant administrator access required',
      });
    }
    
    return handler(req, res, ctx);
  });
}

/**
 * Require specific permission
 */
export function withPermission(permission: Permission) {
  return (handler: ProtectedApiHandler) => {
    return withAuth(async (req, res, ctx) => {
      if (!hasPermission(ctx.user, permission, ctx.tenantId)) {
        return res.status(403).json({
          success: false,
          error: `Missing permission: ${permission}`,
        });
      }
      
      return handler(req, res, ctx);
    });
  };
}

/**
 * Require tenant context
 */
export function withTenant(handler: ProtectedApiHandler) {
  return withAuth(async (req, res, ctx) => {
    if (!ctx.tenant) {
      return res.status(400).json({
        success: false,
        error: 'Tenant context required (provide x-tenant-id header or tenantId query param)',
      });
    }
    
    // Check user has access to this tenant
    const hasTenantAccess = ctx.isPlatformAdmin || 
      ctx.user.tenants.some(t => t.tenantId === ctx.tenant!.id);
    
    if (!hasTenantAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this tenant',
      });
    }
    
    return handler(req, res, ctx);
  });
}

// ============================================================
// Audit Logging
// ============================================================

export async function logAudit(
  action: string,
  ctx: AuthContext,
  details?: Record<string, any>,
  resourceType?: string,
  resourceId?: string
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO audit_log (tenant_id, user_id, action, resource_type, resource_id, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        ctx.tenantId || null,
        ctx.user.id,
        action,
        resourceType || null,
        resourceId || null,
        details ? JSON.stringify(details) : null,
      ]
    );
  } catch (error) {
    console.error('[Audit] Failed to log:', error);
  }
}
