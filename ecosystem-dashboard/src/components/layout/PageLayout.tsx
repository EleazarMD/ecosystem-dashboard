/**
 * Standard Page Layout Components
 * Universal structure for all dashboard pages
 * 
 * Usage:
 * <DashboardLayout>
 *   <PageLayout>
 *     <PageHeader title="..." actions={...} />
 *     <PageContent>
 *       {/* Your page content here *\/}
 *     </PageContent>
 *   </PageLayout>
 * </DashboardLayout>
 */

import React from 'react';
import {
  Box,
  Flex,
  Heading,
  HStack,
  Text,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
} from '@chakra-ui/react';
import { FiChevronRight } from 'react-icons/fi';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// ========================================
// PAGE LAYOUT CONTAINER
// ========================================

interface PageLayoutProps {
  children: React.ReactNode;
  maxWidth?: string;
  noPadding?: boolean;
}

/**
 * Main page container - handles responsive spacing and right panel integration
 */
export const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  maxWidth = 'full',
  noPadding = false,
}) => {
  const { isOpen: isPanelOpen, width: panelWidth } = useRightPanel();
  const bgColor = useSemanticToken('surface.base');

  return (
    <Box
      as="main"
      position="fixed"
      left="64px" // Left sidebar width
      right={isPanelOpen ? `${panelWidth}px` : '48px'} // Right panel or button bar
      top="70px" // Top navbar height
      bottom="0"
      bg={bgColor}
      overflow="auto"
      transition="right 0.3s ease"
    >
      <Box
        maxW={maxWidth}
        mx="auto"
        px={noPadding ? 0 : { base: 4, md: 6, lg: 8 }}
        py={noPadding ? 0 : { base: 4, md: 6 }}
        h="full"
      >
        {children}
      </Box>
    </Box>
  );
};

// ========================================
// PAGE HEADER
// ========================================

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}

/**
 * Standard page header with title, breadcrumbs, and action buttons
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  actions,
  badge,
}) => {
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');

  return (
    <Box mb={6} pb={4} borderBottom="1px solid" borderColor={borderColor}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb
          mb={2}
          fontSize="sm"
          color={mutedColor}
          separator={<FiChevronRight />}
        >
          {breadcrumbs.map((crumb, index) => (
            <BreadcrumbItem key={index}>
              <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
            </BreadcrumbItem>
          ))}
        </Breadcrumb>
      )}

      <Flex justify="space-between" align="start" gap={4} flexWrap="wrap">
        <Box flex="1" minW="0">
          <HStack spacing={3} mb={subtitle ? 2 : 0}>
            <Heading size="lg" color={textColor} noOfLines={1}>
              {title}
            </Heading>
            {badge}
          </HStack>
          {subtitle && (
            <Text fontSize="md" color={mutedColor} noOfLines={2}>
              {subtitle}
            </Text>
          )}
        </Box>

        {actions && (
          <HStack spacing={2} flexShrink={0}>
            {actions}
          </HStack>
        )}
      </Flex>
    </Box>
  );
};

// ========================================
// PAGE CONTENT
// ========================================

interface PageContentProps {
  children: React.ReactNode;
  noPadding?: boolean;
  maxHeight?: string;
}

/**
 * Main content area - handles scrolling and spacing
 */
export const PageContent: React.FC<PageContentProps> = ({
  children,
  noPadding = false,
  maxHeight,
}) => {
  return (
    <Box
      flex="1"
      overflow="auto"
      p={noPadding ? 0 : 0}
      h={maxHeight || 'auto'}
      position="relative"
    >
      {children}
    </Box>
  );
};

// ========================================
// SECTION
// ========================================

interface PageSectionProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  spacing?: number;
  noDivider?: boolean;
}

/**
 * Content section with optional title and divider
 */
export const PageSection: React.FC<PageSectionProps> = ({
  title,
  subtitle,
  actions,
  children,
  spacing = 4,
  noDivider = false,
}) => {
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');

  return (
    <Box mb={spacing}>
      {(title || actions) && (
        <Flex
          justify="space-between"
          align="start"
          mb={3}
          pb={noDivider ? 0 : 3}
          borderBottom={noDivider ? 'none' : '1px solid'}
          borderColor={borderColor}
        >
          <Box flex="1">
            {title && (
              <Heading size="md" color={textColor} mb={subtitle ? 1 : 0}>
                {title}
              </Heading>
            )}
            {subtitle && (
              <Text fontSize="sm" color={mutedColor}>
                {subtitle}
              </Text>
            )}
          </Box>
          {actions && <HStack spacing={2}>{actions}</HStack>}
        </Flex>
      )}
      {children}
    </Box>
  );
};

// ========================================
// TWO COLUMN LAYOUT
// ========================================

interface TwoColumnLayoutProps {
  left: React.ReactNode;
  right: React.ReactNode;
  leftWidth?: string;
  gap?: number;
  stackOnMobile?: boolean;
}

/**
 * Two-column responsive layout
 */
export const TwoColumnLayout: React.FC<TwoColumnLayoutProps> = ({
  left,
  right,
  leftWidth = '60%',
  gap = 6,
  stackOnMobile = true,
}) => {
  return (
    <Flex
      gap={gap}
      direction={stackOnMobile ? { base: 'column', lg: 'row' } : 'row'}
      h="full"
    >
      <Box flex={stackOnMobile ? { base: '1', lg: leftWidth } : leftWidth}>
        {left}
      </Box>
      <Box flex="1">{right}</Box>
    </Flex>
  );
};

// ========================================
// GRID LAYOUT
// ========================================

interface GridLayoutProps {
  children: React.ReactNode;
  columns?: { base?: number; md?: number; lg?: number; xl?: number };
  gap?: number;
  minChildWidth?: string;
}

/**
 * Responsive grid layout
 */
export const GridLayout: React.FC<GridLayoutProps> = ({
  children,
  columns = { base: 1, md: 2, lg: 3 },
  gap = 4,
  minChildWidth,
}) => {
  return (
    <Box
      display="grid"
      gridTemplateColumns={
        minChildWidth
          ? `repeat(auto-fill, minmax(${minChildWidth}, 1fr))`
          : {
              base: `repeat(${columns.base || 1}, 1fr)`,
              md: `repeat(${columns.md || 2}, 1fr)`,
              lg: `repeat(${columns.lg || 3}, 1fr)`,
              xl: `repeat(${columns.xl || columns.lg || 3}, 1fr)`,
            }
      }
      gap={gap}
    >
      {children}
    </Box>
  );
};
