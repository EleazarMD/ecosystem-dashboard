import React from 'react';
import { Box, BoxProps } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';

export interface SimpleGlassPanelProps extends BoxProps {
  variant?: 'light' | 'medium' | 'heavy';
  children: React.ReactNode;
}

/**
 * SimpleGlassPanel - Lightweight glass morphism panel without animations
 * Designed to prevent SSR crashes while maintaining glass styling
 */
export const SimpleGlassPanel: React.FC<SimpleGlassPanelProps> = ({
  variant = 'medium',
  children,
  ...props
}) => {
  // Use semantic tokens for proper theme integration
  const glassBackground = useSemanticToken('glass.background');
  const glassBorder = useSemanticToken('glass.border');
  const glassShadow = useSemanticToken('glass.shadow');
  const glassBlur = useSemanticToken('glass.blur');
  const glassBackgroundHover = useSemanticToken('glass.backgroundHover');
  const glassShadowHover = useSemanticToken('glass.shadowHover');

  const blurMap = {
    light: '8px',
    medium: '12px',
    heavy: '16px',
  };

  return (
    <Box
      borderRadius="xl"
      overflow="hidden"
      position="relative"
      transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      suppressHydrationWarning
      bg={glassBackground}
      backdropFilter={`blur(${blurMap[variant]}) saturate(180%)`}
      border={glassBorder}
      boxShadow={glassShadow}
      _hover={{
        transform: 'translateY(-2px)',
        bg: glassBackgroundHover,
        boxShadow: glassShadowHover,
      }}
      {...props}
    >
      {children}
    </Box>
  );
};

export default SimpleGlassPanel;
