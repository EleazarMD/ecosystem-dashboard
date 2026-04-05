/**
 * useAdaptiveGlass Hook
 * 
 * Provides glassmorphic effect properties that intelligently adapt
 * to theme mode (light/dark) ensuring visibility in all themes
 */

import { useTheme } from '../theme/ThemeProvider';
import { useSemanticToken } from './useSemanticToken';

export interface GlassmorphicStyles {
  background: string;
  backdropFilter: string;
  border: string;
  boxShadow: string;
  borderRadius?: string;
}

export interface GlassmorphicOptions {
  /** Intensity of glass effect (0-1). Higher = more transparent */
  intensity?: number;
  /** Apply border radius */
  rounded?: boolean | string;
  /** Include shadow */
  shadow?: boolean;
}

/**
 * Get adaptive glassmorphic styles that work in light AND dark themes
 * 
 * Light themes: White/light glass with subtle transparency
 * Dark themes: Dark glass with higher opacity for visibility
 */
export function useAdaptiveGlass(options: GlassmorphicOptions = {}): GlassmorphicStyles {
  const {
    intensity = 0.7,
    rounded = true,
    shadow = true
  } = options;
  
  const { currentTheme } = useTheme();
  const isLight = currentTheme?.mode === 'light';
  
  const background = useSemanticToken('glass.background');
  const border = useSemanticToken('glass.border');
  const glassShadow = useSemanticToken('glass.shadow');
  const blur = useSemanticToken('glass.blur');
  
  // Adapt opacity based on intensity
  const adaptedBackground = isLight
    ? `rgba(255, 255, 255, ${0.5 + (intensity * 0.4)})` // 0.5-0.9
    : `rgba(30, 30, 30, ${0.7 + (intensity * 0.25)})`; // 0.7-0.95
  
  return {
    background: adaptedBackground,
    backdropFilter: `blur(${blur}) saturate(180%)`,
    border: border,
    boxShadow: shadow ? glassShadow : 'none',
    ...(rounded && {
      borderRadius: typeof rounded === 'string' ? rounded : 'lg'
    })
  };
}

/**
 * Get glass hover effect styles
 */
export function useAdaptiveGlassHover(): GlassmorphicStyles {
  const background = useSemanticToken('glass.backgroundHover');
  const border = useSemanticToken('glass.border');
  const shadow = useSemanticToken('glass.shadowHover');
  const blur = useSemanticToken('glass.blur');
  
  return {
    background,
    backdropFilter: `blur(${blur}) saturate(200%)`, // Enhanced saturation on hover
    border,
    boxShadow: shadow,
  };
}

/**
 * Get glass focus effect styles
 */
export function useAdaptiveGlassFocus(): GlassmorphicStyles {
  const background = useSemanticToken('glass.backgroundFocus');
  const border = useSemanticToken('border.focus');
  const shadow = useSemanticToken('glass.shadowHover');
  const blur = useSemanticToken('glass.blur');
  
  return {
    background,
    backdropFilter: `blur(${blur}) saturate(200%)`,
    border: `2px solid ${border}`, // Thicker focus border
    boxShadow: `${shadow}, 0 0 0 3px ${border}33`, // Focus ring
  };
}

/**
 * Get Chakra UI compatible glass props
 * Returns object that can be spread directly onto Box/other components
 */
export function useGlassProps(options: GlassmorphicOptions = {}) {
  const glass = useAdaptiveGlass(options);
  
  return {
    bg: glass.background,
    backdropFilter: glass.backdropFilter,
    border: glass.border,
    boxShadow: glass.boxShadow,
    ...(glass.borderRadius && { borderRadius: glass.borderRadius }),
  };
}
