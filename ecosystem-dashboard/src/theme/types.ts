/**
 * Virtual Dashboard Engine Types
 * 
 * Defines the expanded schema for the Virtual Dashboard Engine,
 * enabling rich UI/UX configuration beyond simple colors.
 */

import { ThemeConfig } from '@chakra-ui/react';

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
    // Brand Colors
    primary: string;
    primaryHover: string;
    primaryActive: string;

    secondary: string;
    secondaryHover: string;

    accent: string;
    accentHover: string;

    // Semantic Roles
    background: string;
    backgroundSecondary: string;
    backgroundTertiary: string;

    text: string;
    textSecondary: string;
    textMuted: string;
    textInverse: string;

    border: string;
    borderHover: string;

    // Glass Effects
    glassBackground: string;
    glassBorder: string;

    // Status Colors (optional overrides)
    success?: string;
    warning?: string;
    error?: string;
    info?: string;
}

export interface ThemeTypography {
    fontHeading: string;
    fontBody: string;
    fontMono: string;
    fontSizeScale: 'sm' | 'md' | 'lg'; // Scales base size
}

export interface ThemeRadii {
    card: string;    // '0px', '8px', '16px', '24px'
    button: string;  // '0px', '4px', '9999px'
    input: string;   // '0px', '4px', '8px'
    modal: string;   // '0px', '12px', '24px'
}

export interface ThemeShadows {
    card: string;
    cardHover: string;
    popover: string;
    modal: string;
}

export interface ComponentVariant {
    bg?: string;
    color?: string;
    border?: string;
    boxShadow?: string;
    _hover?: any;
    _active?: any;
    _focus?: any;
}

export interface ThemeComponents {
    Card: {
        variant: 'elevated' | 'outline' | 'filled' | 'glass' | 'neumorphic';
    };
    Button: {
        variant: 'solid' | 'outline' | 'ghost' | 'glass' | 'neumorphic';
        borderRadius?: string; // Override global radius
    };
    Input: {
        variant: 'outline' | 'filled' | 'flushed' | 'neumorphic';
    };
}

export interface ThemePreset {
    id: string;
    name: string;
    description: string;
    mode: ThemeMode;

    // Core Design Tokens
    colors: ThemeColors;
    typography: ThemeTypography;
    radii: ThemeRadii;
    shadows: ThemeShadows;

    // Component DNA
    components: ThemeComponents;

    // Engine Configuration
    glassBlur: string; // '0px' to '40px'
    density: 'compact' | 'comfortable' | 'spacious';
}
