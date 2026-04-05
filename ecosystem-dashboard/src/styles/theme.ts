import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

// Type definitions for theme elements
// ============================================================
export type GlassMaterial = {
  background: string;
  backdropFilter: string;
  border: string;
  boxShadow: string;
};

export type StatusColors = {
  healthy: string;
  warning: string;
  error: string;
  info: string;
  gradients: {
    healthy: string;
    warning: string;
    error: string;
    info: string;
  };
};

export type DomainColors = {
  [key: string]: {
    primary: string;
    gradient: string;
    light: string;
  };
};

// Glass Morphism Design System - Apple Liquid Glass Inspired
// ============================================================

// Glass Material Properties
export const glassMaterials = {
  light: {
    background: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  },
  medium: {
    background: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 12px 48px rgba(0, 0, 0, 0.15)',
  },
  heavy: {
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(40px)',
    border: '1px solid rgba(255, 255, 255, 0.4)',
    boxShadow: '0 16px 64px rgba(0, 0, 0, 0.2)',
  },
  dark: {
    light: {
      background: 'rgba(0, 0, 0, 0.3)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    },
    medium: {
      background: 'rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      boxShadow: '0 12px 48px rgba(0, 0, 0, 0.4)',
    },
    heavy: {
      background: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(40px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      boxShadow: '0 16px 64px rgba(0, 0, 0, 0.5)',
    },
  },
};

// Enhanced Status Colors with Gradients
export const statusColors = {
  healthy: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  gradients: {
    healthy: 'linear-gradient(135deg, #10B981, #059669)',
    warning: 'linear-gradient(135deg, #F59E0B, #D97706)',
    error: 'linear-gradient(135deg, #EF4444, #DC2626)',
    info: 'linear-gradient(135deg, #3B82F6, #2563EB)',
  },
};

// Sophisticated Domain Colors
export const domainColors = {
  infrastructure: {
    primary: '#3B82F6',
    gradient: 'linear-gradient(135deg, #3B82F6, #1E40AF)',
    light: 'rgba(59, 130, 246, 0.1)',
  },
  knowledge: {
    primary: '#8B5CF6',
    gradient: 'linear-gradient(135deg, #8B5CF6, #5B21B6)',
    light: 'rgba(139, 92, 246, 0.1)',
  },
  aiSystems: {
    primary: '#06B6D4',
    gradient: 'linear-gradient(135deg, #06B6D4, #0891B2)',
    light: 'rgba(6, 182, 212, 0.1)',
  },
  platforms: {
    primary: '#F59E0B',
    gradient: 'linear-gradient(135deg, #F59E0B, #D97706)',
    light: 'rgba(245, 158, 11, 0.1)',
  },
};

// Modern Color Palette
const colors = {
  brand: {
    50: '#F0F7FF',
    100: '#D6E9FF',
    200: '#B2D6FF',
    300: '#85C0FF',
    400: '#57A8FF',
    500: '#2990FF',
    600: '#0077F7',
    700: '#005CC5',
    800: '#004494',
    900: '#002E63',
  },
  gray: {
    50: '#f7fafc',
    100: '#edf2f7',
    200: '#e2e8f0',
    300: '#cbd5e0',
    400: '#a0aec0',
    500: '#718096',
    600: '#4a5568',
    700: '#2d3748',
    800: '#1a202c',
    900: '#171923',
  },
  status: statusColors,
  domain: domainColors,
};

// Typography System - Apple SF Pro inspired
const fonts = {
  heading: `'SF Pro Display', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`,
  body: `'SF Pro Text', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`,
  mono: `'SF Mono', 'JetBrains Mono', 'Fira Code', Consolas, 'Liberation Mono', Menlo, monospace`,
};

const fontSizes = {
  xs: '0.75rem',   // 12px
  sm: '0.875rem',  // 14px
  md: '1rem',      // 16px
  lg: '1.125rem',  // 18px
  xl: '1.25rem',   // 20px
  '2xl': '1.5rem', // 24px
  '3xl': '1.875rem', // 30px
  '4xl': '2.25rem',  // 36px
  '5xl': '3rem',     // 48px
  '6xl': '3.75rem',  // 60px
};

const fontWeights = {
  hairline: 100,
  thin: 200,
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
};

// Spacing System
const space = {
  px: '1px',
  0.5: '0.125rem', // 2px
  1: '0.25rem',    // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem',     // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem',    // 12px
  3.5: '0.875rem', // 14px
  4: '1rem',       // 16px
  5: '1.25rem',    // 20px
  6: '1.5rem',     // 24px
  7: '1.75rem',    // 28px
  8: '2rem',       // 32px
  9: '2.25rem',    // 36px
  10: '2.5rem',    // 40px
  12: '3rem',      // 48px
  14: '3.5rem',    // 56px
  16: '4rem',      // 64px
  20: '5rem',      // 80px
  24: '6rem',      // 96px
  28: '7rem',      // 112px
  32: '8rem',      // 128px
};

// Border Radius
const radii = {
  none: '0',
  sm: '0.125rem',   // 2px
  base: '0.25rem',  // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  '3xl': '1.5rem',  // 24px
  full: '9999px',
};

// Shadows
const shadows = {
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  // Glass shadows
  glass: '0 8px 32px rgba(0, 0, 0, 0.1)',
  glassHover: '0 12px 48px rgba(0, 0, 0, 0.15)',
  glassActive: '0 4px 16px rgba(0, 0, 0, 0.1)',
};

// Component Styles
const components = {
  // Glass Panel Base Component
  Card: {
    baseStyle: {
      borderRadius: 'xl',
      overflow: 'hidden',
    },
    variants: {
      glass: {
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: 'glass',
        _hover: {
          transform: 'translateY(-2px)',
          boxShadow: 'glassHover',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
      },
      'glass-light': {
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: 'sm',
      },
      'glass-heavy': {
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(40px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '2xl',
      },
    },
    defaultProps: {
      variant: 'glass',
    },
  },
  
  // Button Enhancements
  Button: {
    baseStyle: {
      fontWeight: 'medium',
      borderRadius: 'lg',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      _focus: {
        boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
      },
    },
    variants: {
      glass: {
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        color: 'white',
        _hover: {
          background: 'rgba(255, 255, 255, 0.9)',
          transform: 'translateY(-1px)',
          boxShadow: 'lg',
        },
        _active: {
          transform: 'translateY(0)',
          boxShadow: 'md',
        },
      },
    },
  },
  
  // Input Enhancements
  Input: {
    variants: {
      glass: {
        field: {
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: 'lg',
          _focus: {
            borderColor: 'brand.500',
            boxShadow: '0 0 0 1px rgba(59, 130, 246, 0.3)',
          },
        },
      },
    },
  },
  
  // Drawer for Navigation
  Drawer: {
    baseStyle: {
      dialog: {
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(40px)',
      },
    },
  },
};

// Global Styles
const styles = {
  global: (props: any) => ({
    ':root': {
      '--glass-light-background': 'rgba(255, 255, 255, 0.5)',
      '--glass-light-backdrop-filter': 'blur(12px)',
      '--glass-light-border': '1px solid rgba(255, 255, 255, 0.7)',
      '--glass-light-box-shadow': '0 4px 20px rgba(0, 0, 0, 0.05)',
      '--glass-medium-background': 'rgba(255, 255, 255, 0.7)',
      '--glass-medium-backdrop-filter': 'blur(16px)',
      '--glass-medium-border': '1px solid rgba(255, 255, 255, 0.9)',
      '--glass-medium-box-shadow': '0 8px 30px rgba(0, 0, 0, 0.1)',
      '--glass-heavy-background': 'rgba(255, 255, 255, 0.8)',
      '--glass-heavy-backdrop-filter': 'blur(24px)',
      '--glass-heavy-border': '1px solid rgba(255, 255, 255, 1.0)',
      '--glass-heavy-box-shadow': '0 12px 40px rgba(0, 0, 0, 0.15)',
    },
    '[data-theme="dark"]': {
      '--glass-light-background': 'rgba(29, 39, 53, 0.6)',
      '--glass-light-backdrop-filter': 'blur(12px)',
      '--glass-light-border': '1px solid rgba(255, 255, 255, 0.08)',
      '--glass-light-box-shadow': '0 4px 20px rgba(0, 0, 0, 0.2)',
      '--glass-medium-background': 'rgba(29, 39, 53, 0.75)',
      '--glass-medium-backdrop-filter': 'blur(16px)',
      '--glass-medium-border': '1px solid rgba(255, 255, 255, 0.1)',
      '--glass-medium-box-shadow': '0 8px 30px rgba(0, 0, 0, 0.3)',
      '--glass-heavy-background': 'rgba(29, 39, 53, 0.85)',
      '--glass-heavy-backdrop-filter': 'blur(24px)',
      '--glass-heavy-border': '1px solid rgba(255, 255, 255, 0.12)',
      '--glass-heavy-box-shadow': '0 12px 40px rgba(0, 0, 0, 0.4)',
    },
    'html, body': {
      fontFamily: 'body',
      color: props.colorMode === 'dark' ? 'gray.50' : 'gray.800',
      background: props.colorMode === 'dark'
        ? 'radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%)'
        : 'linear-gradient(180deg, #FFFFFF 0%, #F8F9FA 100%)',
      backgroundAttachment: 'fixed',
      minHeight: '100vh',
    },
    '#__next': {
      background: props.colorMode === 'dark' 
        ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
        : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      backgroundAttachment: 'fixed',
      minHeight: '100vh',
    },
    '*::placeholder': {
      color: props.colorMode === 'dark' ? 'whiteAlpha.400' : 'gray.400',
    },
    '*, *::before, &::after': {
      borderColor: props.colorMode === 'dark' ? 'whiteAlpha.300' : 'gray.200',
    },
    // Glass utility classes
    '.glass-light': {
      background: props.colorMode === 'dark' 
        ? glassMaterials.dark.light.background 
        : glassMaterials.light.background,
      backdropFilter: glassMaterials.light.backdropFilter,
      border: props.colorMode === 'dark' 
        ? glassMaterials.dark.light.border 
        : glassMaterials.light.border,
      borderRadius: 'xl',
    },
    '.glass-medium': {
      background: props.colorMode === 'dark' 
        ? glassMaterials.dark.medium.background 
        : glassMaterials.medium.background,
      backdropFilter: glassMaterials.medium.backdropFilter,
      border: props.colorMode === 'dark' 
        ? glassMaterials.dark.medium.border 
        : glassMaterials.medium.border,
      borderRadius: 'xl',
    },
    '.glass-heavy': {
      background: props.colorMode === 'dark' 
        ? glassMaterials.dark.heavy.background 
        : glassMaterials.heavy.background,
      backdropFilter: glassMaterials.heavy.backdropFilter,
      border: props.colorMode === 'dark' 
        ? glassMaterials.dark.heavy.border 
        : glassMaterials.heavy.border,
      borderRadius: 'xl',
    },
    // Animation utilities
    '.animate-float': {
      animation: 'float 6s ease-in-out infinite',
    },
    '@keyframes float': {
      '0%, 100%': { transform: 'translateY(0px)' },
      '50%': { transform: 'translateY(-10px)' },
    },
    '.animate-pulse-glow': {
      animation: 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    },
    '@keyframes pulse-glow': {
      '0%, 100%': { 
        opacity: 1,
        boxShadow: '0 0 0 0 rgba(59, 130, 246, 0.7)',
      },
      '50%': { 
        opacity: 0.8,
        boxShadow: '0 0 0 10px rgba(59, 130, 246, 0)',
      },
    },
  }),
};

// Theme Configuration
const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
  disableTransitionOnChange: false,
};

// Create the enhanced theme
const theme = extendTheme({
  config,
  colors,
  fonts,
  fontSizes,
  fontWeights,
  space,
  radii,
  shadows,
  components,
  styles,
});

export default theme;
