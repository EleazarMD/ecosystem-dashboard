/**
 * Feature Flags Hook
 * 
 * Usage:
 *   const { flags, isEnabled, shouldUsNewLayout, loading } = useFeatureFlags();
 *   
 *   if (shouldUseNewLayout('ai-research')) {
 *     return <NewAIResearchLayout />;
 *   } else {
 *     return <LegacyLayout />;
 *   }
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import type { FeatureFlags, PageName } from '@/types/featureFlags';
import { DEFAULT_FEATURE_FLAGS, isFeatureEnabledForUser, shouldUseNewLayout as shouldUseNewLayoutHelper } from '@/types/featureFlags';

interface UseFeatureFlagsResult {
  flags: FeatureFlags;
  loading: boolean;
  error: Error | null;
  version: number;
  lastUpdated: string | null;
  
  // Helper functions
  isEnabled: (featurePath: string) => boolean;
  shouldUseNewLayout: (pageName: PageName) => boolean;
  
  // Admin functions
  updateFlag: (flagPath: string, value: boolean | object, reason?: string) => Promise<boolean>;
  emergencyDisableAll: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

// In-memory cache to avoid excessive API calls
let cachedFlags: FeatureFlags | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5000; // 5 seconds

export function useFeatureFlags(userId?: string | null): UseFeatureFlagsResult {
  const [flags, setFlags] = useState<FeatureFlags>(cachedFlags || DEFAULT_FEATURE_FLAGS);
  const [loading, setLoading] = useState(!cachedFlags);
  const [error, setError] = useState<Error | null>(null);
  const [version, setVersion] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  
  // Fetch flags from localStorage (client-side only)
  const fetchFlags = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load from localStorage (client-side only)
      const stored = localStorage.getItem('feature-flags');
      const data = stored ? JSON.parse(stored) : null;
      
      if (data) {
        cachedFlags = data;
        cacheTimestamp = Date.now();
        setFlags(data);
        setVersion(1); // version is not available in client-side only mode
        setLastUpdated(null); // lastUpdated is not available in client-side only mode
        setLastUpdated(data.lastUpdated);
        setError(null);
      } else {
        throw new Error(data.error || 'Failed to fetch feature flags');
      }
    } catch (err) {
      console.warn('[useFeatureFlags] Using default flags due to error:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      // Keep using cached/default flags on error
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Initial load
  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);
  
  // Poll for updates every 60 seconds (reduced frequency since API may not exist)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchFlags();
    }, 60000); // 60 seconds
    
    return () => clearInterval(interval);
  }, [fetchFlags]);
  
  // Helper: Check if feature is enabled
  const isEnabled = useCallback((featurePath: string): boolean => {
    return isFeatureEnabledForUser(flags, userId || null, featurePath);
  }, [flags, userId]);
  
  // Helper: Check if page should use new layout
  const shouldUseNewLayout = useCallback((pageName: PageName): boolean => {
    return shouldUseNewLayoutHelper(flags, userId || null, pageName);
  }, [flags, userId]);
  
  // Admin: Update feature flag
  const updateFlag = useCallback(async (
    flagPath: string,
    value: boolean | object,
    reason?: string
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/feature-flags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId || 'admin',
        },
        body: JSON.stringify({
          flagPath,
          value,
          userId,
          reason,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update local state immediately
        cachedFlags = data.flags;
        cacheTimestamp = Date.now();
        setFlags(data.flags);
        setVersion(data.version);
        setLastUpdated(data.lastUpdated);
        return true;
      }
      
      console.error('[useFeatureFlags] Failed to update flag:', data.error);
      return false;
    } catch (err) {
      console.error('[useFeatureFlags] Error updating flag:', err);
      return false;
    }
  }, [userId]);
  
  // Admin: Emergency disable all
  const emergencyDisableAll = useCallback(async (): Promise<boolean> => {
    try {
      console.warn('[useFeatureFlags] EMERGENCY DISABLE TRIGGERED');
      
      const response = await fetch('/api/feature-flags/emergency-disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId || 'emergency',
        },
        body: JSON.stringify({
          reason: 'User-triggered emergency disable',
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update local state immediately
        cachedFlags = data.flags;
        cacheTimestamp = Date.now();
        setFlags(data.flags);
        setVersion(data.version);
        setLastUpdated(data.lastUpdated);
        
        // Show alert to user
        alert('⚠️ All new features have been disabled. Dashboard reverted to legacy mode.');
        
        return true;
      }
      
      console.error('[useFeatureFlags] Failed to emergency disable:', data.error);
      return false;
    } catch (err) {
      console.error('[useFeatureFlags] Error in emergency disable:', err);
      return false;
    }
  }, [userId]);
  
  // Refresh flags manually
  const refresh = useCallback(async () => {
    await fetchFlags(true);
  }, [fetchFlags]);
  
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

// Hook for checking a single feature (optimized)
export function useFeatureFlag(featurePath: string, userId?: string | null): boolean {
  const { flags } = useFeatureFlags(userId);
  return useMemo(
    () => isFeatureEnabledForUser(flags, userId || null, featurePath),
    [flags, userId, featurePath]
  );
}

// Hook for checking if page should use new layout (optimized)
export function useNewLayout(pageName: PageName, userId?: string | null): boolean {
  const { flags } = useFeatureFlags(userId);
  return useMemo(
    () => shouldUseNewLayoutHelper(flags, userId || null, pageName),
    [flags, userId, pageName]
  );
}
