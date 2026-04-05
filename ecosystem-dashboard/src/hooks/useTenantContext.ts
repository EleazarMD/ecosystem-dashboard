/**
 * Tenant Context Hook
 * 
 * Client-side hook for accessing current user and tenant context.
 * Use this in components to get ownership info for data operations.
 */

import { useAuth } from '@/context/AuthContext';
import { useMemo } from 'react';

export interface ClientTenantContext {
  userId: string | undefined;
  userEmail: string | undefined;
  userName: string | undefined;
  tenantId: string | null;
  tenantSlug: string | null;
  tenantName: string | null;
  isPlatformAdmin: boolean;
  isTenantAdmin: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  tenants: Array<{
    tenantId: string;
    tenantSlug: string;
    tenantName: string;
    roleId: string;
  }>;
}

/**
 * Hook to get current tenant context for data operations
 */
export function useTenantContext(): ClientTenantContext {
  const { user, isAuthenticated, isLoading, currentTenantId, isPlatformAdmin } = useAuth();

  return useMemo(() => {
    const currentTenant = user?.tenants?.find(t => t.tenantId === currentTenantId);
    const isTenantAdmin = currentTenant?.roleId === 'tenant-admin' || isPlatformAdmin;

    return {
      userId: user?.id,
      userEmail: user?.email,
      userName: user?.name,
      tenantId: currentTenantId,
      tenantSlug: currentTenant?.tenantSlug || null,
      tenantName: currentTenant?.tenantName || null,
      isPlatformAdmin,
      isTenantAdmin,
      isAuthenticated,
      isLoading,
      tenants: user?.tenants || [],
    };
  }, [user, isAuthenticated, isLoading, currentTenantId, isPlatformAdmin]);
}

/**
 * Get headers to include tenant context in API requests
 */
export function useTenantHeaders(): Record<string, string> {
  const { tenantId } = useTenantContext();
  
  return useMemo(() => {
    const headers: Record<string, string> = {};
    if (tenantId) {
      headers['X-Tenant-Id'] = tenantId;
    }
    return headers;
  }, [tenantId]);
}

/**
 * Create a fetch wrapper that includes tenant context
 */
export function useTenantFetch() {
  const tenantHeaders = useTenantHeaders();

  return useMemo(() => {
    return async (url: string, options: RequestInit = {}) => {
      const headers = {
        ...tenantHeaders,
        ...options.headers,
      };

      return fetch(url, {
        ...options,
        headers,
      });
    };
  }, [tenantHeaders]);
}
