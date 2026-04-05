/**
 * Theme Indicator
 * 
 * Shows which theme is currently active (only in development)
 */

import { useState, useEffect } from 'react';
import { Box, HStack, Text, Badge } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { useTheme } from '@/theme/ThemeProvider';

export function ThemeIndicator() {
  const { currentTheme, themeEnabled } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  if (!themeEnabled) {
    return null;
  }

  // Don't render on server - wait for client mount
  if (!mounted) {
    return null;
  }

  return (
    <Box
      position="fixed"
      top={2}
      left="50%"
      transform="translateX(-50%)"
      zIndex={9999}
      pointerEvents="none"
      suppressHydrationWarning
    >
      <HStack
        bg={currentTheme.primary}
        color="whiteAlpha.900"
        px={3}
        py={1}
        borderRadius="full"
        boxShadow="lg"
        fontSize="xs"
        fontWeight="bold"
      >
        <Text>🎨</Text>
        <Text>{currentTheme.name}</Text>
        <Badge
          colorScheme={currentTheme.mode === 'dark' ? 'purple' : 'yellow'}
          fontSize="xs"
        >
          {currentTheme.mode}
        </Badge>
      </HStack>
    </Box>
  );
}
