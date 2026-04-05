/**
 * Purchase Add-On API
 * 
 * POST: Purchase an add-on for the current user
 * Validates tier requirements and adds to purchased_addons array
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Pool } from 'pg';
import { 
  FEATURE_ADDONS,
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
  const { addOnId } = req.body;

  if (!addOnId) {
    return res.status(400).json({ error: 'addOnId is required' });
  }

  // Find the add-on
  const addOn = FEATURE_ADDONS.find(a => a.id === addOnId);
  if (!addOn) {
    return res.status(404).json({ error: 'Add-on not found' });
  }

  try {
    // Get user's current feature access
    const accessResult = await pool.query(
      `SELECT subscription_tier, purchased_addons 
       FROM user_feature_access 
       WHERE user_id = $1`,
      [user.id]
    );

    let currentTier: SubscriptionTier = 'free';
    let purchasedAddOns: string[] = [];

    if (accessResult.rows.length > 0) {
      currentTier = accessResult.rows[0].subscription_tier;
      purchasedAddOns = accessResult.rows[0].purchased_addons || [];
    }

    // Check if already purchased
    if (purchasedAddOns.includes(addOnId)) {
      return res.status(400).json({ error: 'Add-on already purchased' });
    }

    // Check tier requirement
    if (addOn.requiredTier) {
      const currentPriority = SUBSCRIPTION_TIERS[currentTier].priority;
      const requiredPriority = SUBSCRIPTION_TIERS[addOn.requiredTier].priority;
      
      if (currentPriority < requiredPriority) {
        return res.status(403).json({ 
          error: `Requires ${SUBSCRIPTION_TIERS[addOn.requiredTier].name} tier or higher`,
          requiredTier: addOn.requiredTier,
        });
      }
    }

    // TODO: Integrate with payment processor (Stripe, etc.)
    // For now, we'll just add the add-on directly
    // In production, this would create a checkout session and
    // the add-on would be added after successful payment webhook

    // Add the add-on to user's purchased list
    if (accessResult.rows.length > 0) {
      await pool.query(
        `UPDATE user_feature_access 
         SET purchased_addons = array_append(purchased_addons, $1),
             updated_at = NOW()
         WHERE user_id = $2`,
        [addOnId, user.id]
      );
    } else {
      // Create new record
      await pool.query(
        `INSERT INTO user_feature_access (
          user_id, subscription_tier, purchased_addons,
          admin_granted_features, admin_revoked_features, extra_child_slots
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [user.id, currentTier, [addOnId], [], [], 0]
      );
    }

    // Handle special add-ons like extra child slots
    if (addOnId === 'extra-child-slots') {
      await pool.query(
        `UPDATE user_feature_access 
         SET extra_child_slots = extra_child_slots + 5,
             updated_at = NOW()
         WHERE user_id = $1`,
        [user.id]
      );
    }

    return res.status(200).json({ 
      success: true,
      message: `Successfully purchased ${addOn.name}`,
      addOn: {
        id: addOn.id,
        name: addOn.name,
        features: addOn.features,
      },
    });
  } catch (error) {
    console.error('Error purchasing add-on:', error);
    return res.status(500).json({ error: 'Failed to purchase add-on' });
  }
}
