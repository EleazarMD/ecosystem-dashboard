/**
 * Feature Access Utilities
 * 
 * Server-side utilities to check user feature access based on subscription tier
 */

import { Pool } from 'pg';
import { 
  UserFeatureAccess, 
  hasFeatureAccess, 
  getUserLimits,
  getDefaultFeatureAccess,
  FeatureFlag 
} from './subscription-tiers';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

/**
 * Get user's feature access from database
 */
export async function getUserFeatureAccess(userId: string): Promise<UserFeatureAccess> {
  try {
    const result = await pool.query(`
      SELECT 
        subscription_tier,
        purchased_addons,
        admin_granted_features,
        admin_revoked_features,
        extra_child_slots,
        custom_limits
      FROM user_feature_access
      WHERE user_id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      // No subscription record, return default free tier
      return getDefaultFeatureAccess(userId, 'free');
    }

    const row = result.rows[0];
    return {
      userId,
      subscriptionTier: row.subscription_tier || 'free',
      purchasedAddOns: row.purchased_addons || [],
      adminGrantedFeatures: row.admin_granted_features || [],
      adminRevokedFeatures: row.admin_revoked_features || [],
      extraChildSlots: row.extra_child_slots || 0,
      customLimits: row.custom_limits,
    };
  } catch (error) {
    console.error('[Feature Access] Error fetching user subscription:', error);
    // On error, return free tier to be safe
    return getDefaultFeatureAccess(userId, 'free');
  }
}

/**
 * Check if user has access to a specific feature
 */
export async function checkFeatureAccess(userId: string, feature: FeatureFlag): Promise<boolean> {
  const access = await getUserFeatureAccess(userId);
  return hasFeatureAccess(access, feature);
}

/**
 * Check if user can create more child accounts
 */
export async function canCreateChildAccount(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  currentCount: number;
  maxAllowed: number;
}> {
  // Check feature access first
  const access = await getUserFeatureAccess(userId);
  const hasFamilyFeature = hasFeatureAccess(access, 'family-management');
  
  if (!hasFamilyFeature) {
    return {
      allowed: false,
      reason: 'Family management feature not available in your plan',
      currentCount: 0,
      maxAllowed: 0,
    };
  }

  // Check current child count
  const countResult = await pool.query(`
    SELECT COUNT(*) as count
    FROM users
    WHERE parent_user_id = $1 AND account_type = 'child'
  `, [userId]);

  const currentCount = parseInt(countResult.rows[0].count);
  const limits = getUserLimits(access);
  const maxAllowed = limits.maxChildAccounts;

  // -1 means unlimited
  if (maxAllowed === -1) {
    return {
      allowed: true,
      currentCount,
      maxAllowed: -1,
    };
  }

  if (currentCount >= maxAllowed) {
    return {
      allowed: false,
      reason: `You have reached your limit of ${maxAllowed} child accounts`,
      currentCount,
      maxAllowed,
    };
  }

  return {
    allowed: true,
    currentCount,
    maxAllowed,
  };
}

/**
 * Get upgrade recommendations for a user trying to access a feature
 */
export async function getUpgradeRecommendation(userId: string, feature: FeatureFlag): Promise<{
  needsUpgrade: boolean;
  currentTier: string;
  recommendedTier?: string;
  recommendedAddOn?: string;
  price?: number;
}> {
  const access = await getUserFeatureAccess(userId);
  const hasAccess = hasFeatureAccess(access, feature);

  if (hasAccess) {
    return {
      needsUpgrade: false,
      currentTier: access.subscriptionTier,
    };
  }

  // Check if feature is available via add-on
  if (feature === 'family-management' || feature === 'child-accounts') {
    // Check if user can buy family add-on
    const tierPriority = access.subscriptionTier === 'free' ? 0 : 1;
    if (tierPriority >= 1) { // basic or higher
      return {
        needsUpgrade: true,
        currentTier: access.subscriptionTier,
        recommendedAddOn: 'family-addon',
        price: 14.99,
      };
    }
    // Need to upgrade to family tier
    return {
      needsUpgrade: true,
      currentTier: access.subscriptionTier,
      recommendedTier: 'family',
      price: 34.99,
    };
  }

  return {
    needsUpgrade: true,
    currentTier: access.subscriptionTier,
  };
}
