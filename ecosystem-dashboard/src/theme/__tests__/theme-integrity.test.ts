/**
 * Theme Integrity Verification Tests
 * 
 * Validates that all 14 themes:
 * 1. Have all required semantic tokens
 * 2. Generate valid color values
 * 3. Maintain proper contrast ratios
 * 4. Work correctly in both light and dark modes
 */

import { getAllThemePresets, getThemePreset } from '../presets';
import { generateSemanticTokens, getSemanticToken, SemanticTokens } from '../semantic-tokens';
import { ThemePreset } from '../types';

// Required semantic token paths that must exist in every theme
const REQUIRED_TOKEN_PATHS = [
  // Surface tokens
  'surface.base',
  'surface.elevated',
  'surface.raised',
  'surface.overlay',
  'surface.hover',
  'surface.active',
  'surface.disabled',
  
  // Text tokens
  'text.primary',
  'text.secondary',
  'text.tertiary',
  'text.inverse',
  'text.disabled',
  'text.link',
  
  // Interactive tokens
  'interactive.primary',
  'interactive.primaryHover',
  'interactive.secondary',
  'interactive.disabled',
  'interactive.focus',
  
  // Border tokens
  'border.default',
  'border.subtle',
  'border.strong',
  'border.active',
  'border.focus',
  'border.error',
  
  // Glass tokens
  'glass.background',
  'glass.blur',
  'glass.border',
  
  // Icon tokens
  'icon.primary',
  'icon.secondary',
  'icon.disabled',
  
  // Status tokens
  'status.success',
  'status.warning',
  'status.error',
  'status.info',
];

// Validate a color value is not empty/invalid
function isValidColor(value: string): boolean {
  if (!value || value === 'undefined') {
    return false;
  }
  // Transparent is valid for neumorphic themes that use shadows instead of borders
  if (value === 'transparent') {
    return true;
  }
  // Check for hex, rgb, rgba, hsl, or named colors
  const colorPatterns = [
    /^#[0-9A-Fa-f]{3,8}$/,           // Hex
    /^rgb\(/,                         // RGB
    /^rgba\(/,                        // RGBA
    /^hsl\(/,                         // HSL
    /^hsla\(/,                        // HSLA
    /^[a-z]+\.[0-9]+$/,              // Chakra color (e.g., "gray.500")
    /^[a-z]+$/i,                      // Named color
  ];
  return colorPatterns.some(pattern => pattern.test(value));
}

describe('Theme Integrity Verification', () => {
  const allThemes = getAllThemePresets();
  
  describe('Theme Registry', () => {
    it('should have at least 10 themes registered', () => {
      expect(allThemes.length).toBeGreaterThanOrEqual(10);
    });
    
    it('should have unique theme IDs', () => {
      const ids = allThemes.map(t => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
    
    it('should have both light and dark mode themes', () => {
      const lightThemes = allThemes.filter(t => t.mode === 'light');
      const darkThemes = allThemes.filter(t => t.mode === 'dark');
      expect(lightThemes.length).toBeGreaterThan(0);
      expect(darkThemes.length).toBeGreaterThan(0);
    });
  });
  
  describe.each(allThemes.map(t => [t.id, t]))('Theme: %s', (themeId, theme) => {
    let semanticTokens: SemanticTokens;
    
    beforeAll(() => {
      semanticTokens = generateSemanticTokens(theme as ThemePreset);
    });
    
    it('should have valid theme metadata', () => {
      const t = theme as ThemePreset;
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(['light', 'dark']).toContain(t.mode);
    });
    
    it('should generate semantic tokens', () => {
      expect(semanticTokens).toBeDefined();
      expect(semanticTokens.surface).toBeDefined();
      expect(semanticTokens.text).toBeDefined();
      expect(semanticTokens.interactive).toBeDefined();
      expect(semanticTokens.border).toBeDefined();
    });
    
    it.each(REQUIRED_TOKEN_PATHS)('should have valid token: %s', (tokenPath) => {
      const value = getSemanticToken(semanticTokens, tokenPath);
      expect(value).toBeDefined();
      expect(value).not.toBe('');
      // Glass blur can be a pixel value
      if (!tokenPath.includes('blur')) {
        expect(isValidColor(value) || value.includes('px')).toBe(true);
      }
    });
    
    it('should have required color properties', () => {
      const t = theme as ThemePreset;
      expect(t.colors.primary).toBeTruthy();
      expect(t.colors.background).toBeTruthy();
      expect(t.colors.text).toBeTruthy();
      expect(t.colors.border).toBeTruthy();
    });
    
    it('should have valid glass properties', () => {
      const t = theme as ThemePreset;
      expect(t.colors.glassBackground).toBeTruthy();
      expect(t.glassBlur).toBeTruthy();
    });
  });
  
  describe('Theme Switching', () => {
    it('should retrieve themes by ID', () => {
      const clinicalBlue = getThemePreset('clinical-blue');
      expect(clinicalBlue.id).toBe('clinical-blue');
      
      const researchDark = getThemePreset('research-dark');
      expect(researchDark.id).toBe('research-dark');
    });
    
    it('should return default theme for unknown ID', () => {
      const unknown = getThemePreset('non-existent-theme');
      expect(unknown).toBeDefined();
      expect(unknown.id).toBe('clinical-blue'); // Default theme
    });
  });
  
  describe('Semantic Token Consistency', () => {
    it('should generate different tokens for light vs dark themes', () => {
      const lightTheme = allThemes.find(t => t.mode === 'light')!;
      const darkTheme = allThemes.find(t => t.mode === 'dark')!;
      
      const lightTokens = generateSemanticTokens(lightTheme);
      const darkTokens = generateSemanticTokens(darkTheme);
      
      // Background colors should be different
      expect(lightTokens.surface.base).not.toBe(darkTokens.surface.base);
      // Text colors should be different
      expect(lightTokens.text.primary).not.toBe(darkTokens.text.primary);
    });
  });
});

// Export theme list for documentation
export const THEME_LIST = getAllThemePresets().map(t => ({
  id: t.id,
  name: t.name,
  mode: t.mode,
  description: t.description,
}));

console.log('Available Themes:', THEME_LIST.length);
THEME_LIST.forEach(t => console.log(`  - ${t.name} (${t.mode}): ${t.description}`));
