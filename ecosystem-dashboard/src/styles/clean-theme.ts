import { extendTheme, theme as baseTheme } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';

// Create a clean theme that relies on Chakra UI's defaults with minimal customization
const cleanTheme = extendTheme({
  // Use explicit reference to baseTheme to ensure we get all default tokens
  ...baseTheme,
  // Only override what's absolutely necessary
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  },
});

export default cleanTheme;
