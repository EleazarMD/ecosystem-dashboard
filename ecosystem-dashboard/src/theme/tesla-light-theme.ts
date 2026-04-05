/**
 * Tesla Light Theme
 * 
 * Light variant of the Tesla dashboard theme for daytime driving.
 * Auto-activates when Tesla's display is in light mode.
 * 
 * Design principles:
 * - High contrast for sunlight visibility
 * - Warm white backgrounds (not harsh pure white)
 * - Teal/green accents consistent with dark theme
 * - Large touch targets for in-car use
 */

import { ThemePreset } from './types';

export const teslaLightTheme: ThemePreset = {
  id: 'tesla-light',
  name: 'Tesla Light',
  description: 'Light dashboard for daytime driving — warm whites, high contrast',
  mode: 'light',

  colors: {
    // Brand — teal/green accent (consistent with dark theme)
    primary: '#059669',        // Emerald 600 (darker for light bg)
    primaryHover: '#10b981',   // Emerald 500
    primaryActive: '#047857',  // Emerald 700

    secondary: '#4b5563',      // Gray 600
    secondaryHover: '#6b7280', // Gray 500

    accent: '#0891b2',         // Cyan 600
    accentHover: '#06b6d4',    // Cyan 500

    // Surfaces — warm white, not harsh
    background: '#fafafa',          // Warm off-white
    backgroundSecondary: '#ffffff', // Pure white cards
    backgroundTertiary: '#f4f4f5',  // Zinc 100 for raised elements

    // Text — high contrast dark hierarchy
    text: '#18181b',           // Zinc 900
    textSecondary: '#52525b',  // Zinc 600
    textMuted: '#a1a1aa',      // Zinc 400
    textInverse: '#fafafa',    // For use on dark surfaces

    // Borders — subtle gray
    border: '#e4e4e7',         // Zinc 200
    borderHover: '#d4d4d8',    // Zinc 300

    // Glass — light panels
    glassBackground: 'rgba(255, 255, 255, 0.95)',
    glassBorder: '1px solid rgba(0, 0, 0, 0.08)',

    // Status
    success: '#059669',
    warning: '#d97706',
    error: '#dc2626',
    info: '#0891b2',
  },

  typography: {
    fontHeading: '"Inter", -apple-system, system-ui, sans-serif',
    fontBody: '"Inter", -apple-system, system-ui, sans-serif',
    fontMono: '"JetBrains Mono", "SF Mono", monospace',
    fontSizeScale: 'md',
  },

  radii: {
    card: '16px',
    button: '12px',
    input: '12px',
    modal: '20px',
  },

  shadows: {
    card: '0 1px 3px rgba(0, 0, 0, 0.1)',
    cardHover: '0 4px 12px rgba(0, 0, 0, 0.15)',
    popover: '0 8px 24px rgba(0, 0, 0, 0.2)',
    modal: '0 16px 48px rgba(0, 0, 0, 0.25)',
  },

  components: {
    Card: { variant: 'filled' },
    Button: { variant: 'solid' },
    Input: { variant: 'filled' },
  },

  glassBlur: '0px',  // No glassmorphism — flat panels
  density: 'comfortable',
};
