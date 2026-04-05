/**
 * Tesla Browser Detection Hook
 * 
 * Detects Tesla vehicle browsers and provides screen adaptation info.
 * 
 * Tesla Browser Details:
 * - User Agent contains "Tesla/" identifier (e.g., "Tesla/feature-2022.20.9")
 * - Runs on Chromium/Blink engine (X11; Linux x86_64)
 * - Example UA: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) 
 *               Chrome/100.0.4896.127 Safari/537.36 Tesla/feature-2022.20.9-31-abc
 * 
 * Screen Specifications (verified):
 * ┌──────────────────────┬───────────┬────────────┬─────────────┐
 * │ Vehicle              │ Size      │ Resolution │ Orientation │
 * ├──────────────────────┼───────────┼────────────┼─────────────┤
 * │ Model 3 (2017-2023)  │ 15"       │ 1920×1200  │ Landscape   │
 * │ Model 3 Highland 24+ │ 15.4"     │ 1920×1200  │ Landscape   │
 * │ Model Y              │ 15.4"     │ 1920×1200  │ Landscape   │
 * │ Model S/X pre-2021   │ 17"       │ 1200×1920  │ Portrait    │
 * │ Model S/X 2021+      │ 17"       │ 2200×1300  │ Landscape   │
 * │ Model 3 Highland rear│ ~8"       │ unknown    │ Landscape   │
 * │ Instrument cluster   │ 12.3"     │ 1920×1200  │ Landscape   │
 * └──────────────────────┴───────────┴────────────┴─────────────┘
 * 
 * Chrome DevTools custom devices (add via Settings > Devices):
 *   "Tesla Model 3/Y"     — 1920 × 1200, DPR 1, UA: ...Tesla/feature-2024.38
 *   "Tesla Model S/X 21+" — 2200 × 1300, DPR 1, UA: ...Tesla/feature-2024.38
 *   "Tesla Model S/X Pre" — 1200 × 1920, DPR 1, UA: ...Tesla/feature-2020.48
 */

import { useState, useEffect, useMemo } from 'react';

export type TeslaScreenType = 
  | 'model-3-y'        // 15/15.4" landscape, 1920×1200
  | 'model-s-x-legacy' // 17" portrait, 1200×1920 (pre-2021)
  | 'model-s-x-new'    // 17" landscape, 2200×1300 (2021+)
  | 'unknown';

export interface TeslaDetectionResult {
  /** Whether the browser is a Tesla vehicle browser */
  isTesla: boolean;
  /** The detected screen type based on viewport analysis */
  screenType: TeslaScreenType;
  /** The Tesla software version from the UA string (e.g., "2022.20.9") */
  softwareVersion: string | null;
  /** Whether the screen is in portrait orientation (legacy Model S/X) */
  isPortrait: boolean;
  /** Recommended touch target size in px (larger for vehicle use) */
  minTouchTarget: number;
  /** Recommended font scale multiplier for readability while driving */
  fontScale: number;
  /** Whether to show simplified/driver-focused UI */
  driverMode: boolean;
  /** Screen dimensions */
  screenWidth: number;
  screenHeight: number;
  /** Whether Tesla display is in dark mode (from car settings) */
  isDarkMode: boolean;
  /** Whether Tesla display is in light mode */
  isLightMode: boolean;
}

/** Parse Tesla software version from user agent string */
function parseTeslaSoftwareVersion(ua: string): string | null {
  const match = ua.match(/Tesla\/(?:feature-)?(\d+\.\d+(?:\.\d+)?)/);
  return match ? match[1] : null;
}

/** Detect Tesla screen type from viewport dimensions */
function detectScreenType(width: number, height: number): TeslaScreenType {
  const isPortrait = height > width;
  
  // Legacy Model S/X: portrait 17" — 1200×1920
  if (isPortrait && width >= 1100 && width <= 1300 && height >= 1800 && height <= 2000) {
    return 'model-s-x-legacy';
  }
  
  // New Model S/X 2021+: landscape 17" — 2200×1300
  if (!isPortrait && width >= 2100 && width <= 2300 && height >= 1200 && height <= 1400) {
    return 'model-s-x-new';
  }
  
  // Model 3/Y: landscape 15-15.4" — 1920×1200
  if (!isPortrait && width >= 1800 && width <= 2000 && height >= 1100 && height <= 1300) {
    return 'model-3-y';
  }
  
  return 'unknown';
}

