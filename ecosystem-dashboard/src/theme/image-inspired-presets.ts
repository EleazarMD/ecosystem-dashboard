/**
 * Image-Inspired Theme Presets
 * Professional color palettes extracted from curated photography
 * Each theme tells a visual story with cohesive aesthetics
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
 * Northern Lights - Aurora Borealis
 */
export const northernLights: ThemePreset = {
  id: 'northern-lights',
  name: 'Northern Lights',
  description: 'Mystical aurora-inspired design with deep blues and electric greens',
  mode: 'dark',

  colors: {
    primary: '#00FFA3',
    primaryHover: '#00E693',
    primaryActive: '#00CC83',
    secondary: '#1F2937',
    secondaryHover: '#374151',
    accent: '#B84DFF',
    accentHover: '#A33DE6',

    background: '#0A0E27',
    backgroundSecondary: '#111827',
    backgroundTertiary: '#1F2937',

    text: '#F9FAFB',
    textSecondary: '#D1D5DB',
    textMuted: '#9CA3AF',
    textInverse: '#0A0E27',

    border: '#374151',
    borderHover: '#4B5563',

    glassBackground: 'rgba(17, 24, 39, 0.75)',
    glassBorder: '1px solid rgba(0, 255, 163, 0.1)',
  },

  typography: defaultTypography,
  radii: defaultRadii,
  shadows: {
    ...defaultShadows,
    card: '0 4px 12px rgba(0, 255, 163, 0.15)',
    cardHover: '0 6px 16px rgba(0, 255, 163, 0.25)',
  },
  components: defaultComponents,

  glassBlur: '12px',
  density: 'comfortable',
};

/**
 * Sakura Bloom - Japanese Cherry Blossoms
 */
export const sakuraBloom: ThemePreset = {
  id: 'sakura-bloom',
  name: 'Sakura Bloom',
  description: 'Gentle cherry blossom aesthetic with soft pinks and warm tones',
  mode: 'light',

  colors: {
    primary: '#FFB7C5',
    primaryHover: '#FFA7B5',
    primaryActive: '#FF97A5',
    secondary: '#FFF0F3',
    secondaryHover: '#FFE4E9',
    accent: '#FFC3A0',
    accentHover: '#FFB390',

    background: '#FFF5F7',
    backgroundSecondary: '#FFF0F3',
    backgroundTertiary: '#FFE4E9',

    text: '#2D1B2E',
    textSecondary: '#5D4E5F',
    textMuted: '#9B8C9D',
    textInverse: '#FFFFFF',

    border: '#FFD6E0',
    borderHover: '#FFC3D1',

    glassBackground: 'rgba(255, 240, 243, 0.85)',
    glassBorder: '1px solid rgba(255, 183, 197, 0.2)',
  },

  typography: defaultTypography,
  radii: defaultRadii,
  shadows: {
    ...defaultShadows,
    card: '0 4px 12px rgba(255, 183, 197, 0.2)',
    cardHover: '0 6px 16px rgba(255, 183, 197, 0.3)',
  },
  components: defaultComponents,

  glassBlur: '16px',
  density: 'comfortable',
};

/**
 * Desert Dusk - Sahara Sunset
 */
export const desertDusk: ThemePreset = {
  id: 'desert-dusk',
  name: 'Desert Dusk',
  description: 'Warm desert sunset with golden hour tones',
  mode: 'dark',

  colors: {
    primary: '#FF6B35',
    primaryHover: '#FF5525',
    primaryActive: '#FF3F15',
    secondary: '#2A2219',
    secondaryHover: '#3A2E21',
    accent: '#C1666B',
    accentHover: '#B1565B',

    background: '#1A1611',
    backgroundSecondary: '#2A2219',
    backgroundTertiary: '#3A2E21',

    text: '#F4E8D8',
    textSecondary: '#D4C4B0',
    textMuted: '#A89887',
    textInverse: '#1A1611',

    border: '#4A3E31',
    borderHover: '#5A4E41',

    glassBackground: 'rgba(42, 34, 25, 0.8)',
    glassBorder: '1px solid rgba(255, 107, 53, 0.15)',
  },

  typography: defaultTypography,
  radii: defaultRadii,
  shadows: {
    ...defaultShadows,
    card: '0 4px 12px rgba(255, 107, 53, 0.2)',
    cardHover: '0 6px 16px rgba(255, 107, 53, 0.3)',
  },
  components: defaultComponents,

  glassBlur: '14px',
  density: 'comfortable',
};

/**
 * Arctic Ice - Glacial Landscapes
 */
