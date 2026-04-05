/**
 * useSemanticToken Hook
 * 
 * Access semantic design tokens that automatically adapt to any theme
 * 
 * Usage:
 *   const bgColor = useSemanticToken('surface.elevated');
 *   const textColor = useSemanticToken('text.primary');
 */

import { useTheme } from '../theme/ThemeProvider';

import {
  generateSemanticTokens,
  getSemanticToken,
  type SemanticTokenPath
} from '../theme/semantic-tokens';

/**
 * Get a semantic token value that adapts to current theme
 */
export function useSemanticToken(path: SemanticTokenPath | string): string {
  const { currentTheme } = useTheme();

  if (!currentTheme) {
    console.warn('No theme available, using fallback');
    return 'transparent';
  }

  const semanticTokens = generateSemanticTokens(currentTheme);
  return getSemanticToken(semanticTokens, path);
}

/**
 * Get multiple semantic tokens at once
 * Returns an object with the requested tokens
 * 
 * Usage:
 *   const { bg, color, border } = useSemanticTokens({
 *     bg: 'surface.elevated',
 *     color: 'text.primary',
 *     border: 'border.default'
 *   });
 */
export function useSemanticTokens<T extends Record<string, SemanticTokenPath | string>>(
  paths: T
): Record<keyof T, string> {
  const { currentTheme } = useTheme();

  if (!currentTheme) {
    console.warn('No theme available, using fallbacks');
    return Object.keys(paths).reduce((acc, key) => ({
      ...acc,
      [key]: 'transparent'
    }), {} as Record<keyof T, string>);
  }

  const semanticTokens = generateSemanticTokens(currentTheme);

  return Object.entries(paths).reduce((acc, [key, path]) => ({
    ...acc,
    [key]: getSemanticToken(semanticTokens, path as string)
  }), {} as Record<keyof T, string>);
}

/**
 * Get all semantic tokens for current theme
 * Useful for components that need access to multiple token categories
 */
export function useAllSemanticTokens() {
  const { currentTheme } = useTheme();

  if (!currentTheme) {
    console.warn('No theme available');
    return null;
  }

  return generateSemanticTokens(currentTheme);
}
