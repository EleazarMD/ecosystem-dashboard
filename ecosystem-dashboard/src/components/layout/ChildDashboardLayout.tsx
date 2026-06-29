/**
 * Child Dashboard Layout
 * 
 * Unified layout wrapper for all child portal pages that provides:
 * - Child theme provider with themed styling
 * - Child-specific navigation sidebar
 * - Child-specific right panel buttons with themed icons
 * - Themed background support
 * - Consistent header and navigation
 */

import React, { ReactNode, useEffect } from 'react';
import {
  Box,
  Flex,
  HStack,
  Avatar,
  Text,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  Icon,
  useDisclosure,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerBody,
  DrawerHeader,
  VStack,
  useBreakpointValue,
  Heading,
  Tooltip,
} from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { ChildThemeProvider, useChildTheme } from '@/components/child/ChildThemeProvider';
import { activityRegistry } from '@/domains/learning/shared/activity-registry';
import { ChildRightPanelButtons } from './ChildRightPanelButtons';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { useAuth } from '@/context/AuthContext';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { SimpleGlassPanel } from '../ui/SimpleGlassPanel';
import ErrorBoundary from '../common/ErrorBoundary';
import {
  HomeIcon,
  ChatBubbleLeftRightIcon,
  PaintBrushIcon,
  PencilSquareIcon,
  EnvelopeIcon,
  CalendarIcon,
  BookOpenIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  BeakerIcon,
  MapIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

const DynamicRightPanel = dynamic(
  () => import('./DynamicRightPanel.new'),
  { ssr: false, loading: () => <Box p={4}>Loading panel...</Box> }
);

interface ChildDashboardLayoutProps {
  children: ReactNode;
  pageType?: 'home' | 'chat' | 'art' | 'workspace' | 'email' | 'planner' | 'books' | 'dictionary' | 'journal' | 'learn' | 'learning-path' | 'teams' | 'pokemon-lab';
}

interface ChildNavItem {
  label: string;
  path: string;
  icon: React.ComponentType<any>;
  imageIcon?: string;
}

function ChildDashboardLayoutInner({ children, pageType = 'home' }: ChildDashboardLayoutProps) {
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { user, logout, isAuthenticated } = useAuth();
  const { theme, themeId, colors, childExtras } = useChildTheme();
  const { 
    isOpen: isPanelOpen, 
    setIsOpen: setIsPanelOpen, 
    setActiveTab,
    setContext,
    width: panelWidth,
  } = useRightPanel();
  
  const isMobile = useBreakpointValue({ base: true, md: false });
  
  // Semantic tokens
  const bgPrimary = useSemanticToken('surface.base');
  const bgSecondary = useSemanticToken('surface.elevated');
  const textPrimary = useSemanticToken('text.primary');
  const borderDefault = useSemanticToken('border.default');
  const surfaceHover = useSemanticToken('surface.hover');

  // Track if this is initial mount
  const hasInitialized = React.useRef(false);

  // Detect orientation for iPad - track portrait mode but don't force close panel
  const [isPortrait, setIsPortrait] = React.useState(false);
  const previousOrientationRef = React.useRef<boolean | null>(null);
  
  useEffect(() => {
    const checkOrientation = () => {
      // Portrait mode: height > width
      const portrait = window.innerHeight > window.innerWidth;
      const wasPortrait = previousOrientationRef.current;
      
      // Only auto-close panel on initial load in portrait mode
      // or when orientation changes FROM landscape TO portrait
      if (wasPortrait === null) {
        // Initial load - close if portrait
        if (portrait) {
          setIsPanelOpen(false);
        }
      } else if (!wasPortrait && portrait) {
        // Changed from landscape to portrait - close panel
        setIsPanelOpen(false);
      }
      
      // Update refs and state
      previousOrientationRef.current = portrait;
      setIsPortrait(portrait);
    };
    
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setIsPanelOpen]);

  // Set panel context based on page type
  useEffect(() => {
    const contextMap: Record<string, string> = {
      home: 'child-home',
      chat: 'child-chat',
      art: 'child-art',
      workspace: 'child-workspace',
      email: 'child-email',
      planner: 'child-planner',
      books: 'child-books',
      dictionary: 'child-dictionary',
      journal: 'child-journal',
      learn: 'child-learn',
      'pokemon-lab': 'child-pokemon-lab',
      'learning-path': 'child-learn',
      teams: 'child-learn',
    };
    const context = contextMap[pageType] || 'child-home';
    setContext(context as any);

    // Wire the Context Hub: resolve the activity from the registry by pageType
    // and set the focus. This makes the Pi Code agent "always in the loop" —
    // every child surface registers its focus on mount.
    const activity = activityRegistry.findByPageType(pageType);
    if (activity) {
      // Dynamic import to avoid SSR issues with the Context Hub singleton
      import('@/domains/learning/shared/context-hub-service').then(({ getContextHub }) => {
        const hub = getContextHub();
        hub.setFocus(activity.id);
      }).catch(() => {
        // Context Hub not available — non-blocking
      });
    }

    // Panel is closed by default; user opens it via right-rail buttons or activity triggers
    if (!hasInitialized.current) {
      setIsPanelOpen(false);
      hasInitialized.current = true;
    }
  }, [pageType, isMobile, isPortrait, setContext, setIsPanelOpen]);

  // Get themed service icons
  const serviceIcons = childExtras?.serviceIcons;
  
  // Build child navigation with themed icons
  const childNavItems: ChildNavItem[] = [
    { label: 'Home', path: '/child/home', icon: HomeIcon, imageIcon: serviceIcons?.home },
    { label: 'Learn', path: '/child/learn', icon: AcademicCapIcon, imageIcon: serviceIcons?.learn },
    { label: 'Pokemon Lab', path: '/child/pokemon-lab', icon: BeakerIcon, imageIcon: serviceIcons?.pokemonLab },
    { label: 'My Path', path: '/child/learning-path', icon: MapIcon, imageIcon: serviceIcons?.learningPath },
    { label: 'My Teams', path: '/child/teams', icon: UsersIcon, imageIcon: serviceIcons?.teams },
    { label: 'Chat', path: '/child/chat', icon: ChatBubbleLeftRightIcon, imageIcon: serviceIcons?.chat },
    { label: 'Art Studio', path: '/child/art-studio', icon: PaintBrushIcon, imageIcon: serviceIcons?.art },
    { label: 'Workspace', path: '/child/workspace', icon: PencilSquareIcon, imageIcon: serviceIcons?.writing },
    { label: 'Dictionary', path: '/child/dictionary', icon: BookOpenIcon, imageIcon: serviceIcons?.dictionary },
    { label: 'Journal', path: '/child/journal', icon: DocumentTextIcon, imageIcon: serviceIcons?.journal },
    { label: 'Email Helper', path: '/child/email', icon: EnvelopeIcon, imageIcon: serviceIcons?.email },
    { label: 'My Planner', path: '/child/planner', icon: CalendarIcon, imageIcon: serviceIcons?.planner },
    { label: 'Books', path: '/child/book-explorer', icon: BookOpenIcon, imageIcon: serviceIcons?.books },
  ];

  // Get background image for current page
  const backgroundImages = childExtras?.decorations?.backgroundImages;
  const getBackgroundImage = () => {
    if (!backgroundImages) return undefined;
    // Type-safe access with fallback
    const bgMap: Record<string, string | undefined> = backgroundImages as any;
    return bgMap[pageType] || backgroundImages.default;
  };
  const backgroundImage = getBackgroundImage();

  const renderNavItem = (item: ChildNavItem) => {
    const isActive = router.pathname === item.path;
    
    return (
      <Tooltip key={item.path} label={item.label} placement="right" hasArrow>
        <NextLink href={item.path} passHref legacyBehavior>
          <Box
            as="a"
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            position="relative"
            p={2}
            borderRadius="xl"
            bg={isActive ? colors?.primary + '22' : 'transparent'}
            _hover={{ bg: colors?.primary + '11', transform: 'scale(1.08)' }}
            transition="all 0.2s"
            cursor="pointer"
            w="56px"
            h="60px"
          >
            {/* Active indicator bar */}
            {isActive && (
              <Box
                position="absolute"
                left="-8px"
                top="50%"
                transform="translateY(-50%)"
                w="4px"
                h="32px"
                borderRadius="full"
                bg={colors?.primary}
                boxShadow={`0 0 8px ${colors?.primary}88`}
              />
            )}
            {item.imageIcon ? (
              <Box
                as="img"
                src={item.imageIcon}
                alt={item.label}
                w="28px"
                h="28px"
                objectFit="contain"
                style={{ imageRendering: childExtras?.decorations?.cardStyle === 'pixelated' ? 'pixelated' : 'auto' }}
              />
            ) : (
              <Icon as={item.icon} boxSize={5} color={isActive ? colors?.primary : textPrimary} />
            )}
            <Text fontSize="xs" mt={1} color={isActive ? colors?.primary : textPrimary} fontWeight={isActive ? 'bold' : 'normal'}>
              {item.label}
            </Text>
          </Box>
        </NextLink>
      </Tooltip>
    );
  };

  return (
    <Box minH="100vh" bg={colors?.background || bgPrimary}>
      {/* Header - Full width banner */}
      <SimpleGlassPanel
        position="fixed"
        top="0"
        left="0"
        right="0"
        h="60px"
        zIndex={1100}
        borderRadius="0"
        borderBottom="1px solid"
        borderColor={borderDefault}
      >
        <Flex h="full" px={4} align="center" justify="space-between">
          {/* Logo / Title */}
          <HStack spacing={2.5}>
            <Text fontSize="lg" fontWeight="800" letterSpacing="-0.02em" color={colors?.primary}>
              {childExtras?.welcomeMessages?.[0]?.split(' ')[0] || '🌟'} Kids Portal
            </Text>
          </HStack>
        </Flex>
      </SimpleGlassPanel>

      {/* User Menu - Fixed in upper right corner */}
      <Box
        position="fixed"
        top="8px"
        right="16px"
        zIndex={1200}
      >
        <Menu>
              <MenuButton
                as={Button}
                variant="ghost"
                rightIcon={<ChevronDownIcon />}
                bg={themeId?.includes('minecraft') 
                  ? 'rgba(245, 222, 179, 0.75)' 
                  : themeId?.includes('pusheen') 
                    ? 'rgba(255, 182, 193, 0.75)' 
                    : 'transparent'}
                border={themeId?.includes('minecraft') 
                  ? '3px solid #8B5A2B' 
                  : themeId?.includes('pusheen') 
                    ? '2px solid #8B7355' 
                    : 'none'}
                borderRadius={themeId?.includes('minecraft') 
                  ? '4px' 
                  : themeId?.includes('pusheen') 
                    ? '20px' 
                    : 'full'}
                boxShadow={themeId?.includes('minecraft') 
                  ? '4px 4px 0px #5D8C3E' 
                  : themeId?.includes('pusheen') 
                    ? '0 4px 15px rgba(139, 115, 85, 0.2)' 
                    : 'none'}
                _hover={{
                  bg: themeId?.includes('minecraft') 
                    ? 'rgba(245, 222, 179, 0.9)' 
                    : themeId?.includes('pusheen') 
                      ? 'rgba(255, 182, 193, 0.9)' 
                      : colors?.primaryHover,
                  transform: themeId?.includes('minecraft') 
                    ? 'translate(-2px, -2px)' 
                    : themeId?.includes('pusheen') 
                      ? 'scale(1.05)' 
                      : 'none',
                  boxShadow: themeId?.includes('minecraft') 
                    ? '6px 6px 0px #55CDFC' 
                    : themeId?.includes('pusheen') 
                      ? '0 6px 20px rgba(139, 115, 85, 0.3)' 
                      : 'md',
                }}
                _active={{
                  bg: themeId?.includes('minecraft') 
                    ? 'rgba(245, 222, 179, 1)' 
                    : themeId?.includes('pusheen') 
                      ? 'rgba(255, 182, 193, 1)' 
                      : colors?.primaryActive,
                }}
              >
                <HStack spacing={2}>
                  {childExtras?.avatar?.default ? (
                    <Box
                      as="img"
                      src={childExtras.avatar.default}
                      alt="Avatar"
                      boxSize="32px"
                      borderRadius={themeId?.includes('minecraft') ? '2px' : themeId?.includes('pusheen') ? '50%' : 'full'}
                      border={themeId?.includes('minecraft') ? '2px solid #8B5A2B' : themeId?.includes('pusheen') ? '2px solid #FFB6C1' : 'none'}
                    />
                  ) : (
                    <Avatar size="sm" name={user?.name || 'Kid'} />
                  )}
                  <Text 
                    fontSize="sm" 
                    fontWeight="bold"
                    display={{ base: 'none', sm: 'block' }}
                    color={themeId?.includes('minecraft') ? '#2C2C2C' : themeId?.includes('pusheen') ? '#5D4E37' : textPrimary}
                  >
                    {user?.name?.split(' ')[0] || 'Kid'}
                  </Text>
                </HStack>
              </MenuButton>
              <MenuList 
                zIndex={2000} 
                bg={themeId?.includes('pusheen') ? 'rgba(255, 245, 238, 0.95)' : bgSecondary}
                border={themeId?.includes('minecraft') 
                  ? '3px solid #8B5A2B' 
                  : themeId?.includes('pusheen') 
                    ? '2px solid #8B7355' 
                    : '1px solid'}
                borderColor={borderDefault}
                borderRadius={themeId?.includes('minecraft') 
                  ? '4px' 
                  : themeId?.includes('pusheen') 
                    ? '16px' 
                    : 'md'}
                boxShadow={themeId?.includes('minecraft') 
                  ? '4px 4px 0px #5D8C3E' 
                  : themeId?.includes('pusheen') 
                    ? '0 8px 30px rgba(139, 115, 85, 0.2)' 
                    : 'lg'}
              >
                <MenuItem 
                  as={NextLink} 
                  href="/child/home"
                  _hover={{ bg: themeId?.includes('minecraft') ? 'rgba(93, 140, 62, 0.2)' : themeId?.includes('pusheen') ? 'rgba(255, 182, 193, 0.3)' : surfaceHover }}
                >
                  <HStack spacing={2}>
                    {themeId?.includes('minecraft') ? (
                      <Box
                        as="img"
                        src="/themes/minecraft/Widgets/steve-character-blue.png"
                        alt="Profile"
                        boxSize="20px"
                      />
                    ) : themeId?.includes('pusheen') ? (
                      <Box
                        as="img"
                        src="/themes/pusheen/Widgets/pusheen-cat-drawing.png"
                        alt="Profile"
                        boxSize="20px"
                      />
                    ) : (
                      <Text>👤</Text>
                    )}
                    <Text>My Profile</Text>
                  </HStack>
                </MenuItem>
                <MenuItem 
                  as={NextLink} 
                  href="/settings"
                  _hover={{ bg: themeId?.includes('minecraft') ? 'rgba(93, 140, 62, 0.2)' : themeId?.includes('pusheen') ? 'rgba(255, 182, 193, 0.3)' : surfaceHover }}
                >
                  <HStack spacing={2}>
                    {themeId?.includes('minecraft') ? (
                      <Box
                        as="img"
                        src="/themes/minecraft/Widgets/Small-widget-3.png"
                        alt="Settings"
                        boxSize="20px"
                      />
                    ) : themeId?.includes('pusheen') ? (
                      <Box
                        as="img"
                        src="/themes/pusheen/Widgets/shooting-star.png"
                        alt="Settings"
                        boxSize="20px"
                      />
                    ) : (
                      <Text>⚙️</Text>
                    )}
                    <Text>Settings</Text>
                  </HStack>
                </MenuItem>
                <MenuItem 
                  onClick={logout}
                  _hover={{ bg: themeId?.includes('minecraft') ? 'rgba(93, 140, 62, 0.2)' : themeId?.includes('pusheen') ? 'rgba(255, 182, 193, 0.3)' : surfaceHover }}
                >
                  <HStack spacing={2}>
                    {themeId?.includes('minecraft') ? (
                      <Box
                        as="img"
                        src="/themes/minecraft/Widgets/spawn-egg.png"
                        alt="Goodbye"
                        boxSize="20px"
                      />
                    ) : themeId?.includes('pusheen') ? (
                      <Box
                        as="img"
                        src="/themes/pusheen/Widgets/butterfly-nature.png"
                        alt="Goodbye"
                        boxSize="20px"
                      />
                    ) : (
                      <Text>👋</Text>
                    )}
                    <Text>Say Goodbye!</Text>
                  </HStack>
                </MenuItem>
              </MenuList>
            </Menu>
      </Box>

      {/* Left Sidebar Navigation */}
      <Box
        position="fixed"
        left="0"
        top="72px"
        bottom="12px"
        w="76px"
        bg={bgSecondary}
        borderRight="1px solid"
        borderColor={borderDefault}
        borderTopRightRadius="20px"
        borderBottomRightRadius="20px"
        boxShadow="4px 0 16px rgba(0,0,0,0.04)"
        py={3}
        zIndex={1000}
        overflowY="auto"
        overflowX="hidden"
        display={{ base: 'none', md: 'block' }}
        mx="8px"
      >
        <VStack spacing={1.5} align="center">
          {childNavItems.map(renderNavItem)}
        </VStack>
      </Box>

      {/* Main Content */}
      <Box
        as="main"
        position="fixed"
        left={{ base: '0', md: '92px' }}
        right={isPanelOpen ? `${panelWidth + 8}px` : '64px'}
        top="72px"
        bottom="12px"
        overflowY="auto"
        overflowX="hidden"
        transition="right 0.2s ease-out"
        backgroundImage={backgroundImage ? `url(${backgroundImage})` : undefined}
        backgroundSize={pageType === 'home' ? '400px' : 'cover'}
        backgroundPosition="center"
        backgroundRepeat={pageType === 'home' ? 'repeat' : 'no-repeat'}
        borderRadius="24px"
        boxShadow="0 4px 30px rgba(0,0,0,0.06)"
        border="1px solid"
        borderColor={borderDefault}
        sx={{
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': { width: '6px' },
          '&::-webkit-scrollbar-thumb': { borderRadius: 'full', bg: 'blackAlpha.200' },
        }}
      >
        {children}
      </Box>

      {/* Right Panel Buttons - Child themed */}
      <ChildRightPanelButtons
        isPanelOpen={isPanelOpen}
        setIsPanelOpen={setIsPanelOpen}
        setActiveTab={setActiveTab}
      />

      {/* Dynamic Right Panel */}
      {isPanelOpen && (
        <ErrorBoundary
          componentName="DynamicRightPanel"
          fallback={<Box p={4}>Panel temporarily disabled</Box>}
        >
          <DynamicRightPanel
            onClose={() => setIsPanelOpen(false)}
          />
        </ErrorBoundary>
      )}

      {/* Mobile Navigation Drawer */}
      <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent bg={bgSecondary}>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px">
            <Heading size="md" color={colors?.primary}>Navigation</Heading>
          </DrawerHeader>
          <DrawerBody>
            <VStack spacing={2} align="stretch">
              {childNavItems.map((item) => {
                const isActive = router.pathname === item.path;
                return (
                  <NextLink href={item.path} key={item.path} passHref legacyBehavior>
                    <HStack
                      as="a"
                      p={3}
                      borderRadius="lg"
                      position="relative"
                      bg={isActive ? colors?.primary + '22' : 'transparent'}
                      _hover={{ bg: colors?.primary + '11', transform: 'translateX(4px)' }}
                      transition="all 0.2s"
                      onClick={onClose}
                    >
                      {isActive && (
                        <Box
                          position="absolute"
                          left="0"
                          top="50%"
                          transform="translateY(-50%)"
                          w="3px"
                          h="24px"
                          borderRadius="full"
                          bg={colors?.primary}
                        />
                      )}
                      {item.imageIcon ? (
                        <Box as="img" src={item.imageIcon} w="24px" h="24px" objectFit="contain" />
                      ) : (
                        <Icon as={item.icon} boxSize={5} color={isActive ? colors?.primary : undefined} />
                      )}
                      <Text fontWeight={isActive ? 'bold' : 'normal'} color={isActive ? colors?.primary : undefined}>
                        {item.label}
                      </Text>
                    </HStack>
                  </NextLink>
                );
              })}
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
}

export default function ChildDashboardLayout({ children, pageType }: ChildDashboardLayoutProps) {
  const activity = pageType ? activityRegistry.findByPageType(pageType) : undefined;
  return (
    <ChildThemeProvider isChildMode={true} activeActivityId={activity?.id ?? null}>
      <ChildDashboardLayoutInner pageType={pageType}>
        {children}
      </ChildDashboardLayoutInner>
    </ChildThemeProvider>
  );
}
