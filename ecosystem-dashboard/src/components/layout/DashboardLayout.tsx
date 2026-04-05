import React, { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  IconButton,
  Avatar,
  Badge,
  useDisclosure,
  useBreakpointValue,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  Collapse,
  Button,
  Divider,
  Tooltip,
  Link,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Heading,
  Icon,
  Portal,
} from '@chakra-ui/react';
import {
  HamburgerIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  InfoIcon,
  SettingsIcon,
  CheckCircleIcon,
  WarningIcon,
  StarIcon,
  LockIcon,
} from '@chakra-ui/icons';
import {
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import {
  CubeIcon,
} from '@heroicons/react/24/outline';
import { Resizable } from 're-resizable';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { AIGatewayClientProvider } from '@/lib/ai-gateway-client-provider';
import {
  HomeIcon,
  ServerIcon,
  DocumentTextIcon,
  CpuChipIcon,
  BoltIcon,
  ShieldCheckIcon,
  BookOpenIcon,
  PuzzlePieceIcon,
  CogIcon,
  RocketLaunchIcon,
  UserGroupIcon,
  CommandLineIcon,
  ChartBarIcon,
  EyeIcon,
  ClipboardDocumentCheckIcon, // Added for Testing Suite
  ChatBubbleLeftRightIcon,
  AcademicCapIcon,
  MicrophoneIcon,
  BeakerIcon,
  CpuChipIcon as CPUChipIcon,
  Cog8ToothIcon,
  ChartPieIcon,
  ChartBarSquareIcon,
} from '@heroicons/react/24/outline';
import dynamic from 'next/dynamic';
import type { NavItem } from './GlassSidebar';
import { SimpleGlassPanel } from '../ui/SimpleGlassPanel';
import { useRightSidebar } from '@/contexts/RightSidebarContext';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { isFeatureEnabled } from '@/config/feature-flags';
import ErrorBoundary from '../common/ErrorBoundary';
import GlassSidebar from './GlassSidebar';
import { navigationItems } from '@/config/navigation';
import { RightPanelButtons } from './RightPanelButtons';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { useThemeAware } from '@/hooks/useThemeAware';

// Dynamic imports for components that need client-side only rendering
const KnowledgeGraphStatus = dynamic(
  () => import('../status/KnowledgeGraphStatus'),
  { ssr: false, loading: () => <div>Loading KG status...</div> }
);

const ServiceStatusBar = dynamic(
  () => import('../status/ServiceStatusBar'),
  { ssr: false, loading: () => <div>Loading service status...</div> }
);

// NEW: Modular panel system
const DynamicRightPanel = dynamic(
  () => import('./DynamicRightPanel.new'),
  {
    ssr: false,
    loading: () => (
      <Box p={4} fontSize="sm" color="textMuted">
        Loading panel...
      </Box>
    )
  }
);

const AgentNotificationCenter = dynamic(
  () => import('../agent/AgentNotificationCenter').then(mod => ({ default: mod.AgentNotificationCenter })),
  { ssr: false, loading: () => <div>Loading notifications...</div> }
);

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const NavItemLink: React.FC<{ item: NavItem; onClose: () => void }> = ({ item, onClose }) => {
  const router = useRouter();
  const { isOpen, onToggle } = useDisclosure();
  const { isDark } = useThemeAware();
  
  // All semantic tokens at top level
  const borderColor = useSemanticToken('border.subtle');
  const surfaceActive = useSemanticToken('surface.active');
  const surfaceHover = useSemanticToken('surface.hover');
  const textInverse = useSemanticToken('text.inverse');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');

  const isActive = router.pathname === item.path;
  const hasChildren = item.children && item.children.length > 0;

  const handleLinkClick = (e: React.MouseEvent) => {
    if (hasChildren) {
      e.preventDefault();
      onToggle();
    } else {
      onClose();
    }
  };

  const linkContent = (
    <Flex
      align="center"
      p={3}
      mx={-2}
      borderRadius="lg"
      role="group"
      cursor="pointer"
      bg={isActive ? surfaceActive : 'transparent'}
      color={isActive ? textInverse : textPrimary}
      _hover={{
        bg: isActive ? surfaceActive : surfaceHover,
        color: isActive ? textInverse : textPrimary,
      }}
      onClick={handleLinkClick}
    >
      {item.icon && (
        <Icon
          as={item.icon}
          mr={4}
          fontSize="16"
          color={isActive ? textInverse : textSecondary}
          _groupHover={{
            color: isActive ? textInverse : textPrimary,
          }}
        />
      )}
      <Text fontSize="sm" fontWeight="medium">{item.label}</Text>
      {item.badge && (
        <Badge
          colorScheme={item.badgeColorScheme || 'gray'}
          variant="solid"
          fontSize="xs"
          mr={2}
        >
          {item.badge}
        </Badge>
      )}
      {item.isNew && (
        <Badge colorScheme="blue" variant="solid" fontSize="xs" mr={2}>
          NEW
        </Badge>
      )}
      {hasChildren && (
        <Icon
          as={ChevronRightIcon}
          ml="auto"
          transform={isOpen ? 'rotate(90deg)' : 'rotate(0deg)'}
          transition="transform 0.2s"
        />
      )}
    </Flex>
  );

  return (
    <Box w="100%">
      {hasChildren ? linkContent : <NextLink href={item.path}>{linkContent}</NextLink>}
      {hasChildren && (
        <Collapse in={isOpen} animateOpacity>
          <VStack pl={4} align="stretch" borderLeft="1px" borderColor={borderColor} ml={3} mt={1}>
            {item.children!.map((child) => (
              <NavItemLink key={child.path} item={child} onClose={onClose} />
            ))}
          </VStack>
        </Collapse>
      )}
    </Box>
  );
};

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isCollapsed: isSidebarCollapsed, setIsCollapsed: setIsSidebarCollapsed } = useSidebar();
  // Use dynamic right panel context
  const { isOpen: isPanelOpen, setIsOpen: setIsPanelOpen, width: panelWidth, setActiveTab } = useRightPanel();
  const router = useRouter();
  const [systemData, setSystemData] = useState({
    health: 'healthy',
    services: [],
    metrics: { cpu: 0, memory: 0, disk: 0, network: 0 },
    alerts: 0
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isAuthenticated, user, logout, login, isLoading } = useAuth();
  const { isDark } = useThemeAware();
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Semantic tokens - ALL at top level to avoid Hooks order violations
  const bgPrimary = useSemanticToken('surface.base');
  const bgSecondary = useSemanticToken('surface.elevated');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const borderDefault = useSemanticToken('border.default');
  const borderSubtle = useSemanticToken('border.subtle');
  const surfaceHover = useSemanticToken('surface.hover');
  const surfaceActive = useSemanticToken('surface.active');
  const textInverse = useSemanticToken('text.inverse');
  const interactivePrimary = useSemanticToken('interactive.primary');
  const { isRightSidebarOpen, rightSidebarWidth } = useRightSidebar();

  // Check if we're on workspace page (which has its own sidebar)
  const isWorkspacePage = router.pathname === '/workspace' || router.pathname === '/workspace-test';
  const isImageStudioPage = router.pathname === '/image-studio';


  // Fetch real system data
  useEffect(() => {
    const fetchSystemData = async () => {
      try {
        const [healthRes, servicesRes] = await Promise.all([
          fetch('/api/health'),
          fetch('/api/infrastructure/services')
        ]);

        if (healthRes.ok && servicesRes.ok) {
          const [healthData, servicesData] = await Promise.all([
            healthRes.json(),
            servicesRes.json()
          ]);

          setSystemData({
            health: healthData.status || 'healthy',
            services: servicesData.services || [],
            metrics: {
              cpu: healthData.components?.system?.cpu || 0,
              memory: healthData.components?.system?.memory || 0,
              disk: healthData.components?.system?.disk || 0,
              network: healthData.components?.system?.network || 0,
            },
            alerts: healthData.components?.alerts?.length || 0
          });
        }
      } catch (error) {
        console.warn('Failed to fetch system data:', error);
      }
    };

    fetchSystemData();
    const interval = setInterval(fetchSystemData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Start research poller on mount (for deep research background processing)
  useEffect(() => {
    const startPoller = async () => {
      try {
        await fetch('/api/research-lab/start-poller', { method: 'POST' });
      } catch (error) {
        console.warn('⚠️ Failed to start research poller:', error);
      }
    };

    startPoller();
  }, []);

  // Toggle sidebar collapse
  const handleToggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
  };

  // Calculate main content margin based on sidebar state
  const getMainContentMargin = () => {
    // Use actual sidebar widths: 72px collapsed, 280px expanded
    const margin = isSidebarCollapsed ? '72px' : '280px';
    return margin;
  };

  const getMainContentPaddingRight = () => {
    // Add padding for the right panel when it's open
    if (isPanelOpen) {
      return `${panelWidth + 16}px`;
    }
    return '0';
  };

  const getRightPanelMargin = () => {
    if (isPanelOpen) {
      return `${panelWidth + 16}px`;
    }
    return '0';
  };

  return (
    <Box
      minH="100vh"
      bg={bgPrimary}
      suppressHydrationWarning
    >
      {/* Header */}
      <SimpleGlassPanel
        variant="light"
        position="sticky"
        top={0}
        left={0}
        right={0}
        h="64px"
        borderBottom="1px solid"
        borderColor={borderSubtle}
        zIndex={99998}
        sx={{
          isolation: 'isolate',
        }}
      >
        <Flex
          h="full"
          alignItems="center"
          px={4}
          justifyContent="space-between"
        >
          <HStack spacing={4}>
            {/* Mobile menu button */}
            {isMobile && (
              <IconButton
                aria-label="Menu"
                icon={<HamburgerIcon />}
                variant="ghost"
                onClick={onOpen}
                bg={bgSecondary}
                color={textPrimary}
                _hover={{
                  bg: useSemanticToken('surface.hover'),
                }}
              />
            )}

            <NextLink href="/dashboard" style={{ textDecoration: 'none' }}>
              <HStack cursor="pointer" spacing={2}>
                <Box
                  w="32px"
                  h="32px"
                  borderRadius="lg"
                  bg={interactivePrimary}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text color={textInverse} fontWeight="bold" fontSize="sm">
                    AI
                  </Text>
                </Box>
                <Heading
                  as="h1"
                  size="md"
                  color={textPrimary}
                  fontWeight="bold"
                >
                  AI Homelab
                </Heading>
              </HStack>
            </NextLink>
          </HStack>



          {/* Right side controls */}
          <HStack spacing={2}>

            {/* User menu */}
            {isAuthenticated ? (
              <Menu isLazy placement="bottom-end">
                <MenuButton
                  as={Button}
                  variant="ghost"
                  bg={bgSecondary}
                  rightIcon={<ChevronDownIcon />}
                  _hover={{
                    bg: surfaceHover,
                  }}
                >
                  <Avatar size="sm" name={user?.name || 'User'} src={user?.picture} />
                </MenuButton>
                <Portal>
                  <MenuList
                    bg={bgSecondary}
                    border="1px solid"
                    borderColor={borderDefault}
                    backdropFilter="blur(12px)"
                    zIndex={999999}
                  >
                    <MenuItem
                      as={NextLink}
                      href="/profile"
                      _hover={{
                        bg: surfaceHover,
                      }}
                    >
                      <Icon as={SettingsIcon} mr={2} /> Profile
                    </MenuItem>
                    <MenuItem
                      as={NextLink}
                      href="/settings"
                      _hover={{
                        bg: surfaceHover,
                      }}
                    >
                      <Icon as={CogIcon} mr={2} /> Settings
                    </MenuItem>
                    <MenuItem
                      onClick={logout}
                      _hover={{
                        bg: surfaceHover,
                      }}
                    >
                      <Icon as={LockIcon} mr={2} /> Logout
                    </MenuItem>
                  </MenuList>
                </Portal>
              </Menu>
            ) : (
              <Button
                as={NextLink}
                href="/auth/signin"
                colorScheme="purple"
                leftIcon={<LockIcon />}
                variant="solid"
                size="sm"
              >
                Login
              </Button>
            )}
          </HStack>
        </Flex>
      </SimpleGlassPanel>

      {/* Mobile Drawer */}
      <Drawer
        isOpen={isOpen}
        placement="left"
        onClose={onClose}
        size="sm"
      >
        <DrawerOverlay backdropFilter="blur(4px)" />
        <DrawerContent>
          <SimpleGlassPanel
            variant="heavy"
            h="full"
            borderRadius="none"
          >
            <DrawerCloseButton
              color={textPrimary}
              _hover={{
                bg: bgSecondary,
              }}
            />
            <DrawerHeader
              borderBottomWidth="1px"
              borderColor={borderSubtle}
            >
              <HStack spacing={2}>
                <Box
                  w="24px"
                  h="24px"
                  borderRadius="md"
                  bg={useSemanticToken('interactive.primary')}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text color={useSemanticToken('text.inverse')} fontWeight="bold" fontSize="xs">
                    AI
                  </Text>
                </Box>
                <Heading
                  as="h2"
                  size="md"
                  color={textPrimary}
                >
                  Navigation
                </Heading>
              </HStack>
            </DrawerHeader>
            <DrawerBody p={2}>
              <VStack align="stretch" spacing={1}>
                {navigationItems.map((item) => (
                  <NavItemLink key={item.label} item={item} onClose={onClose} />
                ))}
              </VStack>
            </DrawerBody>
          </SimpleGlassPanel>
        </DrawerContent>
      </Drawer>
      {/* Main Content & Right Panel Layout */}
      <Flex pt="70px" h="100vh">
        {/* Main Scrollable Content Area */}
        <Box
          as="main"
          position="fixed"
          left={getMainContentMargin()}
          right={isPanelOpen ? `${panelWidth}px` : '48px'}
          top="70px"
          bottom="0"
          overflowY="auto"
          overflowX="hidden"
          transition="left 0.3s ease-out, right 0.2s ease-out"
          p={!isWorkspacePage ? 4 : 0}
          zIndex={0}
          sx={{
            scrollbarGutter: 'stable'
          }}
        >
          {children}
        </Box>

        {/* Right Panel Buttons */}
        <RightPanelButtons
          isPanelOpen={isPanelOpen}
          setIsPanelOpen={setIsPanelOpen}
          setActiveTab={setActiveTab}
        />

        {/* Dynamic Context-Aware Right Panel */}
        {isPanelOpen && (
          <ErrorBoundary
            componentName="DynamicRightPanel"
            fallback={
              <Box p={4} fontSize="sm" color="textMuted">
                Panel temporarily disabled
              </Box>
            }
          >
            <AIGatewayClientProvider>
              <DynamicRightPanel
                systemData={systemData}
                onClose={() => {
                  console.log('[DashboardLayout] Close button clicked, setting isPanelOpen to false');
                  setIsPanelOpen(false);
                }}
              />
            </AIGatewayClientProvider>
          </ErrorBoundary>
        )}
      </Flex>

      {/* Desktop Sidebar - rendered last so it paints above main content */}
      <GlassSidebar
        navigationItems={navigationItems}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />
    </Box>
  );
};

const getDomainColorSchemeMUI = (domain: string): 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  const colorMap: Record<string, 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
    infrastructure: 'primary',
    knowledge: 'success',
    aiSystems: 'error',
    platforms: 'warning',
  };
  return colorMap[domain] || 'info';
};

export default DashboardLayout;
