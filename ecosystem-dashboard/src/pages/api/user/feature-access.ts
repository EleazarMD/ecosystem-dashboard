/**
 * User Feature Access API
 * 
 * GET: Fetch user's current feature access (subscription + add-ons + admin overrides)
 * PUT: Admin endpoint to update user's feature access
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Pool } from 'pg';
import { 
  UserFeatureAccess, 
  SubscriptionTier,
  FeatureFlag,
  getDefaultFeatureAccess,
  getUserFeatures,
  getUserLimits,
} from '@/lib/subscription-tiers';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

interface FeatureAccessResponse {
  access: UserFeatureAccess;
  features: FeatureFlag[];
  limits: ReturnType<typeof getUserLimits>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = session.user as any;

  if (req.method === 'GET') {
    return handleGet(req, res, user);
  } else if (req.method === 'PUT') {
    return handlePut(req, res, user);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  user: any
) {
  try {
    // Try to fetch from database
    const result = await pool.query(
      `SELECT 
        subscription_tier,
        purchased_addons,
        admin_granted_features,
        admin_revoked_features,
        extra_child_slots,
        custom_limits
      FROM user_feature_access
      WHERE user_id = $1`,
      [user.id]
    );

    let access: UserFeatureAccess;

    if (result.rows.length > 0) {
      const row = result.rows[0];
      access = {
        userId: user.id,
        subscriptionTier: row.subscription_tier as SubscriptionTier,
        purchasedAddOns: row.purchased_addons || [],
        adminGrantedFeatures: row.admin_granted_features || [],
        adminRevokedFeatures: row.admin_revoked_features || [],
        extraChildSlots: row.extra_child_slots || 0,
        customLimits: row.custom_limits,
      };
    } else {
      // No record - create default based on user role
      const isPlatformAdmin = user.platformRole === 'platform-admin';
      const defaultTier: SubscriptionTier = isPlatformAdmin ? 'admin' : 'free';
      access = getDefaultFeatureAccess(user.id, defaultTier);

      // Insert default record
      await pool.query(
        `INSERT INTO user_feature_access (
          user_id, subscription_tier, purchased_addons, 
          admin_granted_features, admin_revoked_features, extra_child_slots
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id) DO NOTHING`,
        [user.id, defaultTier, [], [], [], 0]
      );
    }

    const response: FeatureAccessResponse = {
      access,
      features: getUserFeatures(access),
      limits: getUserLimits(access),
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching feature access:', error);
    
    // Fallback to session-based access
    const isPlatformAdmin = user.platformRole === 'platform-admin';
    const access = getDefaultFeatureAccess(
      user.id, 
      isPlatformAdmin ? 'admin' : (user.subscriptionTier || 'free')
    );

    return res.status(200).json({
      access,
      features: getUserFeatures(access),
      limits: getUserLimits(access),
    });
  }
}

async function handlePut(
  req: NextApiRequest,
  res: NextApiResponse,
  user: any
) {
  // Only platform admins can update feature access
  if (user.platformRole !== 'platform-admin') {
    return res.status(403).json({ error: 'Forbidden - Admin access required' });
  }

  const { 
    targetUserId,
    subscriptionTier,
    grantFeatures,
    revokeFeatures,
    extraChildSlots,
    customLimits,
  } = req.body;

  if (!targetUserId) {
    return res.status(400).json({ error: 'targetUserId is required' });
  }

  try {
    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (subscriptionTier) {
      updates.push(`subscription_tier = $${paramIndex++}`);
      values.push(subscriptionTier);
    }

    if (grantFeatures && Array.isArray(grantFeatures)) {
      updates.push(`admin_granted_features = array_cat(
        COALESCE(admin_granted_features, ARRAY[]::text[]),
        $${paramIndex++}::text[]
      )`);
      values.push(grantFeatures);
    }

    if (revokeFeatures && Array.isArray(revokeFeatures)) {
      updates.push(`admin_revoked_features = array_cat(
        COALESCE(admin_revoked_features, ARRAY[]::text[]),
        $${paramIndex++}::text[]
      )`);
      values.push(revokeFeatures);
    }

    if (typeof extraChildSlots === 'number') {
      updates.push(`extra_child_slots = $${paramIndex++}`);
      values.push(extraChildSlots);
    }

    if (customLimits) {
      updates.push(`custom_limits = $${paramIndex++}`);
      values.push(JSON.stringify(customLimits));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(targetUserId);

    await pool.query(
      `UPDATE user_feature_access 
       SET ${updates.join(', ')}
       WHERE user_id = $${paramIndex}`,
      values
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating feature access:', error);
    return res.status(500).json({ error: 'Failed to update feature access' });
  }
}
