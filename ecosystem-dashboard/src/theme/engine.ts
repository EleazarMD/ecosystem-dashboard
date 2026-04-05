/**
 * Virtual Dashboard Engine
 * 
 * The core engine that transforms abstract ThemePresets into concrete
 * Chakra UI ThemeConfigs. This engine handles the "magic" of mapping
 * high-level design intents (like "Neumorphic" or "Cyberpunk") into
 * thousands of specific CSS rules and tokens.
 */

import { extendTheme, ThemeConfig } from '@chakra-ui/react';
import { ThemePreset } from './types';
import { typography } from './typography';

// Helper to generate color scales (simplified for now)
function generateColorScale(baseColor: string): Record<number, string> {
    // In a real engine, this would use polished or tinycolor2
    return {
        50: baseColor,
        100: baseColor,
        200: baseColor,
        300: baseColor,
        400: baseColor,
        500: baseColor,
        600: baseColor,
        700: baseColor,
        800: baseColor,
        900: baseColor,
    };
}

/**
 * The Virtual Theme Engine
 * Compiles a ThemePreset into a Chakra Theme Object
 */
export class VirtualThemeEngine {
    private preset: ThemePreset;

    constructor(preset: ThemePreset) {
        this.preset = preset;
    }

    public compile(): Record<string, any> {
        const { colors, typography: typeConfig, radii, shadows, components, glassBlur } = this.preset;

        // 1. Generate Color Palettes
        const brandScale = generateColorScale(colors.primary);
        const accentScale = generateColorScale(colors.accent);

        // 2. Resolve Typography
        // We map the preset's font selections to actual font families
        const fonts = {
            heading: typeConfig.fontHeading,
            body: typeConfig.fontBody,
            mono: typeConfig.fontMono,
        };

        // 3. Construct Component Overrides
        // This is where the "Virtual" mapping happens - translating abstract variants to CSS
        const componentOverrides = this.generateComponentOverrides();

        // 4. Build the Chakra Theme Object
        return extendTheme({
            config: {
                initialColorMode: this.preset.mode,
                useSystemColorMode: false,
            } as ThemeConfig,

            colors: {
                brand: brandScale,
                accent: accentScale,
                // Map semantic colors to top-level for easy access if needed
                bg: {
                    primary: colors.background,
                    secondary: colors.backgroundSecondary,
                    tertiary: colors.backgroundTertiary,
                },
            },

            fonts,

            radii: {
                sm: radii.input,
                md: radii.card,
                lg: radii.modal,
                xl: radii.modal,
                '2xl': radii.modal,
                full: '9999px',
            },

            shadows: {
                card: shadows.card,
                cardHover: shadows.cardHover,
                popover: shadows.popover,
                modal: shadows.modal,
            },

            styles: {
                global: {
                    body: {
                        bg: colors.background,
                        color: colors.text,
                        fontFamily: fonts.body,
                    },
                    // Global glass effect utility class
                    '.glass-panel': {
                        bg: colors.glassBackground,
                        backdropFilter: `blur(${glassBlur})`,
                        border: colors.glassBorder,
                    },
                },
            },

            components: componentOverrides,
        });
    }

