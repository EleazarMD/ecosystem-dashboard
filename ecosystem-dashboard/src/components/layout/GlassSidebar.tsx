import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Collapse,
  Badge,
  Tooltip,
  IconButton,
  useBreakpointValue,
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { domainColors } from '@/styles/theme';
import { GlassPanel } from '../ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

const MotionBox = motion(Box);

export interface NavItem {
  label: string;
  path: string;
  icon?: React.ComponentType<any>;
  imageIcon?: string; // Path to themed image icon for child themes
  children?: NavItem[];
  badge?: string;
  badgeColorScheme?: string;
  isNew?: boolean;
  domain?: string;
}

interface GlassSidebarProps {
  navigationItems: NavItem[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onItemClick?: () => void;
}

interface NavItemLinkProps {
  item: NavItem;
  isCollapsed: boolean;
  depth?: number;
  onItemClick?: () => void;
}

const NavItemLink: React.FC<NavItemLinkProps> = ({
  item,
  isCollapsed,
  depth = 0,
  onItemClick
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const textTertiary = useSemanticToken('text.tertiary');
  const interactivePrimary = useSemanticToken('interactive.primary');
  const surfaceHover = useSemanticToken('surface.hover');
  const borderSubtle = useSemanticToken('border.subtle');

  const isActive = router.pathname === item.path ||
    (item.children && item.children.some(child => router.pathname === child.path));

  const hasChildren = item.children && item.children.length > 0;

  // Get domain color
  const getDomainColor = () => {
    if (!item.domain) return '#3B82F6';
    return domainColors[item.domain as keyof typeof domainColors]?.primary || '#3B82F6';
  };

  const handleClick = (e: React.MouseEvent) => {
    if (hasChildren) {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(!isOpen);
    }
  };

  // Animation variants
  const itemVariants = {
    collapsed: {
      width: '48px',
      transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
    },
    expanded: {
      width: 'auto',
      transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
    }
  };

  const textVariants = {
    collapsed: {
      opacity: 0,
      width: 0,
      transition: { duration: 0.2 }
    },
    expanded: {
      opacity: 1,
      width: 'auto',
      transition: { duration: 0.3, delay: 0.1 }
    }
  };

  const linkContent = (
    <MotionBox
      variants={itemVariants}
      animate={isCollapsed ? 'collapsed' : 'expanded'}
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
    >
      <HStack
        spacing={2}
        px={2}
        py={1.5}
        pl={depth > 0 ? 3.5 : 2}
        borderRadius="md"
        cursor="pointer"
        position="relative"
        bg={isActive ? `${getDomainColor()}20` : 'transparent'}
        border={isActive ? `1px solid ${getDomainColor()}` : '1px solid transparent'}
        transition="all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
        _hover={{
          bg: surfaceHover,
          borderColor: borderSubtle,
          transform: 'translateX(2px)',
        }}
        minH="32px"
        align="center"
      >
        {/* Active indicator */}
        {isActive && (
          <Box
            position="absolute"
            left="0"
            top="50%"
            transform="translateY(-50%)"
            w="2px"
            h="16px"
            bg={getDomainColor()}
            borderRadius="full"
            className="animate-pulse-glow"
          />
        )}

        {/* Icon - support both React icons and themed image icons */}
        {item.imageIcon ? (
          <Box
            as="img"
            src={item.imageIcon}
            alt={item.label}
            boxSize={5}
            objectFit="contain"
            flexShrink={0}
            filter={isActive ? 'none' : 'grayscale(20%)'}
            transition="filter 0.2s"
          />
        ) : item.icon ? (
          <Icon
            as={item.icon}
            boxSize={4}
            color={isActive ? getDomainColor() : textPrimary}
            flexShrink={0}
          />
        ) : null}

        {/* Text content - only show when not collapsed */}
        <AnimatePresence>
          {!isCollapsed && (
            <MotionBox
              variants={textVariants}
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
              flex={1}
              overflow="hidden"
            >
              <HStack justify="space-between" align="center" w="full">
                <Text
                  fontSize="xs"
                  fontWeight={isActive ? '700' : '600'}
                  color={isActive ? getDomainColor() : textPrimary}
                  noOfLines={1}
                  flex={1}
                  lineHeight="1.2"
                >
                  {item.label}
                </Text>

                <HStack spacing={1}>
                  {/* New badge */}
                  {item.isNew && (
                    <Badge
                      colorScheme="blue"
                      variant="solid"
                      fontSize="2xs"
                      px={1}
                      py={0}
                      borderRadius="full"
                    >
                      NEW
                    </Badge>
                  )}

                  {/* Custom badge */}
                  {item.badge && (
                    <Badge
                      colorScheme={item.badgeColorScheme || 'gray'}
                      variant="subtle"
                      fontSize="2xs"
                      px={1}
                      py={0}
                      borderRadius="sm"
                    >
                      {item.badge}
                    </Badge>
                  )}

                  {/* Chevron for expandable items */}
                  {hasChildren && (
                    <Icon
                      as={isOpen ? ChevronRightIcon : ChevronRightIcon}
                      boxSize={3}
                      color={textTertiary}
                      transform={isOpen ? 'rotate(90deg)' : 'rotate(0deg)'}
                      transition="transform 0.2s"
                    />
                  )}
                </HStack>
              </HStack>
            </MotionBox>
          )}
        </AnimatePresence>
      </HStack>
    </MotionBox>
  );

  const wrappedContent = hasChildren ? (
    <div onClick={handleClick} style={{ cursor: 'pointer' }}>
      {linkContent}
    </div>
  ) : (
    <a href={item.path} style={{ textDecoration: 'none', display: 'block', width: '100%' }}>
      {linkContent}
    </a>
  );

  return (
    <Box w="full">
      {wrappedContent}

      {/* Children */}
      {hasChildren && !isCollapsed && (
        <Collapse in={isOpen} animateOpacity>
          <VStack align="stretch" spacing={0.5} mt={0.5} pl={1}>
            {item.children!.map((child) => (
              <NavItemLink
                key={child.label}
                item={child}
                isCollapsed={false}
                depth={depth + 1}
                onItemClick={onItemClick}
              />
            ))}
          </VStack>
        </Collapse>
      )}
    </Box>
  );
};

export const GlassSidebar: React.FC<GlassSidebarProps> = ({
  navigationItems,
  isCollapsed,
  onToggleCollapse,
  onItemClick,
}) => {
  const isMobile = useBreakpointValue({ base: true, md: false });
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const textTertiary = useSemanticToken('text.tertiary');
  const borderDefault = useSemanticToken('border.default');
  const borderSubtle = useSemanticToken('border.subtle');
  const surfaceElevated = useSemanticToken('surface.elevated');
  const glassBackground = useSemanticToken('glass.background');

  // Don't render persistent sidebar on mobile
  if (isMobile) return null;

  const sidebarVariants = {
    collapsed: {
      width: '72px',
      transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
    },
    expanded: {
      width: '280px',
      transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
    }
  };

  return (
    <MotionBox
      position="fixed"
      left={0}
      top="60px"
      bottom={0}
      zIndex="docked"
      variants={sidebarVariants}
      animate={isCollapsed ? 'collapsed' : 'expanded'}
    >
      <GlassPanel
        variant="heavy"
        elevation={3}
        animated={false}
        hoverEffect={false}
        h="full"
        borderRadius="none"
        borderTopRightRadius="20px"
        borderBottomRightRadius="20px"
        borderRight="1px solid"
        borderColor={borderSubtle}
        position="relative"
        overflow="visible"
        sx={{
          backdropFilter: 'blur(10px) saturate(130%)',
          WebkitBackdropFilter: 'blur(10px) saturate(130%)',
          background: glassBackground,
          boxShadow: 'md',
        }}
      >
        {/* Header */}
        <Box
          px={2}
          py={2}
          borderBottom="1px solid"
          borderColor={borderSubtle}
        >
          <HStack justify="space-between" align="center">
            <AnimatePresence>
              {!isCollapsed && (
                <MotionBox
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Text
                    fontSize="sm"
                    fontWeight="700"
                    color={textPrimary}
                  >
                    Navigation
                  </Text>
                </MotionBox>
              )}
            </AnimatePresence>

            <IconButton
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              icon={<Icon as={isCollapsed ? ChevronRightIcon : ChevronLeftIcon} />}
              variant="ghost"
              size="sm"
              bg={borderSubtle}
              color={textPrimary}
              onClick={onToggleCollapse}
              _hover={{
                bg: surfaceElevated,
              }}
            />
          </HStack>
        </Box>

        {/* Navigation Items */}
        <Box
          flex={1}
          overflowY="auto"
          overflowX="hidden"
          px={1.5}
          py={2}
          css={{
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              background: borderSubtle,
              borderRadius: '3px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: borderDefault,
            },
          }}
        >
          <VStack align="stretch" spacing={0.5}>
            {navigationItems.map((item) => (
              <NavItemLink
                key={item.label}
                item={item}
                isCollapsed={isCollapsed}
                onItemClick={onItemClick}
              />
            ))}
          </VStack>
        </Box>

        {/* Footer */}
        <Box
          px={2}
          py={2}
          borderTop="1px solid"
          borderColor={borderSubtle}
        >
          <AnimatePresence>
            {!isCollapsed && (
              <MotionBox
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Text
                  fontSize="2xs"
                  color={textTertiary}
                  textAlign="center"
                  fontWeight="500"
                >
                  AI Homelab v2.0
                </Text>
              </MotionBox>
            )}
          </AnimatePresence>
        </Box>
      </GlassPanel>
    </MotionBox>
  );
};

export default GlassSidebar;
