/**
 * Get Current User API
 * 
 * Returns the currently authenticated user's information
 * Used by components to check auth status and roles
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Return user info with role
    return res.status(200).json({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
      role: session.user.platformRole || 'user',
      accountType: session.user.accountType || 'standard',
      subscriptionTier: session.user.subscriptionTier || 'free',
      isAdmin: session.user.platformRole === 'platform-admin',
      tenants: session.user.tenants || [],
    });
  } catch (error) {
    console.error('[API /auth/me] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