    private generateComponentOverrides() {
        const { colors, radii, shadows, components, glassBlur } = this.preset;

        return {
            // --- Card ---
            Card: {
                baseStyle: {
                    container: {
                        borderRadius: radii.card,
                        transition: 'all 0.2s ease-in-out',
                    },
                },
                variants: {
                    elevated: {
                        container: {
                            bg: colors.backgroundSecondary,
                            boxShadow: shadows.card,
                            border: `1px solid ${colors.border}`,
                            _hover: {
                                boxShadow: shadows.cardHover,
                                borderColor: colors.borderHover,
                            },
                        },
                    },
                    outline: {
                        container: {
                            bg: 'transparent',
                            border: `1px solid ${colors.border}`,
                            color: colors.text,
                        },
                    },
                    filled: {
                        container: {
                            bg: colors.backgroundTertiary,
                            color: colors.text,
                        },
                    },
                    glass: {
                        container: {
                            bg: colors.glassBackground,
                            backdropFilter: `blur(${glassBlur})`,
                            border: colors.glassBorder,
                            boxShadow: shadows.card,
                        },
                    },
                    neumorphic: {
                        container: {
                            bg: colors.background,
                            boxShadow: this.preset.mode === 'light'
                                ? '20px 20px 60px #d1d9e6, -20px -20px 60px #ffffff'
                                : '5px 5px 10px #0b0b0b, -5px -5px 10px #1f1f1f',
                            border: 'none',
                        },
                    },
                },
                defaultProps: {
                    variant: components.Card.variant,
                },
            },

            // --- Button ---
            Button: {
                baseStyle: {
                    borderRadius: components.Button.borderRadius || radii.button,
                    fontWeight: 'semibold',
                },
                variants: {
                    solid: {
                        bg: colors.primary,
                        color: colors.textInverse,
                        _hover: {
                            bg: colors.primaryHover,
                            transform: 'translateY(-1px)',
                            boxShadow: 'lg',
                        },
                        _active: {
                            bg: colors.primaryActive,
                            transform: 'translateY(0)',
                        },
                    },
                    outline: {
                        borderColor: colors.border,
                        color: colors.text,
                        _hover: {
                            bg: colors.backgroundSecondary,
                            borderColor: colors.primary,
                        },
                    },
                    ghost: {
                        color: colors.textSecondary,
                        _hover: {
                            bg: colors.backgroundSecondary,
                            color: colors.text,
                        },
                    },
                    glass: {
                        bg: colors.glassBackground,
                        backdropFilter: `blur(${glassBlur})`,
                        border: colors.glassBorder,
                        color: colors.text,
                        _hover: {
                            bg: colors.backgroundSecondary,
                        },
                    },
                    neumorphic: {
                        bg: colors.background,
                        color: colors.text,
                        boxShadow: this.preset.mode === 'light'
                            ? '6px 6px 12px #d1d9e6, -6px -6px 12px #ffffff'
                            : '4px 4px 8px #0b0b0b, -4px -4px 8px #1f1f1f',
                        _hover: {
                            transform: 'translateY(-1px)',
                        },
                        _active: {
                            boxShadow: this.preset.mode === 'light'
                                ? 'inset 6px 6px 12px #d1d9e6, inset -6px -6px 12px #ffffff'
                                : 'inset 4px 4px 8px #0b0b0b, inset -4px -4px 8px #1f1f1f',
                        },
                    },
                },
                defaultProps: {
                    variant: components.Button.variant,
                },
            },

            // --- Input ---
            Input: {
                variants: {
                    outline: {
                        field: {
                            bg: colors.backgroundSecondary,
                            borderColor: colors.border,
                            borderRadius: radii.input,
                            _hover: {
                                borderColor: colors.borderHover,
                            },
                            _focus: {
                                borderColor: colors.primary,
                                boxShadow: `0 0 0 1px ${colors.primary}`,
                            },
                        },
                    },
                    filled: {
                        field: {
                            bg: colors.backgroundTertiary,
                            borderRadius: radii.input,
                            _focus: {
                                bg: colors.backgroundSecondary,
                                borderColor: colors.primary,
                            },
                        },
                    },
                    neumorphic: {
                        field: {
                            bg: colors.background,
                            borderRadius: radii.input,
                            boxShadow: this.preset.mode === 'light'
                                ? 'inset 4px 4px 8px #d1d9e6, inset -4px -4px 8px #ffffff'
                                : 'inset 3px 3px 6px #0b0b0b, inset -3px -3px 6px #1f1f1f',
                            border: 'none',
                            _focus: {
                                boxShadow: this.preset.mode === 'light'
                                    ? 'inset 6px 6px 12px #d1d9e6, inset -6px -6px 12px #ffffff'
                                    : 'inset 5px 5px 10px #0b0b0b, inset -5px -5px 10px #1f1f1f',
                            },
                        },
                    },
                },
                defaultProps: {
                    variant: components.Input.variant,
                },
            },

            // --- Modal ---
            Modal: {
                baseStyle: {
                    dialog: {
                        bg: colors.background,
                        borderRadius: radii.modal,
                        boxShadow: shadows.modal,
                    },
                },
            },
        };
    }
}

/**
 * Factory function to create a theme from a preset
 */
export function createThemeFromPreset(preset: ThemePreset): Record<string, any> {
    const engine = new VirtualThemeEngine(preset);
    return engine.compile();
}
