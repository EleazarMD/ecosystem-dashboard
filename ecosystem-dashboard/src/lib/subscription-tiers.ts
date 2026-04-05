/**
 * Subscription Tiers & Feature Access System
 * 
 * Defines subscription levels, feature flags, and navigation profiles.
 * Users can have a base subscription tier + additional purchased features.
 * Admins can grant/revoke features per user.
 */

// ═══════════════════════════════════════════════════════════════
// FEATURE FLAGS - All available features in the platform
// ═══════════════════════════════════════════════════════════════

export type FeatureFlag = 
  // Core Productivity
  | 'workspace'
  | 'email'
  | 'calendar'
  | 'chat'
  | 'personal-context'
  // Creative Tools
  | 'image-studio'
  | 'podcast-studio'
  // Learning
  | 'books'
  // AI & Research
  | 'ai-research'
  | 'clinical-evidence'
  | 'ml-training'
  | 'agentic-workflows'
  | 'liam'
  // Knowledge & Data
  | 'knowledge-base'
  | 'ide-memory'
  // Infrastructure (Admin/Power users)
  | 'ai-gateway'
  | 'ai-inferencing'
  | 'infrastructure'
  | 'monitoring'
  | 'agent-registry'
  // Admin
  | 'admin-panel'
  | 'user-management'
  | 'platform-config'
  // Family
  | 'family-management'
  | 'child-accounts'
  // Settings
  | 'settings'
  | 'system-backup'
  // Special
  | 'approvals';

// ═══════════════════════════════════════════════════════════════
// SUBSCRIPTION TIERS
// ═══════════════════════════════════════════════════════════════

export type SubscriptionTier = 
  | 'free'
  | 'basic'
  | 'pro'
  | 'family'
  | 'enterprise'
  | 'admin';

export interface SubscriptionTierConfig {
  id: SubscriptionTier;
  name: string;
  description: string;
  price: number; // Monthly price in USD, 0 for free
  features: FeatureFlag[];
  maxChildAccounts: number;
  maxStorageGB: number;
  aiRequestsPerMonth: number;
  imageGenerationsPerMonth: number;
  priority: number; // Higher = more access (for upgrade comparisons)
}

export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, SubscriptionTierConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Basic access to core features',
    price: 0,
    features: [
      'workspace',
      'chat',
      'calendar',
      'personal-context',
      'settings',
    ],
    maxChildAccounts: 0,
    maxStorageGB: 5,
    aiRequestsPerMonth: 100,
    imageGenerationsPerMonth: 10,
    priority: 0,
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    description: 'Essential productivity tools',
    price: 9.99,
    features: [
      'workspace',
      'email',
      'calendar',
      'chat',
      'personal-context',
      'image-studio',
      'settings',
      'approvals',
    ],
    maxChildAccounts: 0,
    maxStorageGB: 25,
    aiRequestsPerMonth: 500,
    imageGenerationsPerMonth: 50,
    priority: 1,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Full productivity suite for professionals',
    price: 24.99,
    features: [
      'workspace',
      'email',
      'calendar',
      'chat',
      'personal-context',
      'image-studio',
      'ai-research',
      'knowledge-base',
      'agentic-workflows',
      'liam',
      'settings',
      'approvals',
    ],
    maxChildAccounts: 0,
    maxStorageGB: 100,
    aiRequestsPerMonth: 2000,
    imageGenerationsPerMonth: 200,
    priority: 2,
  },
  family: {
    id: 'family',
    name: 'Family',
    description: 'Essential productivity tools plus family management',
    price: 34.99,
    features: [
      'workspace',
      'email',
      'calendar',
      'chat',
      'personal-context',
      'image-studio',
      'books',
      'family-management',
      'child-accounts',
      'settings',
      'approvals',
    ],
    maxChildAccounts: 5,
    maxStorageGB: 250,
    aiRequestsPerMonth: 5000,
    imageGenerationsPerMonth: 500,
    priority: 3,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Full platform access with ML training',
    price: 99.99,
    features: [
      'workspace',
      'email',
      'calendar',
      'chat',
      'personal-context',
      'image-studio',
      'podcast-studio',
      'ai-research',
      'clinical-evidence',
      'ml-training',
      'agentic-workflows',
      'liam',
      'knowledge-base',
      'ide-memory',
      'ai-gateway',
      'ai-inferencing',
      'infrastructure',
      'monitoring',
      'agent-registry',
      'family-management',
      'child-accounts',
      'settings',
      'system-backup',
      'approvals',
    ],
    maxChildAccounts: 10,
    maxStorageGB: 1000,
    aiRequestsPerMonth: -1, // Unlimited
    imageGenerationsPerMonth: -1, // Unlimited
    priority: 4,
  },
  admin: {
    id: 'admin',
    name: 'Platform Admin',
    description: 'Full platform access including admin tools',
    price: 0, // Internal only
    features: [
      'workspace',
      'email',
      'calendar',
      'chat',
      'personal-context',
      'image-studio',
      'podcast-studio',
      'ai-research',
      'clinical-evidence',
      'ml-training',
      'agentic-workflows',
      'liam',
      'knowledge-base',
      'ide-memory',
      'ai-gateway',
      'ai-inferencing',
      'infrastructure',
      'monitoring',
      'agent-registry',
      'admin-panel',
      'user-management',
      'platform-config',
      'family-management',
      'child-accounts',
      'settings',
      'system-backup',
      'approvals',
    ],
    maxChildAccounts: -1, // Unlimited
    maxStorageGB: -1, // Unlimited
    aiRequestsPerMonth: -1,
    imageGenerationsPerMonth: -1,
    priority: 99,
  },
};

