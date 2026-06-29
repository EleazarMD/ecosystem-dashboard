/**
 * Token Revocation API (P1.4)
 * ============================================================================
 * POST /api/auth/revoke
 *   Body: { token?: string, clientId?: string }
 *
 * Revokes an access token by inserting its jti into the revoked_tokens
 * deny-list. Can also revoke all tokens for a client_id.
 *
 * Auth: The caller must be authenticated (NextAuth session or JWT).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from './[...nextauth]';
import { Pool } from 'pg';
import { verifyToken, decodeToken } from '../../../lib/platform/unified-token';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-development-secret-change-in-production';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth: NextAuth session or JWT
  const session = await getServerSession(req, res, authOptions);
  let userId: string | null = session?.user?.id ?? null;

  if (!userId) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const payload = verifyToken(token, JWT_SECRET);
        userId = payload.userId;
      } catch {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }
  }

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { token: tokenToRevoke, clientId: clientIdToRevoke } = req.body;

  let revokedCount = 0;

  try {
    // Revoke specific token by jti
    if (tokenToRevoke) {
      const decoded = decodeToken(tokenToRevoke);
      if (decoded?.jti) {
        await pool.query(
          `INSERT INTO revoked_tokens (jti, user_id, client_id, exp, reason)
           VALUES ($1, $2, $3, $4, 'user_revoked')
           ON CONFLICT (jti) DO NOTHING`,
          [decoded.jti, userId, decoded.clientId || null,
           new Date(decoded.exp * 1000).toISOString()]
        );
        revokedCount++;
      }
    }

    // Revoke all tokens for a client_id
    if (clientIdToRevoke) {
      await pool.query(
        `INSERT INTO revoked_tokens (jti, user_id, client_id, exp, reason)
         VALUES ($1, $2, $3, now() + interval '1 hour', 'client_revoked')
         ON CONFLICT (jti) DO NOTHING`,
        [`client:${clientIdToRevoke}`, userId, clientIdToRevoke]
      );
      revokedCount++;
    }
  } catch (err: any) {
    return res.status(500).json({ error: 'Revocation failed', detail: err.message });
  }

  return res.status(200).json({ success: true, revoked: revokedCount });
}
