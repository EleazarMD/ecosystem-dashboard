/**
 * Security Dashboard Layout
 * 
 * Provides a secondary left sidebar for security-specific navigation
 * while maintaining the main dashboard layout structure.
 * Pattern follows ChildDashboardLayout for consistency.
 */

import React, { ReactNode } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Badge,
  Heading,
  Button,
  useBreakpointValue,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerBody,
  DrawerHeader,
  useDisclosure,
  IconButton,
} from '@chakra-ui/react';
import { HamburgerIcon } from '@chakra-ui/icons';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from './DashboardLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  ShieldCheckIcon,
  ClipboardDocumentCheckIcon,
  DocumentTextIcon,
  CogIcon,
  HeartIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

interface SecurityLayoutProps {
  children: ReactNode;
  pageTitle?: string;
  pageDescription?: string;
}

interface SecurityNavItem {
  label: string;
  path: string;
  icon: React.ComponentType<any>;
  badge?: string;
  badgeColor?: string;
}

const securityNavItems: SecurityNavItem[] = [
  { 
    label: 'Dashboard', 
    path: '/security', 
    icon: ShieldCheckIcon,
    badge: 'Live',
    badgeColor: 'green',
  },
  { 
    label: 'Approvals', 
    path: '/security/approvals', 
    icon: ClipboardDocumentCheckIcon,
    badge: 'HITL',
    badgeColor: 'blue',
  },
  { 
    label: 'Audit Log', 
    path: '/security/audit-log', 
    icon: DocumentTextIcon,
  },
  { 
    label: 'Anomalies', 
    path: '/security/anomalies', 
    icon: ExclamationTriangleIcon,
  },
  { 
    label: 'Settings', 
    path: '/security/settings', 
    icon: CogIcon,
  },
  { 
    label: 'Health', 
    path: '/security/health', 
    icon: HeartIcon,
    badge: 'Live',
    badgeColor: 'green',
  },
  { 
    label: 'Metrics', 
    path: '/security/metrics', 
    icon: ChartBarIcon,
  },
  { 
    label: 'API Keys', 
    path: '/security/api-keys', 
    icon: KeyIcon,
  },
  { 
    label: 'Real-Time', 
    path: '/security/realtime', 
    icon: ChartBarIcon,
    badge: 'WS',
    badgeColor: 'purple',
  },
  { 
    label: 'Budget Guard', 
    path: '/security/budget-guard', 
    icon: CurrencyDollarIcon,
    badge: 'NEW',
    badgeColor: 'orange',
  },
];

