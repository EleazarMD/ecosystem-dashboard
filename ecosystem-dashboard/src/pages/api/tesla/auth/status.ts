/**
 * Tesla Connection Status Endpoint
 * 
 * GET /api/tesla/auth/status
 * Returns whether user has valid Tesla tokens
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = 'default'; // TODO: Get from session

  try {
    const result = await pool.query(`
      SELECT expires_at, scopes, updated_at
      FROM tesla_tokens
      WHERE user_id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(200).json({
        connected: false,
        message: 'No Tesla account connected',
      });
    }

    const token = result.rows[0];
    const isExpired = new Date(token.expires_at) < new Date();

    return res.status(200).json({
      connected: !isExpired,
      expired: isExpired,
      expiresAt: token.expires_at,
      scopes: token.scopes?.split(' ') || [],
      lastUpdated: token.updated_at,
    });

  } catch (error: any) {
    console.error('[Tesla Status] Error:', error.message);
    return res.status(500).json({ error: 'Failed to check status' });
  }
}
