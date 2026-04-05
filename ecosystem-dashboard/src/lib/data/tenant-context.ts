/**
 * Tenant Context Service
 * 
 * Provides utilities for enforcing tenant and user data isolation.
 * All data operations should use these helpers to ensure proper ownership.
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import type { NextApiRequest, NextApiResponse } from 'next';

export interface TenantContext {
  userId: string;
  userEmail: string;
  userName: string;
  tenantId: string | null;
  tenantSlug: string | null;
  isPlatformAdmin: boolean;
  tenants: Array<{
    tenantId: string;
    tenantSlug: string;
    tenantName: string;
    roleId: string;
  }>;
}

/**
 * Get the current tenant context from the session
 * Use this in API routes to get user/tenant info for data isolation
 */
export async function getTenantContext(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<TenantContext | null> {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user) {
    return null;
  }

  const user = session.user as any;
  
  // Get current tenant from header or use default
  const currentTenantId = req.headers['x-tenant-id'] as string || user.defaultTenantId;
  const currentTenant = user.tenants?.find((t: any) => t.tenantId === currentTenantId);

  return {
    userId: user.id,
    userEmail: user.email || '',
    userName: user.name || '',
    tenantId: currentTenant?.tenantId || null,
    tenantSlug: currentTenant?.tenantSlug || null,
    isPlatformAdmin: user.platformRole === 'platform-admin',
    tenants: user.tenants || [],
  };
}

/**
 * Require authenticated tenant context - throws if not authenticated
 */
export async function requireTenantContext(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<TenantContext> {
  const context = await getTenantContext(req, res);
  
  if (!context) {
    res.status(401).json({ error: 'Authentication required' });
    throw new Error('Unauthorized');
  }

  return context;
}

/**
 * Build a WHERE clause for tenant-scoped queries
 * Returns SQL fragment and params array
 */
export function tenantWhereClause(
  context: TenantContext,
  options: {
    tenantColumn?: string;
    userColumn?: string;
    userOnly?: boolean;  // If true, filter by user only (not tenant)
    allowPlatformAdminBypass?: boolean;
  } = {}
): { sql: string; params: any[] } {
  const {
    tenantColumn = 'tenant_id',
    userColumn = 'user_id',
    userOnly = false,
    allowPlatformAdminBypass = false,
  } = options;

  // Platform admins can optionally bypass tenant filtering
  if (allowPlatformAdminBypass && context.isPlatformAdmin) {
    return { sql: '1=1', params: [] };
  }

  if (userOnly) {
    return {
      sql: `${userColumn} = $1`,
      params: [context.userId],
    };
  }

  if (context.tenantId) {
    return {
      sql: `${tenantColumn} = $1`,
      params: [context.tenantId],
    };
  }

  // Fallback to user-only if no tenant
  return {
    sql: `${userColumn} = $1`,
    params: [context.userId],
  };
}

/**
 * Get ownership fields to include when inserting new records
 */
export function ownershipFields(
  context: TenantContext,
  options: {
    includeCreatedBy?: boolean;
    includeUserId?: boolean;
    includeTenantId?: boolean;
  } = {}
): Record<string, any> {
  const {
    includeCreatedBy = true,
    includeUserId = false,
    includeTenantId = true,
  } = options;

  const fields: Record<string, any> = {};

  if (includeCreatedBy) {
    fields.created_by = context.userId;
  }

  if (includeUserId) {
    fields.user_id = context.userId;
  }

  if (includeTenantId && context.tenantId) {
    fields.tenant_id = context.tenantId;
  }

  return fields;
}

/**
 * Verify user has access to a specific tenant
 */
export function hasAccessToTenant(context: TenantContext, tenantId: string): boolean {
  if (context.isPlatformAdmin) return true;
  return context.tenants.some(t => t.tenantId === tenantId);
}

/**
 * Verify user has admin access to a specific tenant
 */
export function isTenantAdmin(context: TenantContext, tenantId: string): boolean {
  if (context.isPlatformAdmin) return true;
  const tenant = context.tenants.find(t => t.tenantId === tenantId);
  return tenant?.roleId === 'tenant-admin';
}

/**
 * Middleware helper to require tenant context
 * Use in API routes: const ctx = await withTenantContext(req, res); if (!ctx) return;
 */
export async function withTenantContext(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<TenantContext | null> {
  try {
    return await requireTenantContext(req, res);
  } catch {
    return null;
  }
}
