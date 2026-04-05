/**
 * Auth Hook
 * 
 * Provides authentication state and helpers for components.
 * Wraps NextAuth's useSession with tenant-aware functionality.
 */

import { useSession, signIn, signOut } from 'next-auth/react';
import { useCallback, useMemo } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  image?: string;
  platformRole?: string;
  tenants: Array<{
    tenantId: string;
    tenantSlug: string;
    tenantName: string;
    roleId: string;
  }>;
  defaultTenantId?: string;
}

export interface UseAuthResult {
  // State
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Current tenant context
  currentTenantId: string | null;
  currentTenant: AuthUser['tenants'][0] | null;
  
  // Permissions
  isPlatformAdmin: boolean;
  isTenantAdmin: boolean;
  hasPermission: (permission: string) => boolean;
  
  // Actions
  signIn: typeof signIn;
  signOut: typeof signOut;
  switchTenant: (tenantId: string) => void;
}

// Permission mappings by role
const ROLE_PERMISSIONS: Record<string, string[]> = {
  'platform-admin': ['*'],
  'tenant-admin': [
    'tenant:manage',
    'tenant:users:invite',
    'tenant:users:remove',
    'tenant:config:view',
    'tenant:config:edit',
    'tenant:agents:manage',
    'feature:workspace:use',
    'feature:agents:use',
    'feature:voice:use',
    'data:read',
    'data:write',
    'data:delete',
  ],
  'tenant-member': [
    'tenant:config:view',
    'feature:workspace:use',
    'feature:agents:use',
    'feature:voice:use',
    'data:read',
    'data:write',
  ],
  'tenant-viewer': [
    'tenant:config:view',
    'feature:workspace:use',
    'data:read',
  ],
};

export function useAuth(): UseAuthResult {
  const { data: session, status } = useSession();
  
  const user = useMemo<AuthUser | null>(() => {
    if (!session?.user) return null;
    return session.user as AuthUser;
  }, [session]);
  
  const isAuthenticated = status === 'authenticated' && !!user;
  const isLoading = status === 'loading';
  
  // Get current tenant from localStorage or default
  const currentTenantId = useMemo(() => {
    if (typeof window === 'undefined') return user?.defaultTenantId || null;
    
    const stored = localStorage.getItem('currentTenantId');
    if (stored && user?.tenants.some(t => t.tenantId === stored)) {
      return stored;
    }
    return user?.defaultTenantId || null;
  }, [user]);
  
  const currentTenant = useMemo(() => {
    if (!user || !currentTenantId) return null;
    return user.tenants.find(t => t.tenantId === currentTenantId) || null;
  }, [user, currentTenantId]);
  
  const isPlatformAdmin = user?.platformRole === 'platform-admin';
  
  const isTenantAdmin = useMemo(() => {
    if (isPlatformAdmin) return true;
    return currentTenant?.roleId === 'tenant-admin';
  }, [isPlatformAdmin, currentTenant]);
  
  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    if (isPlatformAdmin) return true;
    
    const roleId = currentTenant?.roleId;
    if (!roleId) return false;
    
    const permissions = ROLE_PERMISSIONS[roleId] || [];
    return permissions.includes('*') || permissions.includes(permission);
  }, [user, isPlatformAdmin, currentTenant]);
  
  const switchTenant = useCallback((tenantId: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentTenantId', tenantId);
      // Trigger re-render by reloading
      window.location.reload();
    }
  }, []);
  
  return {
    user,
    isAuthenticated,
    isLoading,
    currentTenantId,
    currentTenant,
    isPlatformAdmin,
    isTenantAdmin,
    hasPermission,
    signIn,
    signOut,
    switchTenant,
  };
}

/**
 * Hook to require authentication
 * Redirects to sign-in if not authenticated
 */
export function useRequireAuth(redirectTo = '/auth/signin') {
  const auth = useAuth();
  
  if (typeof window !== 'undefined' && !auth.isLoading && !auth.isAuthenticated) {
    window.location.href = `${redirectTo}?callbackUrl=${encodeURIComponent(window.location.href)}`;
  }
  
  return auth;
}

/**
 * Hook to require platform admin role
 */
export function useRequirePlatformAdmin(redirectTo = '/') {
  const auth = useRequireAuth();
  
  if (typeof window !== 'undefined' && !auth.isLoading && auth.isAuthenticated && !auth.isPlatformAdmin) {
    window.location.href = redirectTo;
  }
  
  return auth;
}
