/**
 * Activity Theme Tokens — per-activity theme overlay over the child base theme.
 *
 * Contract: docs/KIDS_PLATFORM_CONTRACTS.md §2
 * Promotes the hardcoded `SURFACE` const from PokemonLab.tsx into a first-class
 * token set so any activity can declare its look without hand-rolling colors.
 */

import { ChildTheme } from '@/lib/child-themes';
import { ThemeColors, ThemeMode } from '@/theme/types';

/** Subset of ChildTheme['colors'] we allow an activity to override. */
export type ChildColorToken = keyof ThemeColors;

/** Opaque surface palette — the promoted PokemonLab `SURFACE`. */
export interface ActivitySurfaceTokens {
  panel: string;
  card: string;
  cardLocked?: string;
  border: string;
  borderLocked?: string;
  title: string;
  body: string;
  muted: string;
}

/** Per-activity theme OVERLAY. All fields optional → inherit the child's base theme. */
export interface ActivityThemeTokens {
  id: string;
  mode?: ThemeMode;

  /** Override a subset of ChildTheme.colors for the duration of the activity. */
  colors?: Partial<ThemeColors>;

  /** Opaque surfaces the activity draws on (companion + lesson chrome consume these). */
  surface?: ActivitySurfaceTokens;

  /** Activity-scoped decoration (overrides childExtras.decorations for this surface). */
  decorations?: {
    emoji?: string[];
    wallpaper?: string;
    headerBanner?: { background?: string; pattern?: string; texture?: string };
  };

  /**
   * Labs often want a clean canvas. When true the child's base wallpaper is suppressed
   * — exactly what PokemonLab's `SURFACE` comment achieves by hand today.
   */
  isolateFromBaseWallpaper?: boolean;
}

/** The resolved theme the UI consumes: base ChildTheme ⊕ activity overlay. */
export interface EffectiveChildTheme extends ChildTheme {
  /** Activity-scoped surface tokens (from overlay, or undefined if no overlay). */
  surface?: ActivitySurfaceTokens;
  /** Whether the base wallpaper is suppressed. */
  isolateFromBaseWallpaper: boolean;
  /** The activity theme id that produced this overlay, if any. */
  activityThemeId?: string;
}

/**
 * Pure merge: activity overlay wins; missing tokens fall back to the child base.
 * Does not mutate either input.
 */
export function resolveEffectiveTheme(
  base: ChildTheme,
  overlay?: ActivityThemeTokens,
): EffectiveChildTheme {
  if (!overlay) {
    return { ...base, isolateFromBaseWallpaper: false };
  }

  const mergedColors: ThemeColors = {
    ...base.colors,
    ...(overlay.colors ?? {}),
  };

  const baseDecorations = base.childExtras.decorations;

  const mergedDecorations = {
    ...baseDecorations,
    emoji: overlay.decorations?.emoji ?? baseDecorations.emoji,
    backgroundImages: overlay.decorations?.wallpaper
      ? { ...baseDecorations.backgroundImages, default: overlay.decorations.wallpaper }
      : baseDecorations.backgroundImages,
    headerBanner: overlay.decorations?.headerBanner
      ? { ...baseDecorations.headerBanner, ...overlay.decorations.headerBanner }
      : baseDecorations.headerBanner,
  };

  return {
    ...base,
    mode: overlay.mode ?? base.mode,
    colors: mergedColors,
    childExtras: {
      ...base.childExtras,
      decorations: mergedDecorations,
    },
    surface: overlay.surface,
    isolateFromBaseWallpaper: overlay.isolateFromBaseWallpaper ?? false,
    activityThemeId: overlay.id,
  };
}
