/**
 * Feature Flags
 * Safely enable/disable experimental features
 */

export const FEATURE_FLAGS = {
  // New centralized view context system
  USE_VIEW_CONTEXT_MANAGER: true, // Set to true to enable, false to use old system
  
  // Debug mode - logs context changes
  DEBUG_PANEL_CONTEXT: false,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag];
}
