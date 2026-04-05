import { extendTheme } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';

// Create a theme that includes both Chakra UI and Material UI token patterns
const bridgedTheme = extendTheme({
  // Toast component configuration for subtle, transient notifications
  components: {
    Toast: {
      baseStyle: {
        container: {
          borderRadius: 'md',
          fontSize: 'sm',
          boxShadow: 'sm',
          opacity: 0.9,
          transition: 'all 0.2s ease',
          _hover: { opacity: 1 },
        },
        title: {
          fontSize: 'sm',
          fontWeight: 'medium',
          mb: 0,
        },
        description: {
          fontSize: 'xs',
        },
      },
      defaultProps: {
        variant: 'subtle',
        position: 'bottom-right',
        duration: 4000,
        isClosable: true,
      },
    },
    // Ensure Stat components are properly styled and contextualized
    Stat: {
      baseStyle: {
        container: {
          flex: 1,
          position: 'relative',
        },
        label: {
          fontSize: 'sm',
          fontWeight: 'medium',
          color: 'gray.500',
          marginBottom: 1,
        },
        number: {
          fontSize: 'xl',
          fontWeight: 'semibold',
          color: 'inherit',
        },
        helpText: {
          fontSize: 'xs',
          color: 'gray.500',
        },
      },
    },
  },
  
  // Override configuration
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  },

  // Combined font weights (Chakra UI + Material UI patterns)
  fontWeights: {
    // Chakra UI tokens
    hairline: 100,
    thin: 200,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
    
    // Material UI compatibility tokens
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
  },

  // Colors
  colors: {
    brand: {
      primary: '#3f51b5',
      secondary: '#ff4081',
      infrastructure: '#4285f4',
      knowledge: '#34a853',
      aiSystems: '#ea4335',
      platforms: '#fbbc05',
      healthy: '#34a853',
      warning: '#fbbc05',
      error: '#ea4335',
    },
  },

  // Typography
  fonts: {
    heading: '"Roboto", sans-serif',
    body: '"Roboto", sans-serif',
  },

  // Global styles
  styles: {
    global: {
      body: {
        bg: '#f8f9fa',
        color: '#212529',
      },
    },
  },
});

export default bridgedTheme;
