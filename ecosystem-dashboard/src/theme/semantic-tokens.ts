/**
 * Semantic Design Token System
 * 
 * Provides semantic names for all design tokens that automatically
 * adapt to any theme (Christmas, Batman, Minimalist, etc.)
 * 
 * NO HARDCODED COLORS - All tokens map to theme values
 */

import { ThemePreset } from './types';

export interface SemanticTokens {
  // Surface tokens (backgrounds, cards, overlays)
  surface: {
    base: string;              // Main background
    elevated: string;           // Cards, panels raised above base
    raised: string;             // Slightly elevated elements (badges, chips)
    overlay: string;            // Modals, dialogs
    inverse: string;            // Inverse surface (tooltips on light, highlights on dark)
    hover: string;              // Hover state for surfaces
    active: string;             // Active/pressed state
    disabled: string;           // Disabled surface
    popover: string;            // Popover/tooltip backgrounds
  };

  // Text hierarchy
  text: {
    primary: string;            // Headings, important content
    secondary: string;          // Body text, paragraphs
    tertiary: string;           // Captions, metadata, less important
    inverse: string;            // Text on inverse surfaces
    disabled: string;           // Disabled text
    link: string;               // Hyperlinks
    linkHover: string;          // Link hover state
    success: string;            // Success messages
    warning: string;            // Warning messages
    error: string;              // Error messages
    info: string;               // Info messages
  };

  // Interactive elements
  interactive: {
    primary: string;            // Main action buttons
    primaryHover: string;       // Primary button hover
    primaryActive: string;      // Primary button pressed
    secondary: string;          // Secondary buttons
    secondaryHover: string;     // Secondary button hover
    tertiary: string;           // Tertiary/ghost buttons
    tertiaryHover: string;      // Tertiary hover
    disabled: string;           // Disabled interactive elements
    focus: string;              // Focus rings
    surface: string;            // Interactive surface backgrounds
    surfaceHover: string;       // Interactive surface hover
    surfaceActive: string;      // Interactive surface active/selected
  };

  // Borders & dividers
  border: {
    default: string;            // Standard borders
    subtle: string;             // Light dividers, soft separations
    strong: string;             // Emphasized borders
    active: string;             // Active/selected borders
    interactive: string;        // Input borders
    interactiveHover: string;   // Input hover borders
    focus: string;              // Focus borders
    error: string;              // Error state borders
    success: string;            // Success state borders
  };

  // Glassmorphic effects (mode-aware, intelligent adaptation)
  glass: {
    background: string;         // Adapts opacity based on theme mode
    backgroundHover: string;    // Hover state
    backgroundFocus: string;    // Focus state
    blur: string;               // Backdrop blur amount
    border: string;             // Glass edge/border
    shadow: string;             // Depth shadow
    shadowHover: string;        // Hover shadow
  };

  // Icons
  icon: {
    primary: string;            // Standard icon color
    secondary: string;          // Muted icons
    tertiary: string;           // Very subtle icons
    inverse: string;            // Icons on inverse surfaces
    interactive: string;        // Clickable icons
    interactiveHover: string;   // Icon hover state
    disabled: string;           // Disabled icons
  };

  // Status/feedback colors (semantic, not theme-dependent)
  status: {
    success: string;
    successSubtle: string;
    warning: string;
    warningSubtle: string;
    error: string;
    errorSubtle: string;
    errorBg: string;              // Error background
    errorText: string;            // Error text
    info: string;
    infoSubtle: string;
  };
}

/**
 * Generate semantic tokens from a theme preset
 * Intelligently adapts values based on theme mode and style
 */
