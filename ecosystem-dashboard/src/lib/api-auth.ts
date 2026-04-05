/**
 * Shared API authentication for workspace endpoints
 * Supports: NextAuth session (dashboard), X-API-Key (Nova, OpenClaw, iOS)
 * 
 * Usage in API handlers:
 *   const userId = await authenticateRequest(req, res);
 *   if (!userId) return; // 401 already sent
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { getMobileOrSessionUserId } from '@/lib/mobile-auth';

/**
 * Authenticate a request via session or X-API-Key.
 * Returns userId on success, null on failure (401 already sent).
 */
export async function authenticateRequest(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<string | null> {
  const session = await getServerSession(req, res, authOptions);
  const userId = getMobileOrSessionUserId(session?.user?.id, req);

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized — provide session cookie or X-API-Key header' });
    return null;
  }

  return userId;
}

/**
 * Optional auth — returns userId if available, 'anonymous' otherwise.
 * Use for endpoints that should work without auth (e.g. shared page view).
 */
export async function optionalAuth(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<string> {
  const session = await getServerSession(req, res, authOptions);
  const userId = getMobileOrSessionUserId(session?.user?.id, req);
  return userId || 'anonymous';
}
