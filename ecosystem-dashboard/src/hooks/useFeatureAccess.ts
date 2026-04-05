/**
 * useFeatureAccess Hook
 * 
 * Fetches and manages user's feature access based on subscription tier,
 * purchased add-ons, and admin overrides.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import {
  UserFeatureAccess,
  FeatureFlag,
  SubscriptionTier,
  SUBSCRIPTION_TIERS,
  getUserFeatures,
  hasFeatureAccess,
  getUserLimits,
  getAvailableAddOns,
  getDefaultFeatureAccess,
  FEATURE_ADDONS,
} from '@/lib/subscription-tiers';

interface UseFeatureAccessResult {
  // Access data
  access: UserFeatureAccess | null;
  features: FeatureFlag[];
  limits: ReturnType<typeof getUserLimits> | null;
  
  // Helpers
  hasFeature: (feature: FeatureFlag) => boolean;
  availableAddOns: typeof FEATURE_ADDONS;
  tierConfig: typeof SUBSCRIPTION_TIERS[SubscriptionTier] | null;
  
  // State
  isLoading: boolean;
  error: string | null;
  
  // Actions
  refreshAccess: () => Promise<void>;
  purchaseAddOn: (addOnId: string) => Promise<boolean>;
  upgradeTier: (tier: SubscriptionTier) => Promise<boolean>;
}

export function useFeatureAccess(): UseFeatureAccessResult {
  const { data: session, status } = useSession();
  const [access, setAccess] = useState<UserFeatureAccess | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's feature access from API
  const fetchAccess = useCallback(async () => {
    if (status === 'loading') return;
    
    if (!session?.user) {
      // Not logged in - use free tier defaults
      setAccess(getDefaultFeatureAccess('anonymous', 'free'));
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/user/feature-access');
      
      if (!response.ok) {
        // If API doesn't exist yet, use session data to construct access
        const user = session.user as any;
        const tier = user.subscriptionTier || 'free';
        const isPlatformAdmin = user.platformRole === 'platform-admin';
        
        setAccess({
          userId: user.id || 'unknown',
          subscriptionTier: isPlatformAdmin ? 'admin' : tier,
          purchasedAddOns: user.purchasedAddOns || [],
          adminGrantedFeatures: user.grantedFeatures || [],
          adminRevokedFeatures: user.revokedFeatures || [],
          extraChildSlots: user.extraChildSlots || 0,
          customLimits: user.customLimits,
        });
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      setAccess(data.access);
    } catch (err) {
      console.error('Failed to fetch feature access:', err);
      setError('Failed to load feature access');
      
      // Fallback to session-based access
      const user = session.user as any;
      setAccess(getDefaultFeatureAccess(user?.id || 'unknown', 'free'));
    } finally {
      setIsLoading(false);
    }
  }, [session, status]);

  useEffect(() => {
    fetchAccess();
  }, [fetchAccess]);

  // Computed values
  const features = useMemo(() => {
    if (!access) return [];
    return getUserFeatures(access);
  }, [access]);

  const limits = useMemo(() => {
    if (!access) return null;
    return getUserLimits(access);
  }, [access]);

  const tierConfig = useMemo(() => {
    if (!access) return null;
    return SUBSCRIPTION_TIERS[access.subscriptionTier];
  }, [access]);

  const availableAddOns = useMemo(() => {
    if (!access) return [];
    return getAvailableAddOns(access);
  }, [access]);

  // Helper to check feature access
  const hasFeature = useCallback((feature: FeatureFlag): boolean => {
    if (!access) return false;
    return hasFeatureAccess(access, feature);
  }, [access]);

  // Purchase an add-on
  const purchaseAddOn = useCallback(async (addOnId: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/user/purchase-addon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addOnId }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to purchase add-on');
        return false;
      }

      // Refresh access after purchase
      await fetchAccess();
      return true;
    } catch (err) {
      console.error('Failed to purchase add-on:', err);
      setError('Failed to purchase add-on');
      return false;
    }
  }, [fetchAccess]);

  // Upgrade subscription tier
  const upgradeTier = useCallback(async (tier: SubscriptionTier): Promise<boolean> => {
    try {
      const response = await fetch('/api/user/upgrade-tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to upgrade tier');
        return false;
      }

      // Refresh access after upgrade
      await fetchAccess();
      return true;
    } catch (err) {
      console.error('Failed to upgrade tier:', err);
      setError('Failed to upgrade tier');
      return false;
    }
  }, [fetchAccess]);

  return {
    access,
    features,
    limits,
    hasFeature,
    availableAddOns,
    tierConfig,
    isLoading,
    error,
    refreshAccess: fetchAccess,
    purchaseAddOn,
    upgradeTier,
  };
}

export default useFeatureAccess;
