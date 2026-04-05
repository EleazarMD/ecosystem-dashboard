/**
 * Upgrade Subscription Tier API
 * 
 * POST: Upgrade user's subscription tier
 * Validates tier exists and is an upgrade from current tier
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Pool } from 'pg';
import { 
  SUBSCRIPTION_TIERS,
  SubscriptionTier,
} from '@/lib/subscription-tiers';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = session.user as any;
  const { tier } = req.body;

  if (!tier) {
    return res.status(400).json({ error: 'tier is required' });
  }

  // Validate tier exists
  if (!SUBSCRIPTION_TIERS[tier as SubscriptionTier]) {
    return res.status(400).json({ error: 'Invalid tier' });
  }

  // Admin tier cannot be purchased
  if (tier === 'admin') {
    return res.status(403).json({ error: 'Admin tier cannot be purchased' });
  }

  const targetTier = SUBSCRIPTION_TIERS[tier as SubscriptionTier];

  try {
    // Get user's current tier
    const accessResult = await pool.query(
      `SELECT subscription_tier FROM user_feature_access WHERE user_id = $1`,
      [user.id]
    );

    let currentTier: SubscriptionTier = 'free';
    if (accessResult.rows.length > 0) {
      currentTier = accessResult.rows[0].subscription_tier;
    }

    const currentTierConfig = SUBSCRIPTION_TIERS[currentTier];

    // Check if this is actually an upgrade
    if (targetTier.priority <= currentTierConfig.priority) {
      return res.status(400).json({ 
        error: 'Can only upgrade to a higher tier',
        currentTier,
        targetTier: tier,
      });
    }

    // TODO: Integrate with payment processor (Stripe, etc.)
    // For now, we'll just upgrade directly
    // In production, this would create a checkout session and
    // the tier would be upgraded after successful payment webhook

    // Update or create user's feature access
    if (accessResult.rows.length > 0) {
      await pool.query(
        `UPDATE user_feature_access 
         SET subscription_tier = $1,
             updated_at = NOW()
         WHERE user_id = $2`,
        [tier, user.id]
      );
    } else {
      await pool.query(
        `INSERT INTO user_feature_access (
          user_id, subscription_tier, purchased_addons,
          admin_granted_features, admin_revoked_features, extra_child_slots
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [user.id, tier, [], [], [], 0]
      );
    }

    return res.status(200).json({ 
      success: true,
      message: `Successfully upgraded to ${targetTier.name}`,
      previousTier: currentTier,
      newTier: tier,
      features: targetTier.features,
    });
  } catch (error) {
    console.error('Error upgrading tier:', error);
    return res.status(500).json({ error: 'Failed to upgrade tier' });
  }
}