export const arcticIce: ThemePreset = {
  id: 'arctic-ice',
  name: 'Arctic Ice',
  description: 'Crisp glacial design with ice blues and pure whites',
  mode: 'light',

  colors: {
    primary: '#00D4FF',
    primaryHover: '#00C4EF',
    primaryActive: '#00B4DF',
    secondary: '#E0F2FE',
    secondaryHover: '#BAE6FD',
    accent: '#B4E7FF',
    accentHover: '#A4D7EF',

    background: '#F0F9FF',
    backgroundSecondary: '#E0F2FE',
    backgroundTertiary: '#BAE6FD',

    text: '#0C4A6E',
    textSecondary: '#075985',
    textMuted: '#0369A1',
    textInverse: '#FFFFFF',

    border: '#7DD3FC',
    borderHover: '#38BDF8',

    glassBackground: 'rgba(224, 242, 254, 0.9)',
    glassBorder: '1px solid rgba(0, 212, 255, 0.15)',
  },

  typography: defaultTypography,
  radii: defaultRadii,
  shadows: {
    ...defaultShadows,
    card: '0 4px 12px rgba(0, 212, 255, 0.15)',
    cardHover: '0 6px 16px rgba(0, 212, 255, 0.25)',
  },
  components: defaultComponents,

  glassBlur: '18px',
  density: 'comfortable',
};

/**
 * Midnight Garden - Moonlit Botanical
 */
export const midnightGarden: ThemePreset = {
  id: 'midnight-garden',
  name: 'Midnight Garden',
  description: 'Mysterious moonlit garden with deep botanical tones',
  mode: 'dark',

  colors: {
    primary: '#6EE7B7',
    primaryHover: '#5ED7A7',
    primaryActive: '#4EC797',
    secondary: '#1A1F26',
    secondaryHover: '#2D3748',
    accent: '#A78BFA',
    accentHover: '#977BEA',

    background: '#0F1419',
    backgroundSecondary: '#1A1F26',
    backgroundTertiary: '#2D3748',

    text: '#E5E7EB',
    textSecondary: '#D1D5DB',
    textMuted: '#9CA3AF',
    textInverse: '#0F1419',

    border: '#374151',
    borderHover: '#4B5563',

    glassBackground: 'rgba(26, 31, 38, 0.85)',
    glassBorder: '1px solid rgba(110, 231, 183, 0.1)',
  },

  typography: defaultTypography,
  radii: defaultRadii,
  shadows: {
    ...defaultShadows,
    card: '0 4px 12px rgba(110, 231, 183, 0.2)',
    cardHover: '0 6px 16px rgba(110, 231, 183, 0.3)',
  },
  components: defaultComponents,

  glassBlur: '16px',
  density: 'comfortable',
};

/**
 * Volcanic Ash - Geothermal Power
 */
export const volcanicAsh: ThemePreset = {
  id: 'volcanic-ash',
  name: 'Volcanic Ash',
  description: 'Powerful volcanic aesthetic with molten accents',
  mode: 'dark',

  colors: {
    primary: '#FF4500',
    primaryHover: '#EF3500',
    primaryActive: '#DF2500',
    secondary: '#27272A',
    secondaryHover: '#3F3F46',
    accent: '#FBBF24',
    accentHover: '#EBAF14',

    background: '#18181B',
    backgroundSecondary: '#27272A',
    backgroundTertiary: '#3F3F46',

    text: '#F4F4F5',
    textSecondary: '#D4D4D8',
    textMuted: '#A1A1AA',
    textInverse: '#18181B',

    border: '#52525B',
    borderHover: '#71717A',

    glassBackground: 'rgba(39, 39, 42, 0.8)',
    glassBorder: '1px solid rgba(255, 69, 0, 0.15)',
  },

  typography: defaultTypography,
  radii: defaultRadii,
  shadows: {
    ...defaultShadows,
    card: '0 4px 12px rgba(255, 69, 0, 0.25)',
    cardHover: '0 6px 16px rgba(255, 69, 0, 0.35)',
  },
  components: defaultComponents,

  glassBlur: '12px',
  density: 'comfortable',
};

// Export all image-inspired presets
export const imageInspiredPresets: ThemePreset[] = [
  northernLights,
  sakuraBloom,
  desertDusk,
  arcticIce,
  midnightGarden,
  volcanicAsh,
];

// Metadata for theme selection UI
export const themeMetadata = {
  'northern-lights': {
    mood: 'Mystical',
    season: 'Winter',
    inspiration: 'Aurora Borealis',
    bestFor: 'Data visualization, dashboards',
  },
  'sakura-bloom': {
    mood: 'Gentle',
    season: 'Spring',
    inspiration: 'Cherry Blossoms',
    bestFor: 'Content creation, documentation',
  },
  'desert-dusk': {
    mood: 'Warm',
    season: 'Summer',
    inspiration: 'Desert Sunset',
    bestFor: 'Analytics, reports',
  },
  'arctic-ice': {
    mood: 'Clean',
    season: 'Winter',
    inspiration: 'Glacial Landscapes',
    bestFor: 'Minimal UI, focus mode',
  },
  'midnight-garden': {
    mood: 'Mysterious',
    season: 'Summer',
    inspiration: 'Moonlit Garden',
    bestFor: 'Creative work, research',
  },
  'volcanic-ash': {
    mood: 'Powerful',
    season: 'All',
    inspiration: 'Volcanic Power',
    bestFor: 'Development, intense focus',
  },
};