// ═══════════════════════════════════════════════════════════════
// PURCHASABLE ADD-ONS
// ═══════════════════════════════════════════════════════════════

export interface FeatureAddOn {
  id: string;
  name: string;
  description: string;
  features: FeatureFlag[];
  price: number; // Monthly price
  oneTime?: boolean; // If true, one-time purchase
  requiredTier?: SubscriptionTier; // Minimum tier required to purchase
}

export const FEATURE_ADDONS: FeatureAddOn[] = [
  {
    id: 'podcast-addon',
    name: 'Podcast Studio',
    description: 'Create AI-powered podcasts',
    features: ['podcast-studio'],
    price: 9.99,
    requiredTier: 'basic',
  },
  {
    id: 'research-addon',
    name: 'AI Research Suite',
    description: 'Deep research and clinical evidence tools',
    features: ['ai-research', 'clinical-evidence'],
    price: 14.99,
    requiredTier: 'basic',
  },
  {
    id: 'ml-addon',
    name: 'ML Training',
    description: 'Train and deploy custom ML models',
    features: ['ml-training', 'agentic-workflows'],
    price: 29.99,
    requiredTier: 'pro',
  },
  {
    id: 'infrastructure-addon',
    name: 'Infrastructure Access',
    description: 'Access to infrastructure monitoring and management',
    features: ['ai-gateway', 'ai-inferencing', 'infrastructure', 'monitoring'],
    price: 19.99,
    requiredTier: 'pro',
  },
  {
    id: 'family-addon',
    name: 'Family Pack',
    description: 'Add family management and up to 3 child accounts',
    features: ['family-management', 'child-accounts'],
    price: 14.99,
    requiredTier: 'basic',
  },
  {
    id: 'extra-child-slots',
    name: 'Extra Child Slots (5)',
    description: 'Add 5 additional child account slots',
    features: [], // No new features, just increases limit
    price: 4.99,
    requiredTier: 'family',
  },
];

// ═══════════════════════════════════════════════════════════════
// USER FEATURE ACCESS
// ═══════════════════════════════════════════════════════════════

