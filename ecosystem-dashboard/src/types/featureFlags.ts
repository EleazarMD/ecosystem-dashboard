/**
 * Feature Flags Type Definitions
 * 
 * Purpose: Runtime control of dashboard features for safe progressive rollout
 * Created: 2025-11-17
 * 
 * Principles:
 * - All flags default to FALSE (safe)
 * - User overrides take precedence
 * - Emergency disable overrides everything
 */

export interface PageFeatureFlags {
  useNewLayout: boolean;
  [key: string]: boolean; // Allow additional page-specific flags
}

export interface ADKPageFlags extends PageFeatureFlags {
  preserveADK: boolean; // Extra safety for ADK UI
}

export interface FeatureFlags {
  // Global Layout Features
  enableNewLayouts: boolean;
  enableGlassmorphicDesign: boolean;
  enableThemeSystem: boolean;
  
  // Per-Page Flags
  pages: {
    // Core Pages
    dashboard: PageFeatureFlags;
    
    // Studios
    'ai-research': PageFeatureFlags;
    'podcast-studio': PageFeatureFlags;
    workspace: PageFeatureFlags;
    'image-studio': PageFeatureFlags;
    'ml-training': PageFeatureFlags;
    'educational-library': PageFeatureFlags;
    'publishing-hub': PageFeatureFlags;
    'data-analysis': PageFeatureFlags;
    
    // Critical System
    'agentic-control': ADKPageFlags;
    
    // Infrastructure
    'ai-inferencing': PageFeatureFlags;
    'ai-gateway': PageFeatureFlags;
    monitoring: PageFeatureFlags;
    analytics: PageFeatureFlags;
    
    // Knowledge Base
    'knowledge-base': PageFeatureFlags;
    experiments: PageFeatureFlags;
    datasets: PageFeatureFlags;
    models: PageFeatureFlags;
    papers: PageFeatureFlags;
    'code-snippets': PageFeatureFlags;
    resources: PageFeatureFlags;
    
    // Additional pages (extensible)
    [key: string]: PageFeatureFlags | ADKPageFlags;
  };
  
  // User-specific overrides (highest priority)
  userOverrides: {
    [userId: string]: Partial<FeatureFlags>;
  };
  
  // Emergency kill switch (overrides everything)
  emergencyDisableAll: boolean;
}

// Default flags (theme system enabled with professional design)
export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  enableNewLayouts: false,
  enableGlassmorphicDesign: true,  // ✅ Professional glassmorphic effects
  enableThemeSystem: true,         // ✅ 12 professional themes available
  
  pages: {
    dashboard: { useNewLayout: false },
    'ai-research': { useNewLayout: false },
    'podcast-studio': { useNewLayout: false },
    workspace: { useNewLayout: false },
    'agentic-control': { useNewLayout: false, preserveADK: true },
    'ai-inferencing': { useNewLayout: false },
    'ai-gateway': { useNewLayout: false },
    monitoring: { useNewLayout: false },
    analytics: { useNewLayout: false },
    'image-studio': { useNewLayout: false },
    'ml-training': { useNewLayout: false },
    'educational-library': { useNewLayout: false },
    'publishing-hub': { useNewLayout: false },
    'data-analysis': { useNewLayout: false },
    'knowledge-base': { useNewLayout: false },
    experiments: { useNewLayout: false },
    datasets: { useNewLayout: false },
    models: { useNewLayout: false },
    papers: { useNewLayout: false },
    'code-snippets': { useNewLayout: false },
    resources: { useNewLayout: false },
  },
  
  userOverrides: {},
  emergencyDisableAll: false,
};

// Feature flag update request
export interface FeatureFlagUpdate {
  flagPath: string; // e.g., "pages.ai-research.useNewLayout"
  value: boolean | object;
  userId?: string; // For user-specific overrides
  reason?: string; // Audit trail
}

// Feature flag response from API
export interface FeatureFlagResponse {
  success: boolean;
  flags: FeatureFlags;
  version: number;
  lastUpdated: string;
}

// Feature flag change event (for WebSocket updates)
export interface FeatureFlagChangeEvent {
  type: 'feature_flag_change';
  flagPath: string;
  oldValue: any;
  newValue: any;
  changedBy: string;
  timestamp: string;
}

// Helper type for page names
export type PageName = keyof FeatureFlags['pages'] | string;

// Helper function to get nested flag value
export function getNestedFlag(
  flags: FeatureFlags,
  path: string
): boolean | object | undefined {
  const parts = path.split('.');
  let current: any = flags;
  
  for (const part of parts) {
    if (current === undefined || current === null) {
      return undefined;
    }
    current = current[part];
  }
  
  return current;
}

// Helper function to check if feature is enabled for user
export function isFeatureEnabledForUser(
  flags: FeatureFlags,
  userId: string | null,
  featurePath: string
): boolean {
  // Emergency disable overrides everything
  if (flags.emergencyDisableAll) {
    return false;
  }
  
  // Check user override first
  if (userId && flags.userOverrides[userId]) {
    const userValue = getNestedFlag(flags.userOverrides[userId] as any, featurePath);
    if (userValue !== undefined) {
      return userValue as boolean;
    }
  }
  
  // Fall back to global flag
  const globalValue = getNestedFlag(flags, featurePath);
  return globalValue === true;
}

// Helper function to check if page should use new layout
export function shouldUseNewLayout(
  flags: FeatureFlags,
  userId: string | null,
  pageName: PageName
): boolean {
  return isFeatureEnabledForUser(flags, userId, `pages.${pageName}.useNewLayout`);
}
