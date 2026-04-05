/**
 * Tesla Fleet API Registration Endpoint
 * 
 * POST /api/tesla/auth/register
 * Registers the Tesla account with Fleet API for the current region
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { refreshTeslaToken } from './refresh';

const TESLA_PARTNER_URL = 'https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/partner_accounts';

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
    console.log('[Tesla Register] Token expired, attempting refresh...');
    const newToken = await refreshTeslaToken(userId);
    return newToken;
  }

  return isExpired ? null : token.access_token;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = 'default'; // TODO: Get from session

  try {
    const accessToken = await getValidToken(userId);
    
    if (!accessToken) {
      return res.status(401).json({ 
        error: 'Not authenticated',
        message: 'Tesla account not connected or token expired',
      });
    }

    // Register with Tesla Fleet API
    const response = await fetch(TESLA_PARTNER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain: process.env.TESLA_DOMAIN || 'rtx-workstation.tailb64e64.ts.net',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Tesla Register] Registration failed:', response.status, errorText);
      
      // 409 means already registered, which is fine
      if (response.status === 409) {
        return res.status(200).json({
          success: true,
          message: 'Account already registered with Fleet API',
          alreadyRegistered: true,
        });
      }
      
      return res.status(response.status).json({ 
        error: 'Registration failed',
        details: errorText,
      });
    }

    const data = await response.json();
    console.log('[Tesla Register] Registration successful:', data);

    return res.status(200).json({
      success: true,
      message: 'Successfully registered with Tesla Fleet API',
      data,
    });

  } catch (error: any) {
    console.error('[Tesla Register] Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
