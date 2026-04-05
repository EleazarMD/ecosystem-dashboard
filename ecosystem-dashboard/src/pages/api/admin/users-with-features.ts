/**
 * Admin API: Get Users with Feature Access
 * 
 * Returns all users with their subscription tiers and feature access
 * Only accessible by platform admins
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Pool } from 'pg';
import { 
  UserFeatureAccess,
  SubscriptionTier,
  getUserFeatures,
  getDefaultFeatureAccess,
} from '@/lib/subscription-tiers';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

interface UserWithAccess {
  id: string;
  email: string;
  name: string;
  platformRole: string;
  access: UserFeatureAccess;
  features: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = session.user as any;

  // Only platform admins can access this endpoint
  if (user.platformRole !== 'platform-admin') {
    return res.status(403).json({ error: 'Forbidden - Admin access required' });
  }

  try {
    // Fetch all users with their feature access
    const result = await pool.query(`
      SELECT 
        u.id,
        u.email,
        u.name,
        u.platform_role,
        ufa.subscription_tier,
        ufa.purchased_addons,
        ufa.admin_granted_features,
        ufa.admin_revoked_features,
        ufa.extra_child_slots,
        ufa.custom_limits
      FROM users u
      LEFT JOIN user_feature_access ufa ON u.id = ufa.user_id
      ORDER BY u.name ASC
    `);

    const users: UserWithAccess[] = result.rows.map(row => {
      const access: UserFeatureAccess = row.subscription_tier ? {
        userId: row.id,
        subscriptionTier: row.subscription_tier as SubscriptionTier,
        purchasedAddOns: row.purchased_addons || [],
        adminGrantedFeatures: row.admin_granted_features || [],
        adminRevokedFeatures: row.admin_revoked_features || [],
        extraChildSlots: row.extra_child_slots || 0,
        customLimits: row.custom_limits,
      } : getDefaultFeatureAccess(
        row.id, 
        row.platform_role === 'platform-admin' ? 'admin' : 'free'
      );

      return {
        id: row.id,
        email: row.email,
        name: row.name || row.email,
        platformRole: row.platform_role || 'user',
        access,
        features: getUserFeatures(access),
      };
    });

    return res.status(200).json({ users });
  } catch (error) {
    console.error('Error fetching users with features:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
}
