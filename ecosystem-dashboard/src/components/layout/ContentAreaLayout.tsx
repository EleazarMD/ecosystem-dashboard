import React from 'react';
import { Box, useToken } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { motion } from 'framer-motion';
import { useSidebar } from '../../contexts/SidebarContext';
import { useRightPanel } from '../../contexts/RightPanelContext';
import { useFeatureFlags } from '../../contexts/FeatureFlagsContext';

const MotionBox = motion(Box);

interface ContentAreaLayoutProps {
  children: React.ReactNode;
  leftPanelWidth: number;
  leftPanelCollapsed?: boolean;
  showInputArea?: boolean;
  inputComponent?: React.ReactNode;
  topOffset?: string;
  bottomInputHeight?: string;
  isEmpty?: boolean; // Whether content area is empty (for centering)
  maxWidth?: string; // Custom max width constraint (default: '4xl')
  centerInputWhenEmpty?: boolean; // Whether to center input when empty (for animations)
}

/**
 * Shared layout component for main content areas
 * Used by both AI Research and Podcast Studio pages
 * 
 * Handles:
 * - Left panel margin calculation
 * - Right panel margin calculation
 * - Fixed positioning
 * - Scroll behavior
 * - Input area positioning (grounded at bottom)
 * - Content centering (when isEmpty=true)
 * - Max width constraint (4xl)
 * - Vertical padding (when content exists)
 * 
 * @param isEmpty - When true, centers content vertically (for empty states)
 *                  When false, aligns to top with padding (for scrollable content)
 */
export default function ContentAreaLayout({
  children,
  leftPanelWidth,
  leftPanelCollapsed = false,
  showInputArea = false,
  inputComponent,
  topOffset = '60px',
  bottomInputHeight = '90px',
  isEmpty = false,
  maxWidth = '4xl',
  centerInputWhenEmpty = false,
}: ContentAreaLayoutProps) {
  const { width: sidebarWidth } = useSidebar();
  const { isOpen: isRightPanelOpen, width: rightPanelWidth } = useRightPanel();
  const { flags } = useFeatureFlags();
  
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const glassBackground = useSemanticToken('glass.background');
  const glassBorder = useSemanticToken('glass.border');
  const glassShadow = useSemanticToken('glass.shadow');
  
  // Glassmorphic styling
  const glassEnabled = flags?.enableGlassmorphicDesign ?? false;
  
  // Calculate margins based on panel states
  // Add spacing (16px) between panels for glassmorphic separation
  const spacing = glassEnabled ? 16 : 0;
  const leftMargin = leftPanelCollapsed 
    ? `${sidebarWidth + 50 + spacing}px` 
    : `${sidebarWidth + leftPanelWidth + spacing}px`;
    
  // Right panel: full width when open, icon bar width (50px) when collapsed
  // Add spacing on the right side as well
  const rightMargin = isRightPanelOpen ? `${rightPanelWidth + spacing}px` : `${50 + spacing}px`;

  return (
    <MotionBox
      position="fixed"
      top={glassEnabled ? `calc(${topOffset} + 16px)` : topOffset}
      bottom={glassEnabled ? '32px' : '0'}
      bg={glassEnabled ? glassBackground : bgColor}
      backdropFilter={glassEnabled ? 'blur(8px) saturate(120%)' : 'none'}
      borderRadius={glassEnabled ? '2xl' : '0'}
      border={glassEnabled ? '1px solid' : 'none'}
      borderColor={glassEnabled ? borderColor : 'transparent'}
      boxShadow={glassEnabled ? glassShadow : 'none'}
      display="flex" 
      flexDirection="column"
      overflow="hidden"
      animate={{
        left: leftMargin,
        right: rightMargin,
      }}
      transition={{
        type: 'spring',
        stiffness: 220,
        damping: 32,
        mass: 1.0,
      }}
      style={{
        transition: 'background 0.3s ease, border 0.3s ease, box-shadow 0.3s ease',
      }}
    >
      {/* Scrollable content area */}
      <Box 
        flex="1" 
        overflowY="auto" 
        overflowX="hidden"
        display="flex"
        flexDirection="column"
        css={{
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#A0AEC0',
            borderRadius: '4px',
          },
        }}
      >
        {/* Content wrapper with centering logic */}
        <Box 
          maxW={maxWidth} 
          mx="auto" 
          w="full"
          minH="full"
          h="full"
          display={isEmpty ? "flex" : "block"}
          flexDirection={isEmpty ? "column" : undefined}
          justifyContent={isEmpty ? "center" : undefined}
          alignItems={isEmpty ? "center" : undefined}
          pt={isEmpty ? 0 : 8}
          pb={isEmpty ? 0 : 4}
        >
          {children}
        </Box>
      </Box>

      {/* Input area - smooth Framer Motion animation from center to bottom */}
      {showInputArea && inputComponent && (
        <MotionBox
          initial={false}
          animate={
            isEmpty
              ? {
                  position: 'absolute' as any,
                  top: '50%',
                  left: '50%',
                  bottom: 'auto',
                  right: 'auto',
                  x: '-50%',
                  y: '-50%',
                  width: 'calc(100% - 32px)',
                  scale: 0.75,
                }
              : {
                  position: 'sticky' as any,
                  top: 'auto',
                  left: 0,
                  bottom: 0,
                  right: 0,
                  x: 0,
                  y: 0,
                  width: '100%',
                  scale: 0.75,
                }
          }
          transition={{
            type: 'spring',
            stiffness: 80,
            damping: 20,
            mass: 1.2,
          }}
          bg="transparent"
          p={4}
          flexShrink={0}
          zIndex={10}
        >
          <Box maxW={maxWidth} mx="auto">
            {inputComponent}
          </Box>
        </MotionBox>
      )}
    </MotionBox>
  );
}
