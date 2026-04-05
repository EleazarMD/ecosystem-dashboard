/**
 * Debug endpoint to view current session data
 * TEMPORARY - For debugging session issues
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ error: 'No session found' });
    }

    // Return session data for debugging
    return res.status(200).json({
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        platformRole: session.user.platformRole,
        accountType: session.user.accountType,
        isParent: session.user.isParent,
        subscriptionTier: session.user.subscriptionTier,
        purchasedAddOns: session.user.purchasedAddOns,
        grantedFeatures: session.user.grantedFeatures,
        revokedFeatures: session.user.revokedFeatures,
        extraChildSlots: session.user.extraChildSlots,
      },
      hasSubscriptionData: !!(session.user.subscriptionTier),
    });
  } catch (error) {
    console.error('[Debug] Error fetching session:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
