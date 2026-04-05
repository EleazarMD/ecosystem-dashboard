/**
 * Feature flags configuration for AI Homelab Dashboard
 * Controls which advanced features are enabled to prevent runtime crashes
 */

export interface FeatureFlags {
  // Provider features
  enableAIGatewayProvider: boolean;
  enableAHISProvider: boolean;
  enableAgenticCommandProvider: boolean;
  
  // Component features
  enableKnowledgeGraphSidebar: boolean;
  enableAgentNotifications: boolean;
  enableRealTimeUpdates: boolean;
  
  // Dashboard features
  enableAdvancedDashboard: boolean;
  enableSystemMetrics: boolean;
  enableActivityFeed: boolean;
  
  // Development features
  enableDebugMode: boolean;
  enableErrorBoundaries: boolean;
}

// Default feature flags - full functionality restored
const defaultFlags: FeatureFlags = {
  // Providers - restored with DualPortAIGatewayProvider
  enableAIGatewayProvider: true,
  enableAHISProvider: true,
  enableAgenticCommandProvider: true,
  
  // Components - enabled with full functionality
  enableKnowledgeGraphSidebar: true,
  enableAgentNotifications: true,
  enableRealTimeUpdates: true,
  
  // Dashboard features - full advanced features enabled
  enableAdvancedDashboard: true,
  enableSystemMetrics: true,
  enableActivityFeed: true,
  
  // Development features - enabled for debugging
  enableDebugMode: process.env.NODE_ENV === 'development',
  enableErrorBoundaries: true,
};

// Environment-based overrides
const getEnvironmentFlags = (): Partial<FeatureFlags> => {
  const flags: Partial<FeatureFlags> = {};
  
  // Enable features based on environment variables
  if (process.env.NEXT_PUBLIC_ENABLE_AI_GATEWAY === 'true') {
    flags.enableAIGatewayProvider = true;
  }
  
  if (process.env.NEXT_PUBLIC_ENABLE_AHIS === 'true') {
    flags.enableAHISProvider = true;
  }
  
  if (process.env.NEXT_PUBLIC_ENABLE_ADVANCED_DASHBOARD === 'true') {
    flags.enableAdvancedDashboard = true;
  }
  
  if (process.env.NEXT_PUBLIC_ENABLE_KG_SIDEBAR === 'true') {
    flags.enableKnowledgeGraphSidebar = true;
  }
  
  return flags;
};

// Merge default flags with environment overrides
export const featureFlags: FeatureFlags = {
  ...defaultFlags,
  ...getEnvironmentFlags(),
};

// Utility functions for feature flag checks
export const isFeatureEnabled = (flag: keyof FeatureFlags): boolean => {
  return featureFlags[flag] as boolean;
};

export const getEnabledFeatures = (): string[] => {
  return Object.entries(featureFlags)
    .filter(([_, enabled]) => enabled)
    .map(([feature, _]) => feature);
};

export const getDisabledFeatures = (): string[] => {
  return Object.entries(featureFlags)
    .filter(([_, enabled]) => !enabled)
    .map(([feature, _]) => feature);
};

// Development helper to log feature flag status
if (process.env.NODE_ENV === 'development') {
  console.log('🚩 Feature Flags Status:');
  console.log('✅ Enabled:', getEnabledFeatures());
  console.log('❌ Disabled:', getDisabledFeatures());
}
