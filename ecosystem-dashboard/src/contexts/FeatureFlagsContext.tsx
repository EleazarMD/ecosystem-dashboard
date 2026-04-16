/**
 * Feature Flags Context
 * 
 * Shared context so all components use the same feature flag state
 */

import { createContext, useContext } from 'react';
import { useFeatureFlagsClient } from '@/hooks/useFeatureFlagsClient';
import type { FeatureFlags, PageName } from '@/types/featureFlags';
import { DEFAULT_FEATURE_FLAGS } from '@/types/featureFlags';

interface FeatureFlagsContextValue {
  flags: FeatureFlags;
  loading: boolean;
  error: Error | null;
  version: number;
  lastUpdated: string | null;
  isEnabled: (featurePath: string) => boolean;
  shouldUseNewLayout: (pageName: PageName) => boolean;
  updateFlag: (flagPath: string, value: boolean | object, reason?: string) => Promise<boolean>;
  emergencyDisableAll: () => Promise<boolean>;
  refresh: () => void;
}

// Default context value (used before provider mounts)
const defaultContextValue: FeatureFlagsContextValue = {
  flags: DEFAULT_FEATURE_FLAGS,
  loading: false,
  error: null,
  version: 0,
  lastUpdated: null,
  isEnabled: () => false,
  shouldUseNewLayout: () => false,
  updateFlag: async () => false,
  emergencyDisableAll: async () => false,
  refresh: () => {},
};

const FeatureFlagsContext = createContext<FeatureFlagsContextValue>(defaultContextValue);

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const featureFlags = useFeatureFlagsClient();
  
  return (
    <FeatureFlagsContext.Provider value={featureFlags}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags(userId?: string | null) {
  const context = useContext(FeatureFlagsContext);
  return context;
}
