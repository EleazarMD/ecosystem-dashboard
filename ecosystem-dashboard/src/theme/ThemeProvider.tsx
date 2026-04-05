/**
 * Dashboard Theme Provider
 * 
 * Professional Chakra UI theme switching
 * Generates complete Chakra themes from presets
 * Controlled by feature flag "enableThemeSystem"
 */

import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { useFeatureFlags } from '@/contexts/FeatureFlagsContext';
import { getThemePreset, defaultTheme } from './presets';
import { ThemePreset } from './types';
import { createThemeFromPreset } from './engine';
import { generateSemanticTokens, SemanticTokens } from './semantic-tokens';
import bridgedTheme from '@/styles/ThemeBridge';

interface ThemeContextValue {
  currentTheme: ThemePreset;
  setTheme: (themeId: string) => void;
  themeEnabled: boolean;
  semanticTokens: SemanticTokens | null;
}

const ThemeContext = createContext<ThemeContextValue>({
  currentTheme: defaultTheme,
  setTheme: () => { },
  themeEnabled: false,
  semanticTokens: null,
});

export function useTheme() {
  return useContext(ThemeContext);
}

interface DashboardThemeProviderProps {
  children: React.ReactNode;
}

export const DashboardThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Check if theme system is enabled
  const { isEnabled } = useFeatureFlags();
  const themeEnabled = isEnabled('enableThemeSystem');

  // Always start with default theme (SSR-safe)
  const [currentTheme, setCurrentTheme] = useState<ThemePreset>(defaultTheme);
  const [isMounted, setIsMounted] = useState(false);

  // Load saved theme from localStorage ONLY on client
  // Auto-detect Tesla browser and apply Tesla theme based on car's display mode
  useEffect(() => {
    setIsMounted(true);

    if (typeof window === 'undefined') return;

    const isTesla = /Tesla\//i.test(navigator.userAgent);
    const saved = localStorage.getItem('dashboard-theme');
    
    // If user has explicitly saved a non-Tesla theme, respect it
    if (saved && !saved.startsWith('tesla')) {
      const theme = getThemePreset(saved);
      setCurrentTheme(theme);
      console.log('[ThemeProvider] 🔄 Loaded theme from localStorage:', saved);
      return;
    }

    // Tesla auto-theme: switch between tesla/tesla-light based on car display mode
    if (isTesla || saved?.startsWith('tesla')) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const applyTeslaTheme = (isDark: boolean) => {
        const themeId = isDark ? 'tesla' : 'tesla-light';
        const theme = getThemePreset(themeId);
        setCurrentTheme(theme);
        console.log(`[ThemeProvider] 🚗 Tesla ${isDark ? 'dark' : 'light'} mode applied`);
      };

      // Apply initial theme
      applyTeslaTheme(darkModeQuery.matches);

      // Listen for car display mode changes
      const handleColorSchemeChange = (e: MediaQueryListEvent) => {
        applyTeslaTheme(e.matches);
      };

      darkModeQuery.addEventListener('change', handleColorSchemeChange);
      return () => darkModeQuery.removeEventListener('change', handleColorSchemeChange);
    }

    // Non-Tesla: load saved or use default
    if (saved) {
      const theme = getThemePreset(saved);
      setCurrentTheme(theme);
      console.log('[ThemeProvider] 🔄 Loaded theme from localStorage:', saved);
    }
  }, []);

  // Save theme selection
  const setTheme = (themeId: string) => {
    const newTheme = getThemePreset(themeId);
    setCurrentTheme(newTheme);

    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard-theme', themeId);
    }

    console.log('[ThemeProvider] 🎨 Theme changed to:', themeId);
  };

  // Generate Chakra theme from current preset
  // IMPORTANT: Use bridgedTheme for SSR and initial client render to avoid hydration mismatch.
  // Only switch to the dynamic theme after mount (when localStorage theme is loaded).
  const chakraTheme = useMemo(() => {
    if (!isMounted || !themeEnabled) {
      return bridgedTheme;
    }

    console.log('[ThemeProvider] 🎨 Generating Chakra theme for:', currentTheme.name);
    return createThemeFromPreset(currentTheme);
  }, [isMounted, themeEnabled, currentTheme]);

  // Generate semantic tokens from current theme
  const semanticTokens = useMemo(() =>
    generateSemanticTokens(currentTheme),
    [currentTheme]
  );

  // Provide context value
  const contextValue = useMemo(() => ({
    currentTheme,
    setTheme,
    themeEnabled,
    semanticTokens,
  }), [currentTheme, themeEnabled, semanticTokens]);

  // Wrap in BOTH ThemeContext and ChakraProvider with dynamic theme
  // Suppress hydration warning since theme depends on localStorage (client-only)
  return (
    <ThemeContext.Provider value={contextValue}>
      <ChakraProvider theme={chakraTheme} resetCSS={false} cssVarsRoot="body">
        <div suppressHydrationWarning style={{ display: 'contents' }}>
          {children}
        </div>
      </ChakraProvider>
    </ThemeContext.Provider>
  );
}
