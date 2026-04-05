/**
 * Professional Theme Presets
 * High-end SaaS aesthetics inspired by industry leaders
 * Designed for serious work, high data density, and long sessions
 */

import { ThemePreset } from './types';

// Default configuration helpers
const defaultTypography = {
  fontHeading: '"Inter", -apple-system, system-ui, sans-serif',
  fontBody: '"Inter", -apple-system, system-ui, sans-serif',
  fontMono: '"JetBrains Mono", monospace',
  fontSizeScale: 'md' as const,
};

const defaultRadii = {
  card: '16px',
  button: '8px',
  input: '8px',
  modal: '16px',
};

const defaultShadows = {
  card: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  cardHover: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  popover: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  modal: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
};

const defaultComponents = {
  Card: { variant: 'elevated' as const },
  Button: { variant: 'solid' as const },
  Input: { variant: 'outline' as const },
};

/**
 * Obsidian Pro - The "Linear" Look
 */
export const obsidianPro: ThemePreset = {
  id: 'obsidian-pro',
  name: 'Obsidian Pro',
  description: 'Premium high-density dark theme for engineering focus',
  mode: 'dark',

  colors: {
    primary: '#5E6AD2',
    primaryHover: '#4E5AC0',
    primaryActive: '#3E4AB0',
    secondary: '#27272A',
    secondaryHover: '#3F3F46',
    accent: '#5E6AD2',
    accentHover: '#7C85E0',

    background: '#0E0E10',
    backgroundSecondary: '#18181B',
    backgroundTertiary: '#27272A',

    text: '#EDEDEF',
    textSecondary: '#A1A1AA',
    textMuted: '#71717A',
    textInverse: '#0E0E10',

    border: 'rgba(39, 39, 42, 0.5)',
    borderHover: 'rgba(63, 63, 70, 0.5)',

    glassBackground: 'rgba(24, 24, 27, 0.75)',
    glassBorder: '1px solid rgba(255, 255, 255, 0.08)',
  },

  typography: defaultTypography,
  radii: {
    ...defaultRadii,
    card: '8px', // Tighter radius for pro look
    button: '6px',
    input: '6px',
  },
  shadows: defaultShadows,
  components: defaultComponents,

  glassBlur: '12px',
  density: 'compact', // Higher density
};

/**
 * Enterprise Light - The "Stripe/Vercel" Look
 */
export const enterpriseLight: ThemePreset = {
  id: 'enterprise-light',
  name: 'Enterprise Light',
  description: 'Clean, crisp, data-first aesthetic',
  mode: 'light',

  colors: {
    primary: '#171717',
    primaryHover: '#262626',
    primaryActive: '#404040',
    secondary: '#FAFAFA',
    secondaryHover: '#F5F5F5',
    accent: '#2563EB',
    accentHover: '#1D4ED8',

    background: '#FFFFFF',
    backgroundSecondary: '#FAFAFA',
    backgroundTertiary: '#F5F5F5',

    text: '#171717',
    textSecondary: '#525252',
    textMuted: '#737373',
    textInverse: '#FFFFFF',

    border: '#E5E5E5',
    borderHover: '#D4D4D4',

    glassBackground: 'rgba(255, 255, 255, 0.8)',
    glassBorder: '1px solid rgba(0, 0, 0, 0.06)',
  },

  typography: defaultTypography,
  radii: defaultRadii,
  shadows: defaultShadows,
  components: defaultComponents,

  glassBlur: '16px',
  density: 'comfortable',
};

/**
 * Midnight Slate - The "GitHub Dimmed" Look
 */
export const midnightSlate: ThemePreset = {
  id: 'midnight-slate',
  name: 'Midnight Slate',
  description: 'Calm blue-grey theme optimized for long sessions',
  mode: 'dark',

  colors: {
    primary: '#58A6FF',
    primaryHover: '#79C0FF',
    primaryActive: '#1F6FEB',
    secondary: '#161B22',
    secondaryHover: '#21262D',
    accent: '#238636',
    accentHover: '#2EA043',

    background: '#0D1117',
    backgroundSecondary: '#161B22',
    backgroundTertiary: '#21262D',

    text: '#C9D1D9',
    textSecondary: '#8B949E',
    textMuted: '#6E7681',
    textInverse: '#0D1117',

    border: 'rgba(48, 54, 61, 0.7)',
    borderHover: 'rgba(139, 148, 158, 0.5)',

    glassBackground: 'rgba(22, 27, 34, 0.8)',
    glassBorder: '1px solid rgba(48, 54, 61, 0.8)',
  },

  typography: {
    ...defaultTypography,
    fontMono: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
  },
  radii: {
    ...defaultRadii,
    card: '6px',
    button: '6px',
    input: '6px',
  },
  shadows: defaultShadows,
  components: defaultComponents,

  glassBlur: '12px',
  density: 'compact',
};

/**
 * Executive Lounge - Image Background Demo
 */
export const executiveLounge: ThemePreset = {
  id: 'executive-lounge',
  name: 'Executive Lounge',
  description: 'Immersive corporate environment with city view',
  mode: 'dark',

  colors: {
    primary: '#C0A060',
    primaryHover: '#D4B875',
    primaryActive: '#A6884A',
    secondary: '#141414',
    secondaryHover: '#1A1A1A',
    accent: '#C0A060',
    accentHover: '#D4B875',

    background: '#000000', // Fallback
    backgroundSecondary: 'rgba(20, 20, 20, 0.85)',
    backgroundTertiary: 'rgba(20, 20, 20, 0.7)',

    text: '#FFFFFF',
    textSecondary: '#E5E5E5',
    textMuted: '#A3A3A3',
    textInverse: '#000000',

    border: 'rgba(192, 160, 96, 0.3)',
    borderHover: 'rgba(192, 160, 96, 0.5)',

    glassBackground: 'rgba(10, 10, 10, 0.75)',
    glassBorder: '1px solid rgba(192, 160, 96, 0.2)',
  },

  typography: {
    ...defaultTypography,
    fontHeading: '"Playfair Display", serif',
  },
  radii: defaultRadii,
  shadows: {
    ...defaultShadows,
    card: '0 8px 32px rgba(0, 0, 0, 0.6)',
  },
  components: {
    Card: { variant: 'glass' },
    Button: { variant: 'glass' },
    Input: { variant: 'filled' },
  },

  glassBlur: '20px',
  density: 'spacious',
};

export const professionalPresets: ThemePreset[] = [
  obsidianPro,
  enterpriseLight,
  midnightSlate,
  executiveLounge,
];