export function generateSemanticTokens(theme: ThemePreset): SemanticTokens {
  const { colors } = theme;
  const isLight = theme.mode === 'light';

  return {
    // Surface tokens
    surface: {
      base: colors.background,
      elevated: colors.backgroundSecondary,
      raised: colors.backgroundTertiary,
      overlay: colors.backgroundTertiary,
      inverse: isLight ? colors.text : colors.background,
      hover: isLight
        ? 'rgba(0, 0, 0, 0.05)'
        : 'rgba(255, 255, 255, 0.05)',
      active: isLight
        ? 'rgba(0, 0, 0, 0.1)'
        : 'rgba(255, 255, 255, 0.1)',
      disabled: isLight
        ? 'rgba(0, 0, 0, 0.03)'
        : 'rgba(255, 255, 255, 0.03)',
      popover: colors.backgroundSecondary,
    },

    // Text hierarchy
    text: {
      primary: colors.text,
      secondary: colors.textSecondary,
      tertiary: colors.textMuted,
      inverse: colors.textInverse,
      disabled: isLight
        ? 'rgba(0, 0, 0, 0.38)'
        : 'rgba(255, 255, 255, 0.38)',
      link: colors.primary,
      linkHover: colors.primaryHover,
      success: colors.success || '#10b981',
      warning: colors.warning || '#f59e0b',
      error: colors.error || '#ef4444',
      info: colors.info || colors.accent,
    },

    // Interactive elements
    interactive: {
      primary: colors.primary,
      primaryHover: colors.primaryHover,
      primaryActive: colors.primaryActive,
      secondary: colors.backgroundSecondary,
      secondaryHover: isLight
        ? 'rgba(0, 0, 0, 0.08)'
        : 'rgba(255, 255, 255, 0.12)',
      tertiary: 'transparent',
      tertiaryHover: isLight
        ? 'rgba(0, 0, 0, 0.05)'
        : 'rgba(255, 255, 255, 0.08)',
      disabled: isLight
        ? 'rgba(0, 0, 0, 0.12)'
        : 'rgba(255, 255, 255, 0.12)',
      focus: colors.primary,
      surface: colors.backgroundSecondary,
      surfaceHover: isLight
        ? 'rgba(0, 0, 0, 0.05)'
        : 'rgba(255, 255, 255, 0.08)',
      surfaceActive: isLight
        ? 'rgba(0, 0, 0, 0.1)'
        : 'rgba(255, 255, 255, 0.15)',
    },

    // Borders
    border: {
      default: colors.border,
      subtle: isLight
        ? 'rgba(0, 0, 0, 0.08)'
        : 'rgba(255, 255, 255, 0.08)',
      strong: colors.borderHover,
      active: colors.primary,
      interactive: isLight
        ? 'rgba(0, 0, 0, 0.23)'
        : 'rgba(255, 255, 255, 0.23)',
      interactiveHover: colors.borderHover,
      focus: colors.primary,
      error: colors.error || '#ef4444',
      success: colors.success || '#10b981',
    },

    // Glassmorphic effects
    glass: {
      background: colors.glassBackground,
      backgroundHover: colors.backgroundSecondary,
      backgroundFocus: colors.backgroundTertiary,
      blur: theme.glassBlur,
      border: colors.glassBorder,
      shadow: theme.shadows.card,
      shadowHover: theme.shadows.cardHover,
    },

    // Icons
    icon: {
      primary: colors.text,
      secondary: colors.textSecondary,
      tertiary: colors.textMuted,
      inverse: colors.textInverse,
      interactive: colors.primary,
      interactiveHover: colors.primaryHover,
      disabled: isLight
        ? 'rgba(0, 0, 0, 0.26)'
        : 'rgba(255, 255, 255, 0.3)',
    },

    // Status colors
    status: {
      success: colors.success || '#10b981',
      successSubtle: isLight
        ? 'rgba(16, 185, 129, 0.1)'
        : 'rgba(16, 185, 129, 0.2)',
      warning: colors.warning || '#f59e0b',
      warningSubtle: isLight
        ? 'rgba(245, 158, 11, 0.1)'
        : 'rgba(245, 158, 11, 0.2)',
      error: colors.error || '#ef4444',
      errorSubtle: isLight
        ? 'rgba(239, 68, 68, 0.1)'
        : 'rgba(239, 68, 68, 0.2)',
      errorBg: isLight
        ? 'rgba(239, 68, 68, 0.1)'
        : 'rgba(239, 68, 68, 0.2)',
      errorText: colors.error || '#ef4444',
      info: colors.info || colors.accent,
      infoSubtle: isLight
        ? `${colors.accent}1a`
        : `${colors.accent}33`,
    },
  };
}

/**
 * Get semantic token value from theme
 * Supports nested paths like 'text.primary' or 'glass.background'
 */
export function getSemanticToken(
  tokens: SemanticTokens,
  path: string
): string {
  const parts = path.split('.');
  let value: any = tokens;

  for (const part of parts) {
    if (value && typeof value === 'object') {
      value = value[part];
    } else {
      console.warn(`Semantic token not found: ${path}`);
      return 'transparent';
    }
  }

  return value as string;
}

/**
 * Type-safe token paths for autocomplete
 */
export type SemanticTokenPath =
  | `surface.${keyof SemanticTokens['surface']}`
  | `text.${keyof SemanticTokens['text']}`
  | `interactive.${keyof SemanticTokens['interactive']}`
  | `border.${keyof SemanticTokens['border']}`
  | `glass.${keyof SemanticTokens['glass']}`
  | `icon.${keyof SemanticTokens['icon']}`
  | `status.${keyof SemanticTokens['status']}`;
