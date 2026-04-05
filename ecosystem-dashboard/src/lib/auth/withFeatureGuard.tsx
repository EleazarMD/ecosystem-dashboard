/**
 * withFeatureGuard — Zero-Tolerance Page-Level Route Guard
 *
 * Enforces feature access at the page level. If a user navigates directly
 * to a URL they don't have access to (bypassing the nav filter), this HOC
 * blocks rendering and shows an access-denied screen or redirects.
 *
 * Architecture: Just-In-Time (JIT) verification — access is checked on
 * every render, not cached. If an admin revokes a feature mid-session,
 * the user is blocked immediately on next navigation.
 *
 * Usage:
 *   export default withFeatureGuard(MyPage, 'ai-research');
 *   export default withFeatureGuard(AdminPage, 'admin-panel', { requirePlatformAdmin: true });
 */

import React, { ComponentType } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import {
  Box,
  VStack,
  Text,
  Button,
  Badge,
  HStack,
  Icon,
  Spinner,
  Center,
} from '@chakra-ui/react';
import { ShieldExclamationIcon, LockClosedIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import type { FeatureFlag, UserFeatureAccess, SubscriptionTier } from '@/lib/subscription-tiers';
import { hasFeatureAccess, SUBSCRIPTION_TIERS, getDefaultFeatureAccess } from '@/lib/subscription-tiers';

export interface FeatureGuardOptions {
  requirePlatformAdmin?: boolean;
  requireTenantAdmin?: boolean;
  redirectTo?: string;
  showAccessDenied?: boolean;
}

function AccessDeniedPage({
  feature,
  options,
  userTier,
}: {
  feature: FeatureFlag;
  options: FeatureGuardOptions;
  userTier: string;
}) {
  const router = useRouter();
  const bgColor = useSemanticToken('surface.base');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');

  const isAdminGate = options.requirePlatformAdmin || options.requireTenantAdmin;
  const requiredRole = options.requirePlatformAdmin ? 'Platform Admin' : options.requireTenantAdmin ? 'Tenant Admin' : null;

  // Find which tiers include this feature
  const availableTiers = Object.values(SUBSCRIPTION_TIERS).filter(
    t => t.features.includes(feature)
  ).map(t => t.name);

  return (
    <DashboardLayout>
      <Center minH="60vh">
        <Box
          maxW="md"
          w="full"
          p={8}
          borderRadius="xl"
          border="1px solid"
          borderColor={borderColor}
          bg={bgColor}
          textAlign="center"
        >
          <VStack spacing={5}>
            <Box
              p={4}
              borderRadius="full"
              bg={isAdminGate ? 'red.500' : 'orange.500'}
              opacity={0.9}
            >
              <Icon
                as={isAdminGate ? ShieldExclamationIcon : LockClosedIcon}
                boxSize={10}
                color="white"
              />
            </Box>

            <VStack spacing={1}>
              <Text fontSize="xl" fontWeight="bold" color={textColor}>
                {isAdminGate ? 'Restricted Area' : 'Feature Not Available'}
              </Text>
              <Text fontSize="sm" color={mutedColor}>
                {isAdminGate
                  ? `This page requires ${requiredRole} privileges.`
                  : `Your current plan (${userTier}) does not include this feature.`}
              </Text>
            </VStack>

            {!isAdminGate && availableTiers.length > 0 && (
              <VStack spacing={2}>
                <Text fontSize="xs" color={mutedColor}>Available on:</Text>
                <HStack spacing={2} flexWrap="wrap" justify="center">
                  {availableTiers.map(tier => (
                    <Badge key={tier} colorScheme="purple" fontSize="xs">{tier}</Badge>
                  ))}
                </HStack>
              </VStack>
            )}

            <Badge
              colorScheme="gray"
              fontSize="xs"
              px={3}
              py={1}
            >
              Feature: {feature}
            </Badge>

            <HStack spacing={3} pt={2}>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Icon as={ArrowLeftIcon} boxSize={4} />}
                onClick={() => router.back()}
              >
                Go Back
              </Button>
              <Button
                size="sm"
                colorScheme="purple"
                onClick={() => router.push('/dashboard')}
              >
                Dashboard
              </Button>
            </HStack>
          </VStack>
        </Box>
      </Center>
    </DashboardLayout>
  );
}

export function withFeatureGuard<P extends object>(
  WrappedComponent: ComponentType<P>,
  requiredFeature: FeatureFlag,
  options: FeatureGuardOptions = {}
): ComponentType<P> {
  const GuardedComponent = (props: P) => {
    const { data: session, status } = useSession();
    const router = useRouter();

    // Still loading auth — show spinner, don't flash content
    if (status === 'loading') {
      return (
        <DashboardLayout>
          <Center minH="60vh">
            <Spinner size="lg" color="purple.500" />
          </Center>
        </DashboardLayout>
      );
    }

    // Not authenticated — redirect to sign-in
    if (status === 'unauthenticated' || !session?.user) {
      if (typeof window !== 'undefined') {
        router.replace(`/auth/signin?callbackUrl=${encodeURIComponent(router.asPath)}`);
      }
      return (
        <DashboardLayout>
          <Center minH="60vh">
            <Spinner size="lg" color="purple.500" />
          </Center>
        </DashboardLayout>
      );
    }

    // Extract user data from session
    const user = session.user as any;
    const isPlatformAdmin = user.platformRole === 'platform-admin';
    const subscriptionTier: SubscriptionTier = isPlatformAdmin ? 'admin' : (user.subscriptionTier || 'free');

    // Platform admin check (zero-tolerance — no bypass)
    if (options.requirePlatformAdmin && !isPlatformAdmin) {
      if (options.redirectTo) {
        router.replace(options.redirectTo);
        return null;
      }
      return (
        <AccessDeniedPage
          feature={requiredFeature}
          options={options}
          userTier={subscriptionTier}
        />
      );
    }

    // Tenant admin check
    if (options.requireTenantAdmin) {
      const currentTenantId = typeof window !== 'undefined'
        ? localStorage.getItem('currentTenantId') || user.defaultTenantId
        : user.defaultTenantId;
      const currentTenant = user.tenants?.find((t: any) => t.tenantId === currentTenantId);
      const isTenantAdmin = isPlatformAdmin || currentTenant?.roleId === 'tenant-admin';

      if (!isTenantAdmin) {
        if (options.redirectTo) {
          router.replace(options.redirectTo);
          return null;
        }
        return (
          <AccessDeniedPage
            feature={requiredFeature}
            options={options}
            userTier={subscriptionTier}
          />
        );
      }
    }

    // Platform admins bypass feature checks (zero-tolerance: admin always has access)
    if (isPlatformAdmin) {
      return <WrappedComponent {...props} />;
    }

    // Feature access check (JIT — evaluated every render)
    const featureAccess: UserFeatureAccess = {
      userId: user.id || 'unknown',
      subscriptionTier,
      purchasedAddOns: user.purchasedAddOns || [],
      adminGrantedFeatures: user.grantedFeatures || [],
      adminRevokedFeatures: user.revokedFeatures || [],
      extraChildSlots: user.extraChildSlots || 0,
      customLimits: user.customLimits,
    };

    if (!hasFeatureAccess(featureAccess, requiredFeature)) {
      if (options.redirectTo) {
        router.replace(options.redirectTo);
        return null;
      }
      return (
        <AccessDeniedPage
          feature={requiredFeature}
          options={options}
          userTier={subscriptionTier}
        />
      );
    }

    // Access granted — render the page
    return <WrappedComponent {...props} />;
  };

  GuardedComponent.displayName = `withFeatureGuard(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return GuardedComponent;
}
