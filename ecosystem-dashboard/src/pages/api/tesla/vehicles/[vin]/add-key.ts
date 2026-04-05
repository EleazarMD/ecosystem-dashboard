/**
 * Tesla Virtual Key Pairing
 * 
 * POST /api/tesla/vehicles/[vin]/add-key
 * Pairs the public key with a vehicle to enable commands
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { refreshTeslaToken } from '../../auth/refresh';

const TESLA_API_BASE = 'https://fleet-api.prd.na.vn.cloud.tesla.com/api/1';

async function getValidToken(userId: string): Promise<string | null> {
  const result = await pool.query(`
    SELECT access_token, refresh_token, expires_at
    FROM tesla_tokens
    WHERE user_id = $1
  `, [userId]);

  if (result.rows.length === 0) return null;
  
  const token = result.rows[0];
  const isExpired = new Date(token.expires_at) < new Date();

  if (isExpired && token.refresh_token) {
    const newToken = await refreshTeslaToken(userId);
    return newToken;
  }

  return isExpired ? null : token.access_token;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { vin } = req.query;
  const { role = 'owner' } = req.body;

  if (!vin || typeof vin !== 'string') {
    return res.status(400).json({ error: 'VIN required' });
  }

  const userId = 'default';

  try {
    const accessToken = await getValidToken(userId);
    if (!accessToken) {
      return res.status(401).json({ error: 'Not connected' });
    }

    // Get the public key from database
    const keyResult = await pool.query(`
      SELECT public_key FROM tesla_keys WHERE user_id = $1
    `, [userId]);

    if (keyResult.rows.length === 0) {
      return res.status(400).json({ error: 'No public key found. Run /api/tesla/auth/setup-keys first.' });
    }

    const publicKey = keyResult.rows[0].public_key;

    // Add virtual key to vehicle
    const response = await fetch(`${TESLA_API_BASE}/vehicles/${vin}/add_key`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        public_key: publicKey,
        role: role,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Tesla API] Add key error:', response.status, errorText);
      return res.status(response.status).json({ error: 'Failed to add key', details: errorText });
    }

    const data = await response.json();
    console.log('[Tesla] Virtual key added to vehicle:', vin);
    return res.status(200).json(data);

  } catch (error: any) {
    console.error('[Tesla Add Key] Error:', error.message);
    return res.status(500).json({ error: 'Failed to add virtual key' });
  }
}