export default function SecurityLayout({ 
  children, 
  pageTitle,
  pageDescription,
}: SecurityLayoutProps) {
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const isMobile = useBreakpointValue({ base: true, lg: false });
  
  // Zero-tolerance role gate: Security Center requires platform-admin or infrastructure feature
  const { data: session, status } = useSession();
  const user = session?.user as any;
  const isPlatformAdmin = user?.platformRole === 'platform-admin';
  const subscriptionTier = user?.subscriptionTier || 'free';
  // Allow enterprise users to view security pages (they have 'infrastructure' feature)
  const hasInfraAccess = isPlatformAdmin || subscriptionTier === 'enterprise' || subscriptionTier === 'admin';

  if (status === 'loading') {
    return (
      <DashboardLayout>
        <Box display="flex" alignItems="center" justifyContent="center" minH="60vh">
          <Text>Loading...</Text>
        </Box>
      </DashboardLayout>
    );
  }

  if (!hasInfraAccess) {
    return (
      <DashboardLayout>
        <Box display="flex" alignItems="center" justifyContent="center" minH="60vh">
          <VStack spacing={4} textAlign="center" maxW="md">
            <Icon as={ShieldCheckIcon} boxSize={12} color="red.400" />
            <Text fontSize="xl" fontWeight="bold">Restricted Area</Text>
            <Text fontSize="sm" color="gray.400">
              The Security Center requires Platform Admin or Enterprise access.
            </Text>
            <Badge colorScheme="gray" fontSize="xs">Current tier: {subscriptionTier}</Badge>
            <Button size="sm" onClick={() => router.push('/dashboard')}>
              Return to Dashboard
            </Button>
          </VStack>
        </Box>
      </DashboardLayout>
    );
  }

  // Semantic tokens
  const bgSecondary = useSemanticToken('surface.elevated');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const borderDefault = useSemanticToken('border.default');
  const surfaceHover = useSemanticToken('surface.hover');

  const renderNavItem = (item: SecurityNavItem) => {
    const isActive = router.pathname === item.path;
    
    return (
      <NextLink href={item.path} key={item.path} passHref legacyBehavior>
        <Box
          as="a"
          display="flex"
          alignItems="center"
          gap={3}
          px={3}
          py={2.5}
          borderRadius="lg"
          bg={isActive ? 'blue.500' : 'transparent'}
          color={isActive ? 'white' : textPrimary}
          _hover={{ 
            bg: isActive ? 'blue.600' : surfaceHover,
            transform: 'translateX(2px)',
          }}
          transition="all 0.2s"
          cursor="pointer"
          w="full"
        >
          <Icon as={item.icon} boxSize={5} />
          <Text fontSize="sm" fontWeight={isActive ? 'semibold' : 'medium'} flex={1}>
            {item.label}
          </Text>
          {item.badge && (
            <Badge 
              colorScheme={item.badgeColor || 'gray'} 
              fontSize="xs"
              variant={isActive ? 'solid' : 'subtle'}
            >
              {item.badge}
            </Badge>
          )}
        </Box>
      </NextLink>
    );
  };

  const sidebarContent = (
    <VStack spacing={1} align="stretch" w="full">
      {/* Sidebar Header */}
      <Box px={3} py={4} borderBottom="1px solid" borderColor={borderDefault}>
        <HStack spacing={2}>
          <Icon as={ShieldCheckIcon} boxSize={6} color="blue.500" />
          <Heading size="sm">Security Center</Heading>
        </HStack>
        <Text fontSize="xs" color={textSecondary} mt={1}>
          Zero Trust Framework
        </Text>
      </Box>

      {/* Navigation Items */}
      <VStack spacing={1} align="stretch" p={2}>
        {securityNavItems.map(renderNavItem)}
      </VStack>

      {/* Quick Stats Footer */}
      <Box mt="auto" p={3} borderTop="1px solid" borderColor={borderDefault}>
        <GlassPanel variant="light" p={3}>
          <VStack spacing={2} align="stretch">
            <HStack justify="space-between">
              <Text fontSize="xs" color={textSecondary}>Status</Text>
              <Badge colorScheme="green" fontSize="xs">Protected</Badge>
            </HStack>
            <HStack justify="space-between">
              <Text fontSize="xs" color={textSecondary}>Framework</Text>
              <Text fontSize="xs" fontWeight="medium">Zero Trust</Text>
            </HStack>
          </VStack>
        </GlassPanel>
      </Box>
    </VStack>
  );

  return (
    <DashboardLayout>
      <Box display="flex" h="full" minH="calc(100vh - 70px)">
        {/* Secondary Left Sidebar - Desktop */}
        {!isMobile && (
          <Box
            w="220px"
            minW="220px"
            bg={bgSecondary}
            borderRight="1px solid"
            borderColor={borderDefault}
            display="flex"
            flexDirection="column"
            position="sticky"
            top="0"
            h="calc(100vh - 70px)"
            overflowY="auto"
          >
            {sidebarContent}
          </Box>
        )}

        {/* Main Content Area */}
        <Box flex={1} overflowY="auto">
          {/* Mobile Header with Menu Button */}
          {isMobile && (
            <HStack 
              p={4} 
              borderBottom="1px solid" 
              borderColor={borderDefault}
              bg={bgSecondary}
              position="sticky"
              top={0}
              zIndex={10}
            >
              <IconButton
                aria-label="Open security menu"
                icon={<HamburgerIcon />}
                variant="ghost"
                onClick={onOpen}
              />
              <Icon as={ShieldCheckIcon} boxSize={5} color="blue.500" />
              <Text fontWeight="semibold">Security</Text>
            </HStack>
          )}

          {/* Page Content */}
          <Box p={{ base: 4, md: 6 }} maxW="1400px" mx="auto">
            {children}
          </Box>
        </Box>

        {/* Mobile Navigation Drawer */}
        <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
          <DrawerOverlay />
          <DrawerContent bg={bgSecondary} maxW="280px">
            <DrawerCloseButton />
            <DrawerHeader borderBottomWidth="1px">
              <HStack spacing={2}>
                <Icon as={ShieldCheckIcon} boxSize={5} color="blue.500" />
                <Text>Security Center</Text>
              </HStack>
            </DrawerHeader>
            <DrawerBody p={0}>
              <VStack spacing={1} align="stretch" p={2}>
                {securityNavItems.map((item) => (
                  <NextLink href={item.path} key={item.path} passHref legacyBehavior>
                    <HStack
                      as="a"
                      p={3}
                      borderRadius="lg"
                      bg={router.pathname === item.path ? 'blue.500' : 'transparent'}
                      color={router.pathname === item.path ? 'white' : textPrimary}
                      _hover={{ bg: router.pathname === item.path ? 'blue.600' : surfaceHover }}
                      onClick={onClose}
                    >
                      <Icon as={item.icon} boxSize={5} />
                      <Text fontWeight={router.pathname === item.path ? 'semibold' : 'normal'} flex={1}>
                        {item.label}
                      </Text>
                      {item.badge && (
                        <Badge colorScheme={item.badgeColor || 'gray'} fontSize="xs">
                          {item.badge}
                        </Badge>
                      )}
                    </HStack>
                  </NextLink>
                ))}
              </VStack>
            </DrawerBody>
          </DrawerContent>
        </Drawer>
      </Box>
    </DashboardLayout>
  );
}
