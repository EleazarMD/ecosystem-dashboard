/**
 * useThemeAware Hook
 * 
 * Complete theme access - provides semantic tokens, glass effects,
 * mode detection, and theme utilities in one hook
 */

import { useTheme } from '../theme/ThemeProvider';
import { useSemanticToken, useSemanticTokens, useAllSemanticTokens } from './useSemanticToken';
import { useAdaptiveGlass, useGlassProps } from './useAdaptiveGlass';
import type { SemanticTokenPath } from '../theme/semantic-tokens';

/**
 * Complete theme awareness for any component
 * 
 * Usage:
 *   const theme = useThemeAware();
 *   <Box bg={theme.surface('elevated')} color={theme.text('primary')}>
 */
export function useThemeAware() {
  const { currentTheme, setTheme } = useTheme();
  const allTokens = useAllSemanticTokens();
  
  const isLight = currentTheme?.mode === 'light';
  const isDark = currentTheme?.mode === 'dark';
  
  return {
    // Theme info
    theme: currentTheme,
    mode: currentTheme?.mode,
    isLight,
    isDark,
    setTheme,
    
    // Quick token accessors
    surface: (key: string) => useSemanticToken(`surface.${key}` as SemanticTokenPath),
    text: (key: string) => useSemanticToken(`text.${key}` as SemanticTokenPath),
    interactive: (key: string) => useSemanticToken(`interactive.${key}` as SemanticTokenPath),
    border: (key: string) => useSemanticToken(`border.${key}` as SemanticTokenPath),
    icon: (key: string) => useSemanticToken(`icon.${key}` as SemanticTokenPath),
    status: (key: string) => useSemanticToken(`status.${key}` as SemanticTokenPath),
    
    // Glass effects
    glass: useAdaptiveGlass,
    glassProps: useGlassProps,
    
    // All tokens
    tokens: allTokens,
    
    // Utilities
    getToken: (path: SemanticTokenPath) => useSemanticToken(path),
    getTokens: (paths: Record<string, SemanticTokenPath>) => useSemanticTokens(paths),
  };
}

/**
 * Quick hook for common component styling needs
 * Returns the most commonly used tokens
 */
export function useComponentStyle() {
  return {
    bg: useSemanticToken('surface.elevated'),
    color: useSemanticToken('text.primary'),
    border: useSemanticToken('border.default'),
    borderHover: useSemanticToken('border.interactiveHover'),
    shadow: useSemanticToken('glass.shadow'),
  };
}

/**
 * Get button styles for different variants
 */
export function useButtonStyle(variant: 'primary' | 'secondary' | 'ghost' = 'primary') {
  const tokens = useSemanticTokens({
    bg: variant === 'primary' ? 'interactive.primary' : 
        variant === 'secondary' ? 'interactive.secondary' : 
        'interactive.tertiary',
    color: variant === 'primary' ? 'text.inverse' : 'text.primary',
    bgHover: variant === 'primary' ? 'interactive.primaryHover' :
             variant === 'secondary' ? 'interactive.secondaryHover' :
             'interactive.tertiaryHover',
    border: variant === 'secondary' ? 'border.default' : 'transparent',
  });
  
  return {
    bg: tokens.bg,
    color: tokens.color,
    border: variant === 'secondary' ? `1px solid ${tokens.border}` : 'none',
    _hover: {
      bg: tokens.bgHover,
    },
    _active: {
      transform: 'scale(0.98)',
    },
    transition: 'all 0.2s ease',
  };
}

/**
 * Get input/form field styles
 */
export function useInputStyle() {
  const { isLight } = useThemeAware();
  
  return {
    bg: useSemanticToken('surface.base'),
    color: useSemanticToken('text.primary'),
    border: `1px solid ${useSemanticToken('border.interactive')}`,
    _hover: {
      borderColor: useSemanticToken('border.interactiveHover'),
    },
    _focus: {
      borderColor: useSemanticToken('border.focus'),
      boxShadow: `0 0 0 3px ${useSemanticToken('border.focus')}33`,
      outline: 'none',
    },
    _placeholder: {
      color: useSemanticToken('text.tertiary'),
    },
    _disabled: {
      bg: useSemanticToken('surface.disabled'),
      color: useSemanticToken('text.disabled'),
      cursor: 'not-allowed',
    },
  };
}

/**
 * Get card/panel styles
 */
export function useCardStyle() {
  const glass = useAdaptiveGlass({ intensity: 0.8, shadow: true });
  
  return {
    ...glass,
    p: 4,
    borderRadius: 'lg',
    transition: 'all 0.3s ease',
    _hover: {
      transform: 'translateY(-2px)',
      boxShadow: useSemanticToken('glass.shadowHover'),
    },
  };
}
