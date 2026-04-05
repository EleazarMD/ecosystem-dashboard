/**
 * Auth HOC and Middleware
 * 
 * Higher-order components for protecting pages and API routes.
 */

import React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Box, Spinner, Center, Text, VStack } from '@chakra-ui/react';

interface WithAuthOptions {
  requireAuth?: boolean;
  requirePlatformAdmin?: boolean;
  requireTenantAdmin?: boolean;
  blockChildAccounts?: boolean;
  redirectTo?: string;
}

/**
 * HOC to protect pages with authentication
 */
export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: WithAuthOptions = {}
) {
  const {
    requireAuth = true,
    requirePlatformAdmin = false,
    requireTenantAdmin = false,
    blockChildAccounts = false,
    redirectTo = '/auth/signin',
  } = options;

  return function AuthenticatedComponent(props: P) {
    const { data: session, status } = useSession();
    const router = useRouter();

    // Loading state
    if (status === 'loading') {
      return (
        <Center h="100vh">
          <VStack spacing={4}>
            <Spinner size="xl" color="blue.500" />
            <Text color="gray.500">Loading...</Text>
          </VStack>
        </Center>
      );
    }

    // Not authenticated
    if (requireAuth && !session) {
      if (typeof window !== 'undefined') {
        router.push(`${redirectTo}?callbackUrl=${encodeURIComponent(router.asPath)}`);
      }
      return (
        <Center h="100vh">
          <Text>Redirecting to sign in...</Text>
        </Center>
      );
    }

    // Block child accounts from non-child pages
    if (blockChildAccounts && session?.user) {
      const user = session.user as any;
      if (user.accountType === 'child') {
        if (typeof window !== 'undefined') {
          router.push('/child/home');
        }
        return (
          <Center h="100vh">
            <Text>Redirecting to your dashboard...</Text>
          </Center>
        );
      }
    }

    // Check platform admin
    if (requirePlatformAdmin && session?.user) {
      const user = session.user as any;
      if (user.platformRole !== 'platform-admin') {
        return (
          <Center h="100vh">
            <VStack spacing={4}>
              <Text fontSize="xl" fontWeight="bold">Access Denied</Text>
              <Text color="gray.500">Platform administrator access required</Text>
            </VStack>
          </Center>
        );
      }
    }

    // Check tenant admin
    if (requireTenantAdmin && session?.user) {
      const user = session.user as any;
      const isPlatformAdmin = user.platformRole === 'platform-admin';
      const isTenantAdmin = user.tenants?.some((t: any) => t.roleId === 'tenant-admin');
      
      if (!isPlatformAdmin && !isTenantAdmin) {
        return (
          <Center h="100vh">
            <VStack spacing={4}>
              <Text fontSize="xl" fontWeight="bold">Access Denied</Text>
              <Text color="gray.500">Tenant administrator access required</Text>
            </VStack>
          </Center>
        );
      }
    }

    return <WrappedComponent {...props} />;
  };
}

/**
 * Component to conditionally render based on auth state
 */
export function AuthGuard({
  children,
  fallback,
  requireAuth = true,
  requirePlatformAdmin = false,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
  requirePlatformAdmin?: boolean;
}) {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return fallback || <Spinner />;
  }

  if (requireAuth && !session) {
    return fallback || null;
  }

  if (requirePlatformAdmin && session?.user) {
    const user = session.user as any;
    if (user.platformRole !== 'platform-admin') {
      return fallback || null;
    }
  }

  return <>{children}</>;
}

/**
 * Convenience HOC for platform admin pages (blocks child accounts)
 */
export function withPlatformAdmin<P extends object>(WrappedComponent: React.ComponentType<P>) {
  return withAuth(WrappedComponent, { requirePlatformAdmin: true, blockChildAccounts: true });
}

/**
 * Convenience HOC for tenant admin pages (blocks child accounts)
 */
export function withTenantAdmin<P extends object>(WrappedComponent: React.ComponentType<P>) {
  return withAuth(WrappedComponent, { requireTenantAdmin: true, blockChildAccounts: true });
}

/**
 * Convenience HOC for family/parent admin pages (blocks child accounts)
 */
export function withFamilyAdmin<P extends object>(WrappedComponent: React.ComponentType<P>) {
  return withAuth(WrappedComponent, { blockChildAccounts: true });
}