export interface UserFeatureAccess {
  userId: string;
  subscriptionTier: SubscriptionTier;
  purchasedAddOns: string[]; // Add-on IDs
  adminGrantedFeatures: FeatureFlag[]; // Features granted by admin
  adminRevokedFeatures: FeatureFlag[]; // Features revoked by admin (overrides tier)
  extraChildSlots: number; // Additional child slots beyond tier limit
  customLimits?: {
    storageGB?: number;
    aiRequestsPerMonth?: number;
    imageGenerationsPerMonth?: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// FEATURE ACCESS HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all features a user has access to based on their subscription,
 * purchased add-ons, and admin overrides.
 */
export function getUserFeatures(access: UserFeatureAccess): FeatureFlag[] {
  const tierConfig = SUBSCRIPTION_TIERS[access.subscriptionTier];
  const features = new Set<FeatureFlag>(tierConfig.features);

  // Add features from purchased add-ons
  for (const addOnId of access.purchasedAddOns) {
    const addOn = FEATURE_ADDONS.find(a => a.id === addOnId);
    if (addOn) {
      addOn.features.forEach(f => features.add(f));
    }
  }

  // Add admin-granted features
  access.adminGrantedFeatures.forEach(f => features.add(f));

  // Remove admin-revoked features
  access.adminRevokedFeatures.forEach(f => features.delete(f));

  return Array.from(features);
}

/**
 * Check if a user has access to a specific feature
 */
export function hasFeatureAccess(access: UserFeatureAccess, feature: FeatureFlag): boolean {
  // Check if explicitly revoked by admin
  if (access.adminRevokedFeatures.includes(feature)) {
    return false;
  }

  // Check if explicitly granted by admin
  if (access.adminGrantedFeatures.includes(feature)) {
    return true;
  }

  // Check tier features
  const tierConfig = SUBSCRIPTION_TIERS[access.subscriptionTier];
  if (tierConfig.features.includes(feature)) {
    return true;
  }

  // Check purchased add-ons
  for (const addOnId of access.purchasedAddOns) {
    const addOn = FEATURE_ADDONS.find(a => a.id === addOnId);
    if (addOn?.features.includes(feature)) {
      return true;
    }
  }

  return false;
}

/**
 * Get user's limits (storage, AI requests, etc.)
 */
export function getUserLimits(access: UserFeatureAccess) {
  const tierConfig = SUBSCRIPTION_TIERS[access.subscriptionTier];
  
  // Calculate child slots
  let maxChildAccounts = tierConfig.maxChildAccounts;
  if (access.purchasedAddOns.includes('family-addon') && maxChildAccounts === 0) {
    maxChildAccounts = 3; // Family addon gives 3 slots
  }
  maxChildAccounts += access.extraChildSlots;

  return {
    maxStorageGB: access.customLimits?.storageGB ?? tierConfig.maxStorageGB,
    aiRequestsPerMonth: access.customLimits?.aiRequestsPerMonth ?? tierConfig.aiRequestsPerMonth,
    imageGenerationsPerMonth: access.customLimits?.imageGenerationsPerMonth ?? tierConfig.imageGenerationsPerMonth,
    maxChildAccounts,
  };
}

/**
 * Get available add-ons for a user based on their tier
 */
export function getAvailableAddOns(access: UserFeatureAccess): FeatureAddOn[] {
  const tierPriority = SUBSCRIPTION_TIERS[access.subscriptionTier].priority;
  
  return FEATURE_ADDONS.filter(addOn => {
    // Already purchased
    if (access.purchasedAddOns.includes(addOn.id)) {
      return false;
    }
    
    // Check tier requirement
    if (addOn.requiredTier) {
      const requiredPriority = SUBSCRIPTION_TIERS[addOn.requiredTier].priority;
      if (tierPriority < requiredPriority) {
        return false;
      }
    }
    
    return true;
  });
}

/**
 * Default feature access for new users
 */
export function getDefaultFeatureAccess(userId: string, tier: SubscriptionTier = 'free'): UserFeatureAccess {
  return {
    userId,
    subscriptionTier: tier,
    purchasedAddOns: [],
    adminGrantedFeatures: [],
    adminRevokedFeatures: [],
    extraChildSlots: 0,
  };
}
