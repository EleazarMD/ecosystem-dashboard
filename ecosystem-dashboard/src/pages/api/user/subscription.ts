/**
 * User Subscription API
 * 
 * GET: Get current user's subscription tier, features, and limits
 * Compatible with existing user_feature_access table
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getUserFeatureAccess } from '@/lib/feature-access';
import { getUserFeatures, getUserLimits, hasFeatureAccess } from '@/lib/subscription-tiers';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = session.user as any;
  console.log('[Subscription API] Session user:', { id: user.id, email: user.email, subscriptionTier: user.subscriptionTier });

  try {
    // Get user's role directly from database (session may be cached)
    let dbUser: any = null;
    let isAdmin = false;
    
    try {
      const userResult = await pool.query(
        'SELECT role, platform_role, account_type FROM users WHERE id = $1',
        [user.id]
      );
      dbUser = userResult.rows[0];
      console.log('[Subscription API] DB user:', dbUser);
      
      // Check if user is admin via any of the role fields
      isAdmin = dbUser?.role === 'admin' || 
                dbUser?.role === 'administrator' ||
                dbUser?.platform_role === 'platform-admin' ||
                dbUser?.account_type === 'admin';
    } catch (dbError) {
      console.error('[Subscription API] Database error:', dbError);
      // Continue with session data if DB fails
    }

    // Get user's feature access from existing system
    const access = await getUserFeatureAccess(user.id);
    const features = getUserFeatures(access);
    const limits = getUserLimits(access);

    // Check subscription tier for image editing access
    const tier = access.subscriptionTier || 'free';
    const hasImageEditing = ['pro', 'premium', 'enterprise', 'admin'].includes(tier) || isAdmin;
    console.log('[Subscription API] tier:', tier, 'isAdmin:', isAdmin, 'hasImageEditing:', hasImageEditing);

    return res.status(200).json({
      tier,
      role: dbUser?.role || user.role || user.userType || 'user',
      platformRole: dbUser?.platform_role,
      accountType: dbUser?.account_type,
      isAdmin,
      features,
      limits,
      purchasedAddOns: access.purchasedAddOns || [],
      // Convenience flags
      hasFamilyManagement: hasFeatureAccess(access, 'family-management'),
      hasChildAccounts: hasFeatureAccess(access, 'child-accounts'),
      hasImageEditing,
    });
  } catch (error) {
    console.error('[Subscription API] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch subscription info', details: String(error) });
  }
}
