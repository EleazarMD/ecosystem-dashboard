/**
 * Client-Side Feature Flags Hook
 * 
 * Simple localStorage-based feature flags (no API needed)
 * Perfect for testing new features before full backend implementation
 */

import { useState, useCallback, useEffect } from 'react';
import {
  FeatureFlags,
  DEFAULT_FEATURE_FLAGS,
  isFeatureEnabledForUser,
  shouldUseNewLayout as shouldUseNewLayoutHelper,
} from '@/types/featureFlags';
import type { PageName } from '@/types/featureFlags';

const STORAGE_KEY = 'dashboard-feature-flags';

interface UseFeatureFlagsResult {
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

export function useFeatureFlagsClient(userId?: string | null): UseFeatureFlagsResult {
  const [flags, setFlags] = useState<FeatureFlags>(() => {
    // Load from localStorage on init
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // 🔄 MIGRATION: Disable emergency mode and enable theme system
          if (
            parsed.emergencyDisableAll === true || 
            parsed.enableThemeSystem === false || 
            parsed.enableGlassmorphicDesign === false
          ) {
            console.log('[FeatureFlags] 🔄 Migrating flags: disabling emergency mode, enabling theme system');
            const migrated = {
              ...parsed,
              emergencyDisableAll: false,  // ← Disable emergency mode
              enableThemeSystem: true,
              enableGlassmorphicDesign: true,
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
            return migrated;
          }
          return parsed;
        } catch {
          return DEFAULT_FEATURE_FLAGS;
        }
      }
    }
    return DEFAULT_FEATURE_FLAGS;
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [version, setVersion] = useState(1);
  const [lastUpdated, setLastUpdated] = useState<string | null>(new Date().toISOString());
  
  // Save to localStorage whenever flags change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
      console.log('[FeatureFlags] Saved to localStorage:', flags);
      console.log('[FeatureFlags] Theme System Enabled:', flags.enableThemeSystem);
    }
  }, [flags]);
  
  // Check if feature is enabled
  const isEnabled = useCallback((featurePath: string): boolean => {
    return isFeatureEnabledForUser(flags, userId || null, featurePath);
  }, [flags, userId]);
  
  // Check if page should use new layout
  const shouldUseNewLayout = useCallback((pageName: PageName): boolean => {
    return shouldUseNewLayoutHelper(flags, userId || null, pageName);
  }, [flags, userId]);
  
  // Update feature flag
  const updateFlag = useCallback(async (
    flagPath: string,
    value: boolean | object,
    reason?: string
  ): Promise<boolean> => {
    try {
      console.log(`[FeatureFlags] 🔧 Updating ${flagPath} = ${value}`, reason);
      
      setFlags(prevFlags => {
        // Deep clone to ensure React detects the change
        const newFlags = JSON.parse(JSON.stringify(prevFlags));
        
        // Parse the flag path and update the nested value
        const pathParts = flagPath.split('.');
        let current: any = newFlags;
        
        for (let i = 0; i < pathParts.length - 1; i++) {
          if (!current[pathParts[i]]) {
            current[pathParts[i]] = {};
          }
          current = current[pathParts[i]];
        }
        
        current[pathParts[pathParts.length - 1]] = value;
        
        console.log(`[FeatureFlags] ✅ Updated ${flagPath} =`, value, reason ? `(${reason})` : '');
        console.log('[FeatureFlags] New flags:', newFlags);
        
        return newFlags;
      });
      
      setVersion(v => v + 1);
      setLastUpdated(new Date().toISOString());
      
      return true;
    } catch (err) {
      console.error('[FeatureFlags] ❌ Error updating flag:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      return false;
    }
  }, []);
  
  // Emergency disable all features
  const emergencyDisableAll = useCallback(async (): Promise<boolean> => {
    try {
      setFlags(prevFlags => ({
        ...prevFlags,
        emergencyDisableAll: true,
        enableNewLayouts: false,
        enableGlassmorphicDesign: false,
        enableThemeSystem: false,
      }));
      
      setVersion(v => v + 1);
      setLastUpdated(new Date().toISOString());
      
      console.warn('[FeatureFlags] 🚨 EMERGENCY DISABLE ACTIVATED');
      return true;
    } catch (err) {
      console.error('[FeatureFlags] Emergency disable failed:', err);
      return false;
    }
  }, []);
  
  // Refresh (just reload from localStorage)
  const refresh = useCallback(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          setFlags(JSON.parse(stored));
          console.log('[FeatureFlags] Refreshed from localStorage');
        } catch (err) {
          console.error('[FeatureFlags] Refresh failed:', err);
        }
      }
    }
  }, []);
  
  return {
    flags,
    loading,
    error,
    version,
    lastUpdated,
    isEnabled,
    shouldUseNewLayout,
    updateFlag,
    emergencyDisableAll,
    refresh,
  };
}

// Export as default for easy replacement
export default useFeatureFlagsClient;
