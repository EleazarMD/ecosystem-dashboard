import React from 'react';
import { Box, BoxProps } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { motion } from 'framer-motion';
import { useSsr } from '@/hooks/useSsr';

// Motion Box component for animations
const MotionBox = motion(Box);

interface MaterialProps {
  background: string;
  backdropFilter: string;
  border: string;
  boxShadow: string;
}

export interface GlassPanelProps extends Omit<BoxProps, 'transition'> {
  variant?: 'light' | 'medium' | 'heavy';
  elevation?: 1 | 2 | 3 | 4;
  blur?: 'light' | 'medium' | 'heavy';
  gradient?: string;
  animated?: boolean;
  hoverEffect?: boolean;
  children: React.ReactNode;
}

/**
 * GlassPanel - Apple-inspired glass morphism panel component
 * 
 * Features:
 * - Multiple glass variants (light, medium, heavy)
 * - Elevation levels for depth
 * - Optional animations and hover effects
 * - Dark/light mode support
 * - Customizable gradients
 */
export const GlassPanel: React.FC<GlassPanelProps> = ({
  variant = 'medium',
  elevation = 2,
  blur = 'medium',
  gradient,
  animated = false,
  hoverEffect = true,
  children,
  ...props
}) => {
  // Use semantic tokens for theme adaptation
  const glassBackground = useSemanticToken('glass.background');
  const glassBorder = useSemanticToken('glass.border');
  const glassShadow = useSemanticToken('glass.shadow');
  const glassBlur = useSemanticToken('glass.blur');

  // Hover states
  const glassBackgroundHover = useSemanticToken('glass.backgroundHover');
  const glassShadowHover = useSemanticToken('glass.shadowHover');

  // Animation variants
  const animationVariants = {
    initial: { opacity: 0, y: 20, scale: 0.95 },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1],
      },
    },
    hover: hoverEffect ? {
      y: -2,
      scale: 1.02,
      backgroundColor: glassBackgroundHover,
      boxShadow: glassShadowHover,
      transition: {
        duration: 0.2,
        ease: [0.4, 0, 0.2, 1],
      },
    } : {},
  };

  // Elevation shadows (additive to glass shadow)
  const elevationShadows = {
    1: '0 1px 3px rgba(0, 0, 0, 0.1)',
    2: '0 4px 6px rgba(0, 0, 0, 0.1)',
    3: '0 10px 15px rgba(0, 0, 0, 0.1)',
    4: '0 20px 25px rgba(0, 0, 0, 0.15)',
  };

  const isSsr = useSsr();

  const baseProps = {
    borderRadius: 'xl',
    overflow: 'hidden',
    position: 'relative' as const,
    bg: gradient || glassBackground,
    backdropFilter: `blur(${glassBlur}) saturate(180%)`,
    border: glassBorder,
    boxShadow: `${glassShadow}, ${elevationShadows[elevation]}`,
    ...props,
  };

  // Render a simple box on the server to avoid SSR issues
  if (isSsr) {
    return (
      <Box borderRadius="xl" {...props}>
        {children}
      </Box>
    );
  }

  if (animated) {
    return (
      <MotionBox
        variants={animationVariants}
        initial="initial"
        animate="animate"
        whileHover="hover"
        {...baseProps}
      >
        {children}
      </MotionBox>
    );
  }

  return (
    <Box
      {...baseProps}
      _hover={hoverEffect ? {
        transform: 'translateY(-2px)',
        bg: glassBackgroundHover,
        boxShadow: glassShadowHover,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      } : {}}
    >
      {children}
    </Box>
  );
};

export default GlassPanel;
