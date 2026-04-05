/**
 * Tesla Theme
 * 
 * Dark, flat, high-contrast dashboard theme optimized for vehicle displays.
 * Inspired by the Hyperspace iOS app: charcoal backgrounds, subtle gray cards,
 * clean white text, green/teal accents. No glassmorphism — pure flat dark panels.
 * 
 * Designed for readability on Tesla infotainment screens (15.4" and 17")
 * with larger touch targets and high contrast text.
 */

import { ThemePreset } from './types';

export const teslaTheme: ThemePreset = {
  id: 'tesla',
  name: 'Tesla',
  description: 'Dark flat dashboard for vehicle displays — charcoal, clean, high contrast',
  mode: 'dark',

  colors: {
    // Brand — teal/green accent (matches iOS Hyperspace green)
    primary: '#10b981',        // Emerald 500
    primaryHover: '#34d399',   // Emerald 400
    primaryActive: '#059669',  // Emerald 600

    secondary: '#6b7280',      // Gray 500
    secondaryHover: '#9ca3af', // Gray 400

    accent: '#06b6d4',         // Cyan 500
    accentHover: '#22d3ee',    // Cyan 400

    // Surfaces — deep charcoal, NOT blue-slate
    background: '#111111',          // Near-black (matches iOS)
    backgroundSecondary: '#1a1a1a', // Dark card surface
    backgroundTertiary: '#242424',  // Raised elements, chips

    // Text — high contrast white hierarchy
    text: '#f5f5f5',           // Primary text (off-white, easy on eyes)
    textSecondary: '#a3a3a3',  // Neutral 400
    textMuted: '#636363',      // Neutral 500 (subtle metadata)
    textInverse: '#111111',    // For use on light surfaces

    // Borders — very subtle, almost invisible
    border: '#2a2a2a',
    borderHover: '#3a3a3a',

    // Glass — minimal, flat panels (no blur needed)
    glassBackground: 'rgba(26, 26, 26, 0.95)',
    glassBorder: '1px solid rgba(255, 255, 255, 0.06)',

    // Status
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#06b6d4',
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
    card: '0 1px 3px rgba(0, 0, 0, 0.4)',
    cardHover: '0 4px 12px rgba(0, 0, 0, 0.5)',
    popover: '0 8px 24px rgba(0, 0, 0, 0.6)',
    modal: '0 16px 48px rgba(0, 0, 0, 0.7)',
  },

  components: {
    Card: { variant: 'filled' },
    Button: { variant: 'solid' },
    Input: { variant: 'filled' },
  },

  glassBlur: '0px',  // No glassmorphism — flat panels
  density: 'comfortable',
};
