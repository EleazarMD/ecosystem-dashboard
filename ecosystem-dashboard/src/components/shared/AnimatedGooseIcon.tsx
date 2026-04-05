/**
 * Animated Goose Icon Component
 * Shows different animations based on state
 */

import { Box, BoxProps } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';

export type GooseState = 'idle' | 'flying' | 'thinking' | 'fast';

interface AnimatedGooseIconProps extends BoxProps {
  state?: GooseState;
  size?: string | number;
}

export function AnimatedGooseIcon({
  state = 'idle',
  size = '48px',
  ...boxProps
}: AnimatedGooseIconProps) {
  const getGooseImage = () => {
    switch (state) {
      case 'flying':
        return '/goose-flying-once.gif';
      case 'thinking':
        return '/goose-flying.gif';
      case 'fast':
        return '/goose-flying-fast.gif';
      case 'idle':
      default:
        return '/goose-icon.png';
    }
  };

  const glassStyles = useAdaptiveGlass({
    intensity: 0.2,
    shadow: true,
  });

  const gooseFilter = 'none';

  return (
    <Box
      width={size}
      height={size}
      display="flex"
      alignItems="center"
      justifyContent="center"
      borderRadius="full"
      bg={glassStyles.background}
      backdropFilter={glassStyles.backdropFilter}
      border={glassStyles.border}
      boxShadow={glassStyles.boxShadow}
      {...boxProps}
    >
      <Box
        as="img"
        src={getGooseImage()}
        alt="Goose AI"
        w="75%"
        h="75%"
        filter={gooseFilter}
        transition="all 0.3s ease"
        objectFit="contain"
      />
    </Box>
  );
}

