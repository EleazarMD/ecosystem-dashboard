/**
 * Child-Friendly Theme Provider
 * 
 * Provides themed experiences for child accounts using the
 * child themes system (Pusheen, Minecraft, etc.)
 */

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo } from 'react';
import { extendTheme, ChakraProvider, ThemeConfig } from '@chakra-ui/react';
import { ChildTheme, ChildThemeId, getChildTheme, defaultChildTheme } from '@/lib/child-themes';

interface ChildThemeContextType {
  isChildMode: boolean;
  avatarEmoji: string;
  setAvatarEmoji: (emoji: string) => void;
  theme: ChildTheme;
  themeId: ChildThemeId;
  setThemeId: (id: ChildThemeId) => void;
  colors: ChildTheme['colors'];
  childExtras: ChildTheme['childExtras'];
}

const ChildThemeContext = createContext<ChildThemeContextType>({
  isChildMode: false,
  avatarEmoji: '🦊',
  setAvatarEmoji: () => {},
  theme: defaultChildTheme,
  themeId: 'child-default',
  setThemeId: () => {},
  colors: defaultChildTheme.colors,
  childExtras: defaultChildTheme.childExtras,
});

export const useChildTheme = () => useContext(ChildThemeContext);

interface ChildThemeProviderProps {
  children: ReactNode;
  isChildMode?: boolean;
  initialThemeId?: ChildThemeId;
}

function createChakraTheme(theme: ChildTheme) {
  const config: ThemeConfig = {
    initialColorMode: theme.mode,
    useSystemColorMode: false,
  };

  return extendTheme({
    config,
    colors: {
      primary: {
        50: `${theme.colors.primary}11`,
        100: `${theme.colors.primary}22`,
        200: `${theme.colors.primary}44`,
        300: `${theme.colors.primary}66`,
        400: `${theme.colors.primary}88`,
        500: theme.colors.primary,
        600: theme.colors.primaryHover,
        700: theme.colors.primaryActive,
        800: theme.colors.primaryActive,
        900: theme.colors.primaryActive,
      },
      accent: {
        500: theme.colors.accent,
        600: theme.colors.accentHover,
      },
    },
    fonts: {
      heading: theme.typography.fontHeading,
      body: theme.typography.fontBody,
      mono: theme.typography.fontMono,
    },
    styles: {
      global: {
        body: {
          bg: theme.colors.background,
          color: theme.colors.text,
          minHeight: '100vh',
        },
      },
    },
    radii: {
      card: theme.radii.card,
      button: theme.radii.button,
      input: theme.radii.input,
      modal: theme.radii.modal,
    },
    shadows: {
      card: theme.shadows.card,
      cardHover: theme.shadows.cardHover,
    },
    components: {
      Button: {
        baseStyle: {
          borderRadius: theme.radii.button,
          fontWeight: 'bold',
          transition: 'all 0.2s',
          _hover: {
            transform: 'scale(1.05)',
          },
          _active: {
            transform: 'scale(0.95)',
          },
        },
        variants: {
          fun: {
            bg: theme.colors.accent,
            color: theme.colors.textInverse,
            boxShadow: theme.shadows.card,
            _hover: {
              bg: theme.colors.accentHover,
              boxShadow: theme.shadows.cardHover,
            },
          },
          primary: {
            bg: theme.colors.primary,
            color: theme.colors.textInverse,
            _hover: {
              bg: theme.colors.primaryHover,
            },
          },
        },
      },
      Card: {
        baseStyle: {
          container: {
            borderRadius: theme.radii.card,
            boxShadow: theme.shadows.card,
            overflow: 'hidden',
          },
        },
      },
    },
  });
}

export function ChildThemeProvider({ 
  children, 
  isChildMode = true,
  initialThemeId = 'child-default',
}: ChildThemeProviderProps) {
  const [themeId, setThemeId] = useState<ChildThemeId>(initialThemeId);
  const [avatarEmoji, setAvatarEmoji] = useState('🦊');

  // Fetch theme from API on mount (with localStorage cache)
  useEffect(() => {
    async function fetchTheme() {
      try {
        // Try localStorage cache first for instant load
        const cachedTheme = localStorage.getItem('child-theme-id');
        if (cachedTheme) {
          console.log('[ChildThemeProvider] Using cached theme:', cachedTheme);
          setThemeId(cachedTheme as ChildThemeId);
        }
        
        // Fetch fresh theme in background
        console.log('[ChildThemeProvider] Fetching theme from API...');
        const res = await fetch('/api/child/theme');
        console.log('[ChildThemeProvider] API response status:', res.status);
        if (res.ok) {
          const data = await res.json();
          console.log('[ChildThemeProvider] API response data:', data);
          if (data.themeId) {
            console.log('[ChildThemeProvider] Setting theme to:', data.themeId);
            setThemeId(data.themeId as ChildThemeId);
            localStorage.setItem('child-theme-id', data.themeId);
          }
        } else {
          console.warn('[ChildThemeProvider] API returned non-OK status:', res.status);
        }
      } catch (error) {
        console.error('[ChildThemeProvider] Failed to fetch theme:', error);
      }
    }
    fetchTheme();
  }, []);

  const theme = useMemo(() => getChildTheme(themeId), [themeId]);
  const chakraTheme = useMemo(() => createChakraTheme(theme), [theme]);

  // Update avatar to theme default if not set
  useEffect(() => {
    if (theme.childExtras.avatar.default) {
      setAvatarEmoji(theme.childExtras.avatar.default);
    }
  }, [theme]);

  const contextValue = useMemo(() => ({
    isChildMode,
    avatarEmoji,
    setAvatarEmoji,
    theme,
    themeId,
    setThemeId,
    colors: theme.colors,
    childExtras: theme.childExtras,
  }), [isChildMode, avatarEmoji, theme, themeId]);

  return (
    <ChildThemeContext.Provider value={contextValue}>
      <ChakraProvider theme={chakraTheme}>
        {children}
      </ChakraProvider>
    </ChildThemeContext.Provider>
  );
}

export default ChildThemeProvider;
