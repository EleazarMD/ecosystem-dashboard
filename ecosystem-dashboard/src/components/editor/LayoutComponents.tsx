/**
 * Layout Components (Phase 2)
 * Renders multi-column and grid layouts created by Goose
 */

import React from 'react';
import { Box } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { Block } from '@/lib/editor/BlockModel';

// Gap size mapping
const GAP_MAP = {
  xs: '0.5rem',
  sm: '1rem',
  md: '1.5rem',
  lg: '2rem',
  xl: '3rem',
};

interface LayoutProps {
  block: Block;
  children: React.ReactNode;
}

/**
 * Column Layout (side-by-side columns)
 * Used for: 2-column content, 3-column features, sidebar layouts
 */
export const ColumnLayout: React.FC<LayoutProps> = ({ block, children }) => {
  const { layout } = block;
  const columns = layout?.columns || 2;
  const gap = layout?.gap || 'md';
  const alignItems = layout?.alignItems || 'start';
  const justifyContent = layout?.justifyContent || 'start';
  
  const borderColor = useSemanticToken('border.default');
  
  return (
    <Box
      display="grid"
      gridTemplateColumns={`repeat(${columns}, 1fr)`}
      gap={GAP_MAP[gap as keyof typeof GAP_MAP] || GAP_MAP.md}
      alignItems={alignItems}
      justifyContent={justifyContent}
      width="100%"
      my={4}
      // Optional: Show layout structure in edit mode
      borderLeft="3px solid"
      borderColor={borderColor}
      pl={2}
    >
      {children}
    </Box>
  );
};

/**
 * Grid Layout (flexible grid)
 * Used for: Image galleries, card grids, product catalogs
 */
export const GridLayout: React.FC<LayoutProps> = ({ block, children }) => {
  const { layout } = block;
  const columns = layout?.columns || 3;
  const gap = layout?.gap || 'md';
  
  const borderColor = useSemanticToken('border.default');
  
  return (
    <Box
      display="grid"
      // Auto-fit: Responsive grid that adjusts to screen size
      gridTemplateColumns={`repeat(auto-fit, minmax(200px, 1fr))`}
      // Fixed columns for consistent layout
      // gridTemplateColumns={`repeat(${columns}, 1fr)`}
      gap={GAP_MAP[gap as keyof typeof GAP_MAP] || GAP_MAP.md}
      width="100%"
      my={4}
      // Optional: Show layout structure in edit mode
      borderLeft="3px solid"
      borderColor={borderColor}
      pl={2}
    >
      {children}
    </Box>
  );
};

/**
 * Column Item (wrapper for content in a column)
 * Provides consistent spacing and styling
 */
export const ColumnItem: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const bg = 'transparent';
  const borderColor = useSemanticToken('border.subtle');
  
  return (
    <Box
      bg={bg}
      p={2}
      borderRadius="md"
      // Optional: Visual boundary for columns
      border="1px solid"
      borderColor={borderColor}
      height="100%"
    >
      {children}
    </Box>
  );
};

/**
 * Grid Item (wrapper for content in a grid)
 * Provides consistent card-like appearance
 */
export const GridItem: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const bg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  
  return (
    <Box
      bg={bg}
      p={3}
      borderRadius="lg"
      border="1px solid"
      borderColor={borderColor}
      boxShadow="sm"
      height="100%"
      transition="all 0.2s"
      _hover={{
        boxShadow: 'md',
        transform: 'translateY(-2px)',
      }}
    >
      {children}
    </Box>
  );
};