/**
 * Hook to detect Tesla vehicle browser and provide adaptive UI parameters.
 * 
 * Usage:
 * ```tsx
 * const { isTesla, screenType, minTouchTarget, fontScale, driverMode } = useTeslaDetection();
 * 
 * if (isTesla) {
 *   // Render larger touch targets, simplified navigation, voice-first UI
 * }
 * ```
 */
export function useTeslaDetection(): TeslaDetectionResult {
  const [screenWidth, setScreenWidth] = useState(0);
  const [screenHeight, setScreenHeight] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(true); // Tesla defaults to dark

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateDimensions = () => {
      setScreenWidth(window.screen.width || window.innerWidth);
      setScreenHeight(window.screen.height || window.innerHeight);
    };

    // Detect system color scheme (Tesla respects this from car settings)
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(darkModeQuery.matches);

    const handleColorSchemeChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };

    darkModeQuery.addEventListener('change', handleColorSchemeChange);
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
      darkModeQuery.removeEventListener('change', handleColorSchemeChange);
    };
  }, []);

  return useMemo(() => {
    if (typeof navigator === 'undefined') {
      return {
        isTesla: false,
        screenType: 'unknown',
        softwareVersion: null,
        isPortrait: false,
        minTouchTarget: 44,
        fontScale: 1,
        driverMode: false,
        screenWidth: 0,
        screenHeight: 0,
        isDarkMode: true,
        isLightMode: false,
      };
    }

    const ua = navigator.userAgent;
    const isTesla = /Tesla\//i.test(ua);
    const softwareVersion = isTesla ? parseTeslaSoftwareVersion(ua) : null;
    const screenType = isTesla ? detectScreenType(screenWidth, screenHeight) : 'unknown';
    const isPortrait = screenHeight > screenWidth;

    // Tesla-optimized parameters
    const minTouchTarget = isTesla ? 56 : 44; // Larger touch targets for vehicle
    const fontScale = isTesla ? 1.15 : 1;     // Slightly larger text for glanceable reading
    const driverMode = isTesla;                // Simplified UI by default on Tesla

    return {
      isTesla,
      screenType,
      softwareVersion,
      isPortrait,
      minTouchTarget,
      fontScale,
      driverMode,
      screenWidth,
      screenHeight,
      isDarkMode,
      isLightMode: !isDarkMode,
    };
  }, [screenWidth, screenHeight, isDarkMode]);
}

/**
 * Utility: Check if running on Tesla without the hook (for non-component contexts).
 */
export function isTeslaBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Tesla\//i.test(navigator.userAgent);
}

/**
 * CSS custom properties for Tesla-adaptive styling.
 * Apply these to a container to automatically scale UI elements.
 */
export function getTeslaCSSVariables(detection: TeslaDetectionResult): Record<string, string> {
  if (!detection.isTesla) return {};

  return {
    '--tesla-font-scale': `${detection.fontScale}`,
    '--tesla-touch-target': `${detection.minTouchTarget}px`,
    '--tesla-border-radius': '16px',
    '--tesla-spacing-unit': '8px',
    '--tesla-card-padding': '20px',
    '--tesla-nav-item-height': '56px',
  };
}

/**
 * Chrome DevTools custom device definitions for Tesla screens.
 * 
 * To add in Chrome DevTools:
 *   1. Open DevTools (F12)
 *   2. Settings (gear icon) → Devices
 *   3. Click "Add custom device..." for each entry below
 * 
 * Or import via DevTools protocol.
 */
export const TESLA_DEVICES = [
  {
    name: 'Tesla Model 3/Y (15.4")',
    width: 1920,
    height: 1200,
    devicePixelRatio: 1,
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Tesla/feature-2024.38',
  },
  {
    name: 'Tesla Model S/X 2021+ (17")',
    width: 2200,
    height: 1300,
    devicePixelRatio: 1,
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Tesla/feature-2024.38',
  },
  {
    name: 'Tesla Model S/X Pre-2021 (17" Portrait)',
    width: 1200,
    height: 1920,
    devicePixelRatio: 1,
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36 Tesla/feature-2020.48',
  },
] as const;
