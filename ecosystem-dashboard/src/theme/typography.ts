/**
 * Professional Typography System
 * Inspired by Linear, Vercel, and modern design systems
 */

export const typography = {
  // Font families - professional pairings
  fonts: {
    heading: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
    body: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
    mono: `'JetBrains Mono', 'Fira Code', 'Monaco', 'Courier New', monospace`,
  },

  // Type scale - modular scale (1.250 - Major Third)
  fontSizes: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    md: '1rem',       // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',    // 48px
    '6xl': '3.75rem', // 60px
    '7xl': '4.5rem',  // 72px
  },

  // Font weights - semantic naming
  fontWeights: {
    hairline: 100,
    thin: 200,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },

  // Line heights - optimal readability
  lineHeights: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },

  // Letter spacing - subtle refinements
  letterSpacings: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },

  // Text styles - predefined combinations
  textStyles: {
    // Display - hero headings
    display: {
      fontSize: ['4xl', '5xl', '6xl'],
      fontWeight: 'bold',
      lineHeight: 'none',
      letterSpacing: 'tight',
    },

    // H1 - page titles
    h1: {
      fontSize: ['3xl', '4xl', '5xl'],
      fontWeight: 'bold',
      lineHeight: 'tight',
      letterSpacing: 'tight',
    },

    // H2 - section headers
    h2: {
      fontSize: ['2xl', '3xl', '4xl'],
      fontWeight: 'semibold',
      lineHeight: 'tight',
      letterSpacing: 'tight',
    },

    // H3 - subsection headers
    h3: {
      fontSize: ['xl', '2xl', '3xl'],
      fontWeight: 'semibold',
      lineHeight: 'snug',
      letterSpacing: 'normal',
    },

    // H4 - card titles
    h4: {
      fontSize: ['lg', 'xl', '2xl'],
      fontWeight: 'semibold',
      lineHeight: 'snug',
      letterSpacing: 'normal',
    },

    // Body large - emphasis
    bodyLarge: {
      fontSize: 'lg',
      fontWeight: 'normal',
      lineHeight: 'relaxed',
      letterSpacing: 'normal',
    },

    // Body - default text
    body: {
      fontSize: 'md',
      fontWeight: 'normal',
      lineHeight: 'normal',
      letterSpacing: 'normal',
    },

    // Body small - secondary text
    bodySmall: {
      fontSize: 'sm',
      fontWeight: 'normal',
      lineHeight: 'normal',
      letterSpacing: 'normal',
    },

    // Caption - meta information
    caption: {
      fontSize: 'xs',
      fontWeight: 'medium',
      lineHeight: 'tight',
      letterSpacing: 'wide',
      textTransform: 'uppercase',
    },

    // Label - form labels
    label: {
      fontSize: 'sm',
      fontWeight: 'medium',
      lineHeight: 'tight',
      letterSpacing: 'wide',
    },

    // Code - inline code
    code: {
      fontSize: 'sm',
      fontFamily: 'mono',
      lineHeight: 'normal',
      letterSpacing: 'normal',
    },
  },
};

// Google Fonts import URL for Inter
export const FONT_IMPORT_URL = 'https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap';

// JetBrains Mono for code
export const MONO_FONT_URL = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap';
