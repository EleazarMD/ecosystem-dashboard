/**
 * Theme Presets
 * 
 * Pre-configured themes optimized for different contexts.
 * Now powered by the Virtual Dashboard Engine.
 */

import { ThemePreset } from './types';

// --- Default Configuration Helpers ---

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

// --- Themes ---

export const clinicalBlueTheme: ThemePreset = {
  id: 'clinical-blue',
  name: 'Clinical Blue',
  description: 'Professional medical interface with calming blue tones',
  mode: 'light',

  colors: {
    primary: '#2563eb',
    primaryHover: '#1d4ed8',
    primaryActive: '#1e40af',
    secondary: '#64748b',
    secondaryHover: '#475569',
    accent: '#0ea5e9',
    accentHover: '#0284c7',

    background: '#f8fafc', // Slate 50
    backgroundSecondary: '#ffffff',
    backgroundTertiary: '#f1f5f9',

    text: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    textInverse: '#ffffff',

    border: '#e2e8f0',
    borderHover: '#cbd5e1',

    glassBackground: 'rgba(255, 255, 255, 0.7)',
    glassBorder: '1px solid rgba(255, 255, 255, 0.5)',
  },

  typography: defaultTypography,
  radii: defaultRadii,
  shadows: defaultShadows,
  components: defaultComponents,

  glassBlur: '12px',
  density: 'comfortable',
};

export const researchDarkTheme: ThemePreset = {
  id: 'research-dark',
  name: 'Research Dark',
  description: 'Deep focus theme for academic research and analysis',
  mode: 'dark',

  colors: {
    primary: '#a78bfa',
    primaryHover: '#c4b5fd',
    primaryActive: '#ddd6fe',
    secondary: '#94a3b8',
    secondaryHover: '#cbd5e1',
    accent: '#8b5cf6',
    accentHover: '#a78bfa',

    background: '#0f172a', // Slate 900
    backgroundSecondary: '#1e293b', // Slate 800
    backgroundTertiary: '#334155', // Slate 700

    text: '#f8fafc',
    textSecondary: '#cbd5e1',
    textMuted: '#94a3b8',
    textInverse: '#0f172a',

    border: '#334155',
    borderHover: '#475569',

    glassBackground: 'rgba(30, 41, 59, 0.7)',
    glassBorder: '1px solid rgba(255, 255, 255, 0.1)',
  },

  typography: defaultTypography,
  radii: defaultRadii,
  shadows: {
    ...defaultShadows,
    card: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
    cardHover: '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
  },
  components: defaultComponents,

  glassBlur: '16px',
  density: 'comfortable',
};

// --- Showcase Themes ---

export const cyberpunkTheme: ThemePreset = {
  id: 'cyberpunk-2077',
  name: 'Cyberpunk 2077',
  description: 'High contrast, neon aesthetics, sharp edges',
  mode: 'dark',

  colors: {
    primary: '#fcee0a', // Cyber yellow
    primaryHover: '#e6d900',
    primaryActive: '#ccbf00',
    secondary: '#00f0ff', // Cyber blue
    secondaryHover: '#00cce6',
    accent: '#ff003c', // Cyber red
    accentHover: '#e60036',

    background: '#050505',
    backgroundSecondary: '#121212',
    backgroundTertiary: '#1a1a1a',

    text: '#fcee0a',
    textSecondary: '#00f0ff',
    textMuted: '#ff003c',
    textInverse: '#000000',

    border: '#fcee0a',
    borderHover: '#00f0ff',

    glassBackground: 'rgba(5, 5, 5, 0.8)',
    glassBorder: '1px solid #fcee0a',
  },

  typography: {
    fontHeading: '"Orbitron", "Rajdhani", sans-serif',
    fontBody: '"Rajdhani", "Share Tech Mono", monospace',
    fontMono: '"Share Tech Mono", monospace',
    fontSizeScale: 'lg',
  },

  radii: {
    card: '0px', // Sharp edges
    button: '0px',
    input: '0px',
    modal: '0px',
  },

  shadows: {
    card: '4px 4px 0px #00f0ff', // Hard shadow
    cardHover: '6px 6px 0px #ff003c',
    popover: '4px 4px 0px #fcee0a',
    modal: '8px 8px 0px #fcee0a',
  },

  components: {
    Card: { variant: 'outline' },
    Button: { variant: 'outline' },
    Input: { variant: 'filled' },
  },

  glassBlur: '2px',
  density: 'spacious',
};

export const neumorphicTheme: ThemePreset = {
  id: 'neumorphic-light',
  name: 'Neumorphic Light',
  description: 'Soft, extruded shapes and subtle depth',
  mode: 'light',

  colors: {
    primary: '#e0e5ec',
    primaryHover: '#d1d9e6',
    primaryActive: '#c1c9d6',
    secondary: '#a3b1c6',
    secondaryHover: '#8e9eab',
    accent: '#6d5dfc',
    accentHover: '#5b4cc4',

    background: '#e0e5ec',
    backgroundSecondary: '#e0e5ec', // Same as bg for neumorphism
    backgroundTertiary: '#e0e5ec',

    text: '#4a5568',
    textSecondary: '#718096',
    textMuted: '#a0aec0',
    textInverse: '#ffffff',

    border: 'transparent', // Borders are handled by shadows
    borderHover: 'transparent',

    glassBackground: 'rgba(224, 229, 236, 0.6)',
    glassBorder: '1px solid rgba(255, 255, 255, 0.4)',
  },

  typography: {
    ...defaultTypography,
    fontHeading: '"Nunito", sans-serif',
    fontBody: '"Nunito", sans-serif',
  },

  radii: {
    card: '20px',
    button: '12px',
    input: '12px',
    modal: '24px',
  },

  shadows: {
    card: '9px 9px 16px rgb(163,177,198,0.6), -9px -9px 16px rgba(255,255,255, 0.5)',
    cardHover: '12px 12px 20px rgb(163,177,198,0.7), -12px -12px 20px rgba(255,255,255, 0.6)',
    popover: '9px 9px 16px rgb(163,177,198,0.6), -9px -9px 16px rgba(255,255,255, 0.5)',
    modal: '20px 20px 60px #d1d9e6, -20px -20px 60px #ffffff',
  },

  components: {
    Card: { variant: 'neumorphic' },
    Button: { variant: 'neumorphic' },
    Input: { variant: 'neumorphic' },
  },

  glassBlur: '10px',
  density: 'comfortable',
};

// Import external presets
import { imageInspiredPresets } from './image-inspired-presets';
import { professionalPresets } from './professional-presets';
import { teslaTheme } from './tesla-theme';
import { teslaLightTheme } from './tesla-light-theme';

// --- Registry ---

export const themePresets: Record<string, ThemePreset> = {
  // Core Themes
  'clinical-blue': clinicalBlueTheme,
  'research-dark': researchDarkTheme,
  'cyberpunk-2077': cyberpunkTheme,
  'neumorphic-light': neumorphicTheme,
  'tesla': teslaTheme,
  'tesla-light': teslaLightTheme,
};

// Register Image Inspired Presets
imageInspiredPresets.forEach(preset => {
  themePresets[preset.id] = preset;
});

// Register Professional Presets
professionalPresets.forEach(preset => {
  themePresets[preset.id] = preset;
});

export const defaultTheme = clinicalBlueTheme;

export function getThemePreset(id: string): ThemePreset {
  return themePresets[id] || defaultTheme;
}

export function getAllThemePresets(): ThemePreset[] {
  return Object.values(themePresets);
}
